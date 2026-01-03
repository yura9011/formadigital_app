"""
Contact History Tracker
=======================
Tracks all contact attempts and responses.

Implements Requirements 7.1-7.6:
- Contact entries with full metadata
- Log outbound and inbound messages
- Calculate metrics per lead
- Status transitions with validation
"""

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, Literal

logger = logging.getLogger(__name__)


# =============================================================================
# Enums
# =============================================================================

class ContactDirection(str, Enum):
    """Direction of contact."""
    OUTBOUND = "outbound"
    INBOUND = "inbound"


class ContactStatus(str, Enum):
    """Status of a contact entry."""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    RESPONDED = "responded"
    FAILED = "failed"


class LeadStatus(str, Enum):
    """Status of a lead in the pipeline."""
    UNVALIDATED = "unvalidated"
    READY = "ready"
    CONTACTED = "contacted"
    RESPONDED = "responded"
    CONVERTED = "converted"
    NOT_INTERESTED = "not_interested"
    INVALID = "invalid"


# Valid status transitions
VALID_TRANSITIONS = {
    LeadStatus.UNVALIDATED: [LeadStatus.READY, LeadStatus.INVALID],
    LeadStatus.READY: [LeadStatus.CONTACTED, LeadStatus.INVALID],
    LeadStatus.CONTACTED: [LeadStatus.RESPONDED, LeadStatus.NOT_INTERESTED, LeadStatus.READY],
    LeadStatus.RESPONDED: [LeadStatus.CONVERTED, LeadStatus.NOT_INTERESTED, LeadStatus.CONTACTED],
    LeadStatus.CONVERTED: [],  # Terminal state
    LeadStatus.NOT_INTERESTED: [LeadStatus.READY],  # Can retry later
    LeadStatus.INVALID: [LeadStatus.READY],  # Can be fixed
}


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class ContactEntry:
    """
    A single contact attempt or response.
    
    Records all details of a communication.
    """
    id: str
    lead_id: str
    timestamp: datetime
    channel: Literal["whatsapp", "instagram", "email"]
    direction: ContactDirection
    message: str
    status: ContactStatus = ContactStatus.PENDING
    template_id: Optional[str] = None
    sequence_position: Optional[int] = None
    metadata: dict = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "lead_id": self.lead_id,
            "timestamp": self.timestamp.isoformat(),
            "channel": self.channel,
            "direction": self.direction.value,
            "message": self.message,
            "status": self.status.value,
            "template_id": self.template_id,
            "sequence_position": self.sequence_position,
            "metadata": self.metadata,
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "ContactEntry":
        return cls(
            id=data["id"],
            lead_id=data["lead_id"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            channel=data["channel"],
            direction=ContactDirection(data["direction"]),
            message=data["message"],
            status=ContactStatus(data.get("status", "pending")),
            template_id=data.get("template_id"),
            sequence_position=data.get("sequence_position"),
            metadata=data.get("metadata", {}),
        )


@dataclass
class LeadMetrics:
    """
    Calculated metrics for a lead.
    """
    lead_id: str
    total_touches: int = 0
    outbound_count: int = 0
    inbound_count: int = 0
    response_count: int = 0
    response_rate: float = 0.0
    first_contact_at: Optional[datetime] = None
    last_contact_at: Optional[datetime] = None
    last_response_at: Optional[datetime] = None
    days_in_pipeline: int = 0
    channels_used: list[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "lead_id": self.lead_id,
            "total_touches": self.total_touches,
            "outbound_count": self.outbound_count,
            "inbound_count": self.inbound_count,
            "response_count": self.response_count,
            "response_rate": self.response_rate,
            "first_contact_at": self.first_contact_at.isoformat() if self.first_contact_at else None,
            "last_contact_at": self.last_contact_at.isoformat() if self.last_contact_at else None,
            "last_response_at": self.last_response_at.isoformat() if self.last_response_at else None,
            "days_in_pipeline": self.days_in_pipeline,
            "channels_used": self.channels_used,
        }


@dataclass
class StatusTransition:
    """
    Record of a status transition.
    """
    lead_id: str
    from_status: LeadStatus
    to_status: LeadStatus
    timestamp: datetime
    reason: str = ""
    triggered_by: str = ""  # "system" or "user"
    
    def to_dict(self) -> dict:
        return {
            "lead_id": self.lead_id,
            "from_status": self.from_status.value,
            "to_status": self.to_status.value,
            "timestamp": self.timestamp.isoformat(),
            "reason": self.reason,
            "triggered_by": self.triggered_by,
        }


# =============================================================================
# Contact History Tracker
# =============================================================================

class ContactHistoryTracker:
    """
    Tracks all contact history for leads.
    
    Features:
    - Log outbound and inbound contacts
    - Calculate metrics per lead
    - Track status transitions
    - Query history by lead, channel, date
    """
    
    def __init__(self):
        self._entries: dict[str, ContactEntry] = {}  # entry_id -> entry
        self._by_lead: dict[str, list[str]] = {}  # lead_id -> [entry_ids]
        self._lead_statuses: dict[str, LeadStatus] = {}  # lead_id -> status
        self._transitions: list[StatusTransition] = []
    
    def log_outbound(
        self,
        lead_id: str,
        channel: str,
        message: str,
        template_id: Optional[str] = None,
        sequence_position: Optional[int] = None,
        status: ContactStatus = ContactStatus.PENDING,
        metadata: Optional[dict] = None
    ) -> ContactEntry:
        """
        Log an outbound contact attempt.
        
        Args:
            lead_id: Lead ID
            channel: Channel used
            message: Message content
            template_id: Template used
            sequence_position: Position in sequence
            status: Initial status
            metadata: Additional metadata
            
        Returns:
            Created ContactEntry
        """
        entry = ContactEntry(
            id=f"contact_{uuid.uuid4().hex[:12]}",
            lead_id=lead_id,
            timestamp=datetime.now(),
            channel=channel,
            direction=ContactDirection.OUTBOUND,
            message=message,
            status=status,
            template_id=template_id,
            sequence_position=sequence_position,
            metadata=metadata or {},
        )
        
        self._store_entry(entry)
        
        # Auto-transition to contacted if first outbound
        if lead_id not in self._lead_statuses:
            self._lead_statuses[lead_id] = LeadStatus.READY
        
        if self._lead_statuses[lead_id] == LeadStatus.READY:
            self.transition_status(lead_id, LeadStatus.CONTACTED, "First contact", "system")
        
        logger.info(f"Logged outbound contact {entry.id} for {lead_id}")
        
        return entry
    
    def log_inbound(
        self,
        lead_id: str,
        channel: str,
        message: str,
        metadata: Optional[dict] = None
    ) -> ContactEntry:
        """
        Log an inbound response.
        
        Args:
            lead_id: Lead ID
            channel: Channel used
            message: Message content
            metadata: Additional metadata
            
        Returns:
            Created ContactEntry
        """
        entry = ContactEntry(
            id=f"contact_{uuid.uuid4().hex[:12]}",
            lead_id=lead_id,
            timestamp=datetime.now(),
            channel=channel,
            direction=ContactDirection.INBOUND,
            message=message,
            status=ContactStatus.RESPONDED,
            metadata=metadata or {},
        )
        
        self._store_entry(entry)
        
        # Auto-transition to responded
        current = self._lead_statuses.get(lead_id, LeadStatus.READY)
        if current in [LeadStatus.CONTACTED, LeadStatus.READY]:
            self.transition_status(lead_id, LeadStatus.RESPONDED, "Lead responded", "system")
        
        logger.info(f"Logged inbound contact {entry.id} from {lead_id}")
        
        return entry
    
    def update_status(self, entry_id: str, status: ContactStatus) -> bool:
        """
        Update the status of a contact entry.
        
        Args:
            entry_id: Entry ID
            status: New status
            
        Returns:
            True if updated
        """
        entry = self._entries.get(entry_id)
        if not entry:
            return False
        
        entry.status = status
        logger.debug(f"Updated contact {entry_id} status to {status}")
        return True
    
    def get_lead_history(
        self,
        lead_id: str,
        direction: Optional[ContactDirection] = None,
        channel: Optional[str] = None
    ) -> list[ContactEntry]:
        """
        Get contact history for a lead.
        
        Args:
            lead_id: Lead ID
            direction: Filter by direction
            channel: Filter by channel
            
        Returns:
            List of ContactEntry sorted by timestamp
        """
        entry_ids = self._by_lead.get(lead_id, [])
        entries = [self._entries[eid] for eid in entry_ids if eid in self._entries]
        
        if direction:
            entries = [e for e in entries if e.direction == direction]
        
        if channel:
            entries = [e for e in entries if e.channel == channel]
        
        return sorted(entries, key=lambda e: e.timestamp)
    
    def calculate_metrics(self, lead_id: str) -> LeadMetrics:
        """
        Calculate metrics for a lead.
        
        Args:
            lead_id: Lead ID
            
        Returns:
            LeadMetrics
        """
        entries = self.get_lead_history(lead_id)
        
        if not entries:
            return LeadMetrics(lead_id=lead_id)
        
        outbound = [e for e in entries if e.direction == ContactDirection.OUTBOUND]
        inbound = [e for e in entries if e.direction == ContactDirection.INBOUND]
        
        channels = list(set(e.channel for e in entries))
        
        first_contact = entries[0].timestamp
        last_contact = entries[-1].timestamp
        last_response = inbound[-1].timestamp if inbound else None
        
        days_in_pipeline = (datetime.now() - first_contact).days
        
        response_rate = len(inbound) / len(outbound) if outbound else 0.0
        
        return LeadMetrics(
            lead_id=lead_id,
            total_touches=len(entries),
            outbound_count=len(outbound),
            inbound_count=len(inbound),
            response_count=len(inbound),
            response_rate=response_rate,
            first_contact_at=first_contact,
            last_contact_at=last_contact,
            last_response_at=last_response,
            days_in_pipeline=days_in_pipeline,
            channels_used=channels,
        )
    
    def get_lead_status(self, lead_id: str) -> LeadStatus:
        """Get current status of a lead."""
        return self._lead_statuses.get(lead_id, LeadStatus.UNVALIDATED)
    
    def set_lead_status(self, lead_id: str, status: LeadStatus) -> None:
        """Set lead status directly (for initialization)."""
        self._lead_statuses[lead_id] = status
    
    def transition_status(
        self,
        lead_id: str,
        to_status: LeadStatus,
        reason: str = "",
        triggered_by: str = "user"
    ) -> bool:
        """
        Transition a lead to a new status.
        
        Args:
            lead_id: Lead ID
            to_status: Target status
            reason: Reason for transition
            triggered_by: Who triggered ("system" or "user")
            
        Returns:
            True if transition was valid and applied
        """
        from_status = self._lead_statuses.get(lead_id, LeadStatus.UNVALIDATED)
        
        # Check if transition is valid
        if not self.is_valid_transition(from_status, to_status):
            logger.warning(f"Invalid transition for {lead_id}: {from_status} -> {to_status}")
            return False
        
        # Apply transition
        self._lead_statuses[lead_id] = to_status
        
        # Record transition
        transition = StatusTransition(
            lead_id=lead_id,
            from_status=from_status,
            to_status=to_status,
            timestamp=datetime.now(),
            reason=reason,
            triggered_by=triggered_by,
        )
        self._transitions.append(transition)
        
        logger.info(f"Transitioned {lead_id}: {from_status} -> {to_status}")
        
        return True
    
    def is_valid_transition(self, from_status: LeadStatus, to_status: LeadStatus) -> bool:
        """
        Check if a status transition is valid.
        
        Args:
            from_status: Current status
            to_status: Target status
            
        Returns:
            True if transition is valid
        """
        valid_targets = VALID_TRANSITIONS.get(from_status, [])
        return to_status in valid_targets
    
    def get_transitions(self, lead_id: str) -> list[StatusTransition]:
        """Get all status transitions for a lead."""
        return [t for t in self._transitions if t.lead_id == lead_id]
    
    def get_leads_by_status(self, status: LeadStatus) -> list[str]:
        """Get all lead IDs with a given status."""
        return [lid for lid, s in self._lead_statuses.items() if s == status]
    
    def get_recent_contacts(
        self,
        hours: int = 24,
        direction: Optional[ContactDirection] = None
    ) -> list[ContactEntry]:
        """
        Get recent contacts across all leads.
        
        Args:
            hours: How many hours back to look
            direction: Filter by direction
            
        Returns:
            List of ContactEntry
        """
        cutoff = datetime.now() - timedelta(hours=hours)
        
        entries = [e for e in self._entries.values() if e.timestamp >= cutoff]
        
        if direction:
            entries = [e for e in entries if e.direction == direction]
        
        return sorted(entries, key=lambda e: e.timestamp, reverse=True)
    
    def get_stats(self) -> dict:
        """Get overall statistics."""
        total_entries = len(self._entries)
        outbound = sum(1 for e in self._entries.values() if e.direction == ContactDirection.OUTBOUND)
        inbound = sum(1 for e in self._entries.values() if e.direction == ContactDirection.INBOUND)
        
        status_counts = {}
        for status in self._lead_statuses.values():
            status_counts[status.value] = status_counts.get(status.value, 0) + 1
        
        return {
            "total_contacts": total_entries,
            "outbound_count": outbound,
            "inbound_count": inbound,
            "response_rate": inbound / outbound if outbound > 0 else 0,
            "total_leads_tracked": len(self._lead_statuses),
            "leads_by_status": status_counts,
            "total_transitions": len(self._transitions),
        }
    
    # -------------------------------------------------------------------------
    # Private Methods
    # -------------------------------------------------------------------------
    
    def _store_entry(self, entry: ContactEntry) -> None:
        """Store a contact entry."""
        self._entries[entry.id] = entry
        
        if entry.lead_id not in self._by_lead:
            self._by_lead[entry.lead_id] = []
        self._by_lead[entry.lead_id].append(entry.id)


# =============================================================================
# Quick Test
# =============================================================================

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    print("Testing ContactHistoryTracker...")
    
    tracker = ContactHistoryTracker()
    
    # Log some contacts
    tracker.set_lead_status("lead_1", LeadStatus.READY)
    
    entry1 = tracker.log_outbound(
        lead_id="lead_1",
        channel="whatsapp",
        message="Hola! Te contacto de Forma Digital",
        template_id="wa_initial"
    )
    print(f"\nLogged outbound: {entry1.id}")
    print(f"Lead status: {tracker.get_lead_status('lead_1')}")
    
    # Log response
    entry2 = tracker.log_inbound(
        lead_id="lead_1",
        channel="whatsapp",
        message="Hola! Sí, me interesa"
    )
    print(f"\nLogged inbound: {entry2.id}")
    print(f"Lead status: {tracker.get_lead_status('lead_1')}")
    
    # Get metrics
    metrics = tracker.calculate_metrics("lead_1")
    print(f"\nMetrics for lead_1:")
    print(f"  Total touches: {metrics.total_touches}")
    print(f"  Response rate: {metrics.response_rate:.0%}")
    
    # Get transitions
    transitions = tracker.get_transitions("lead_1")
    print(f"\nTransitions: {len(transitions)}")
    for t in transitions:
        print(f"  {t.from_status.value} -> {t.to_status.value}: {t.reason}")
    
    # Overall stats
    print(f"\nOverall stats: {tracker.get_stats()}")
    
    print("\n✅ ContactHistoryTracker test complete")
