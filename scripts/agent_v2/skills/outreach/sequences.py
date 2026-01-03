"""
Sequence Manager
================
Manages follow-up sequences for outreach campaigns.

Implements Requirements 2.1-2.6:
- Sequences with up to 10 follow-up attempts
- Configurable cadence between attempts
- Channel rotation (WhatsApp → Instagram → Email)
- Pause/resume on response
"""

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Literal

logger = logging.getLogger(__name__)


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class SequenceStep:
    """
    A single step in a sequence.
    
    Defines which template to use, on which channel, and how long to wait.
    """
    position: int
    channel: Literal["whatsapp", "instagram", "email"]
    template_id: str
    delay_hours: int  # Hours to wait before this step (from previous step)
    description: str = ""
    
    def to_dict(self) -> dict:
        return {
            "position": self.position,
            "channel": self.channel,
            "template_id": self.template_id,
            "delay_hours": self.delay_hours,
            "description": self.description,
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "SequenceStep":
        return cls(
            position=data["position"],
            channel=data["channel"],
            template_id=data["template_id"],
            delay_hours=data["delay_hours"],
            description=data.get("description", ""),
        )


@dataclass
class Sequence:
    """
    A sequence of outreach steps.
    
    Defines the full follow-up cadence for a campaign.
    """
    id: str
    name: str
    steps: list[SequenceStep] = field(default_factory=list)
    max_attempts: int = 10
    active: bool = True
    description: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def get_step(self, position: int) -> Optional[SequenceStep]:
        """Get step by position (1-indexed)."""
        for step in self.steps:
            if step.position == position:
                return step
        return None
    
    def get_next_step(self, current_position: int) -> Optional[SequenceStep]:
        """Get the next step after current position."""
        return self.get_step(current_position + 1)
    
    def is_complete(self, position: int) -> bool:
        """Check if sequence is complete at given position."""
        # Position is complete when we've gone past all steps or max_attempts
        return position > len(self.steps) or position > self.max_attempts
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "steps": [s.to_dict() for s in self.steps],
            "max_attempts": self.max_attempts,
            "active": self.active,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "Sequence":
        steps = [SequenceStep.from_dict(s) for s in data.get("steps", [])]
        
        created_at = data.get("created_at")
        updated_at = data.get("updated_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
        
        return cls(
            id=data["id"],
            name=data["name"],
            steps=steps,
            max_attempts=data.get("max_attempts", 10),
            active=data.get("active", True),
            description=data.get("description", ""),
            created_at=created_at or datetime.now(),
            updated_at=updated_at or datetime.now(),
        )


@dataclass
class LeadSequenceState:
    """
    State of a lead in a sequence.
    
    Tracks progress through the sequence.
    """
    lead_id: str
    sequence_id: str
    current_position: int = 0  # 0 = not started, 1 = first step done
    started_at: datetime = field(default_factory=datetime.now)
    last_touch_at: Optional[datetime] = None
    next_touch_at: Optional[datetime] = None
    status: Literal["active", "paused", "completed", "exhausted", "responded"] = "active"
    pause_reason: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "lead_id": self.lead_id,
            "sequence_id": self.sequence_id,
            "current_position": self.current_position,
            "started_at": self.started_at.isoformat(),
            "last_touch_at": self.last_touch_at.isoformat() if self.last_touch_at else None,
            "next_touch_at": self.next_touch_at.isoformat() if self.next_touch_at else None,
            "status": self.status,
            "pause_reason": self.pause_reason,
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "LeadSequenceState":
        started_at = data.get("started_at")
        last_touch_at = data.get("last_touch_at")
        next_touch_at = data.get("next_touch_at")
        
        if isinstance(started_at, str):
            started_at = datetime.fromisoformat(started_at)
        if isinstance(last_touch_at, str):
            last_touch_at = datetime.fromisoformat(last_touch_at)
        if isinstance(next_touch_at, str):
            next_touch_at = datetime.fromisoformat(next_touch_at)
        
        return cls(
            lead_id=data["lead_id"],
            sequence_id=data["sequence_id"],
            current_position=data.get("current_position", 0),
            started_at=started_at or datetime.now(),
            last_touch_at=last_touch_at,
            next_touch_at=next_touch_at,
            status=data.get("status", "active"),
            pause_reason=data.get("pause_reason"),
        )


# =============================================================================
# Sequence Manager
# =============================================================================

class SequenceManager:
    """
    Manages sequences and lead progress through them.
    
    Features:
    - Load sequences from JSON files
    - Track lead progress through sequences
    - Calculate next touch times
    - Handle pause/resume
    """
    
    # Channel rotation order
    CHANNEL_ORDER = ["whatsapp", "instagram", "email"]
    
    def __init__(self, sequences_dir: Optional[Path] = None):
        """
        Initialize SequenceManager.
        
        Args:
            sequences_dir: Directory containing sequence JSON files
        """
        if sequences_dir is None:
            sequences_dir = Path(__file__).parent.parent.parent / "data" / "sequences"
        
        self.sequences_dir = Path(sequences_dir)
        self.sequences: dict[str, Sequence] = {}
        self.lead_states: dict[str, LeadSequenceState] = {}
        
        # Load sequences from files
        self._load_sequences()
    
    def _load_sequences(self):
        """Load all sequences from JSON files."""
        if not self.sequences_dir.exists():
            logger.warning(f"Sequences directory not found: {self.sequences_dir}")
            return
        
        for json_file in self.sequences_dir.glob("*.json"):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                sequence = Sequence.from_dict(data)
                self.sequences[sequence.id] = sequence
                logger.debug(f"Loaded sequence: {sequence.id}")
                
            except Exception as e:
                logger.error(f"Error loading sequence from {json_file}: {e}")
        
        logger.info(f"Loaded {len(self.sequences)} sequences")
    
    def create_sequence(self, sequence: Sequence) -> Sequence:
        """
        Create a new sequence.
        
        Args:
            sequence: Sequence to create
            
        Returns:
            Created sequence
        """
        sequence.created_at = datetime.now()
        sequence.updated_at = datetime.now()
        self.sequences[sequence.id] = sequence
        logger.info(f"Created sequence: {sequence.id}")
        return sequence
    
    def get_sequence(self, sequence_id: str) -> Optional[Sequence]:
        """Get a sequence by ID."""
        return self.sequences.get(sequence_id)
    
    def list_sequences(self, active_only: bool = False) -> list[Sequence]:
        """List all sequences."""
        sequences = list(self.sequences.values())
        if active_only:
            sequences = [s for s in sequences if s.active]
        return sequences
    
    def start_sequence(self, lead_id: str, sequence_id: str) -> LeadSequenceState:
        """
        Start a lead on a sequence.
        
        Args:
            lead_id: Lead ID
            sequence_id: Sequence ID to start
            
        Returns:
            LeadSequenceState for tracking progress
        """
        sequence = self.get_sequence(sequence_id)
        if not sequence:
            raise ValueError(f"Sequence not found: {sequence_id}")
        
        # Check if lead already in a sequence
        if lead_id in self.lead_states:
            existing = self.lead_states[lead_id]
            if existing.status == "active":
                raise ValueError(f"Lead {lead_id} already in active sequence: {existing.sequence_id}")
        
        # Calculate first touch time
        first_step = sequence.get_step(1)
        next_touch = datetime.now()
        if first_step and first_step.delay_hours > 0:
            next_touch = datetime.now() + timedelta(hours=first_step.delay_hours)
        
        state = LeadSequenceState(
            lead_id=lead_id,
            sequence_id=sequence_id,
            current_position=0,
            started_at=datetime.now(),
            next_touch_at=next_touch,
            status="active"
        )
        
        self.lead_states[lead_id] = state
        logger.info(f"Started sequence {sequence_id} for lead {lead_id}")
        
        return state
    
    def get_lead_state(self, lead_id: str) -> Optional[LeadSequenceState]:
        """Get the sequence state for a lead."""
        return self.lead_states.get(lead_id)
    
    def advance(self, lead_id: str) -> Optional[SequenceStep]:
        """
        Advance a lead to the next step in their sequence.
        
        Args:
            lead_id: Lead ID
            
        Returns:
            The next SequenceStep to execute, or None if sequence complete
        """
        state = self.lead_states.get(lead_id)
        if not state:
            logger.warning(f"No sequence state for lead: {lead_id}")
            return None
        
        if state.status != "active":
            logger.warning(f"Lead {lead_id} sequence is not active: {state.status}")
            return None
        
        sequence = self.get_sequence(state.sequence_id)
        if not sequence:
            logger.error(f"Sequence not found: {state.sequence_id}")
            return None
        
        # Calculate next position
        new_position = state.current_position + 1
        
        # Check if sequence would be complete at new position
        if sequence.is_complete(new_position):
            state.status = "exhausted"
            # Don't increment position beyond max_attempts
            state.current_position = min(new_position, sequence.max_attempts)
            logger.info(f"Sequence exhausted for lead {lead_id}")
            return None
        
        # Get next step
        next_step = sequence.get_step(new_position)
        if not next_step:
            state.status = "completed"
            logger.info(f"Sequence completed for lead {lead_id}")
            return None
        
        # Update state
        state.current_position = new_position
        state.last_touch_at = datetime.now()
        
        # Calculate next touch time
        following_step = sequence.get_next_step(new_position)
        if following_step:
            state.next_touch_at = datetime.now() + timedelta(hours=following_step.delay_hours)
        else:
            state.next_touch_at = None
        
        logger.info(f"Advanced lead {lead_id} to position {new_position}")
        
        return next_step
    
    def pause(self, lead_id: str, reason: str = "manual") -> None:
        """
        Pause a lead's sequence.
        
        Args:
            lead_id: Lead ID
            reason: Reason for pausing
        """
        state = self.lead_states.get(lead_id)
        if not state:
            logger.warning(f"No sequence state for lead: {lead_id}")
            return
        
        state.status = "paused"
        state.pause_reason = reason
        logger.info(f"Paused sequence for lead {lead_id}: {reason}")
    
    def resume(self, lead_id: str) -> None:
        """
        Resume a paused sequence.
        
        Args:
            lead_id: Lead ID
        """
        state = self.lead_states.get(lead_id)
        if not state:
            logger.warning(f"No sequence state for lead: {lead_id}")
            return
        
        if state.status != "paused":
            logger.warning(f"Lead {lead_id} sequence is not paused: {state.status}")
            return
        
        state.status = "active"
        state.pause_reason = None
        
        # Recalculate next touch time
        sequence = self.get_sequence(state.sequence_id)
        if sequence:
            next_step = sequence.get_next_step(state.current_position)
            if next_step:
                state.next_touch_at = datetime.now() + timedelta(hours=next_step.delay_hours)
        
        logger.info(f"Resumed sequence for lead {lead_id}")
    
    def mark_responded(self, lead_id: str) -> None:
        """
        Mark a lead as having responded (pauses sequence).
        
        Args:
            lead_id: Lead ID
        """
        state = self.lead_states.get(lead_id)
        if not state:
            logger.warning(f"No sequence state for lead: {lead_id}")
            return
        
        state.status = "responded"
        state.pause_reason = "Lead responded"
        logger.info(f"Marked lead {lead_id} as responded")
    
    def get_due_followups(self, as_of: Optional[datetime] = None) -> list[LeadSequenceState]:
        """
        Get all leads with follow-ups due.
        
        Args:
            as_of: Time to check against (default: now)
            
        Returns:
            List of LeadSequenceState with due follow-ups
        """
        if as_of is None:
            as_of = datetime.now()
        
        due = []
        for state in self.lead_states.values():
            if state.status != "active":
                continue
            if state.next_touch_at and state.next_touch_at <= as_of:
                due.append(state)
        
        # Sort by next_touch_at (oldest first)
        due.sort(key=lambda s: s.next_touch_at or datetime.max)
        
        return due
    
    def get_next_channel(self, current_channel: str) -> str:
        """
        Get the next channel in rotation.
        
        Args:
            current_channel: Current channel
            
        Returns:
            Next channel in rotation
        """
        try:
            idx = self.CHANNEL_ORDER.index(current_channel)
            next_idx = (idx + 1) % len(self.CHANNEL_ORDER)
            return self.CHANNEL_ORDER[next_idx]
        except ValueError:
            return self.CHANNEL_ORDER[0]


# =============================================================================
# Quick Test
# =============================================================================

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    print("Testing SequenceManager...")
    
    manager = SequenceManager()
    
    # List sequences
    print(f"\nLoaded {len(manager.sequences)} sequences:")
    for seq in manager.list_sequences():
        print(f"  - {seq.id}: {seq.name} ({len(seq.steps)} steps)")
    
    # Test starting a sequence
    if manager.sequences:
        seq_id = list(manager.sequences.keys())[0]
        state = manager.start_sequence("test-lead-123", seq_id)
        print(f"\nStarted sequence for test lead:")
        print(f"  Position: {state.current_position}")
        print(f"  Next touch: {state.next_touch_at}")
        
        # Advance
        step = manager.advance("test-lead-123")
        if step:
            print(f"\nAdvanced to step {step.position}:")
            print(f"  Channel: {step.channel}")
            print(f"  Template: {step.template_id}")
        
        # Check state
        state = manager.get_lead_state("test-lead-123")
        print(f"\nCurrent state:")
        print(f"  Position: {state.current_position}")
        print(f"  Status: {state.status}")
    
    # Test channel rotation
    print(f"\nChannel rotation:")
    print(f"  After whatsapp: {manager.get_next_channel('whatsapp')}")
    print(f"  After instagram: {manager.get_next_channel('instagram')}")
    print(f"  After email: {manager.get_next_channel('email')}")
    
    print("\n✅ SequenceManager test complete")
