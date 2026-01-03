"""
Pipeline Integration
====================
Connects the validation pipeline with the outreach system.

Implements Requirements 10.1-10.3:
- Auto-add approved leads to outreach queue
- Sync validation_status with outreach_status
- Prevent duplicate sequences
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Callable, Literal
from pathlib import Path

from ..approval import ApprovalManager, Proposal
from .queue import OutreachQueueManager, QueueItem, QueueItemStatus
from .history import ContactHistoryTracker, LeadStatus
from .sequences import SequenceManager, LeadSequenceState

logger = logging.getLogger(__name__)


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class IntegrationConfig:
    """Configuration for pipeline integration."""
    auto_queue_on_approval: bool = True
    min_score_for_queue: int = 60
    default_channel_priority: list[str] = field(
        default_factory=lambda: ["whatsapp", "instagram", "email"]
    )
    prevent_duplicates: bool = True
    sync_statuses: bool = True


@dataclass
class LeadSyncResult:
    """Result of syncing a lead between systems."""
    lead_id: str
    success: bool
    action: Literal["added_to_queue", "already_in_queue", "skipped", "error"]
    message: str
    queue_item: Optional[QueueItem] = None


# =============================================================================
# Pipeline Integrator
# =============================================================================

class PipelineIntegrator:
    """
    Integrates the validation pipeline with the outreach system.
    
    Features:
    - Auto-add approved leads to queue
    - Sync statuses between systems
    - Prevent duplicate sequences
    - Track active sequences per lead
    """
    
    def __init__(
        self,
        approval_manager: ApprovalManager,
        queue_manager: OutreachQueueManager,
        history_tracker: ContactHistoryTracker,
        sequence_manager: Optional[SequenceManager] = None,
        config: Optional[IntegrationConfig] = None
    ):
        self.approval_manager = approval_manager
        self.queue_manager = queue_manager
        self.history_tracker = history_tracker
        self.sequence_manager = sequence_manager
        self.config = config or IntegrationConfig()
        
        # Track active sequences to prevent duplicates
        self._active_sequences: dict[str, str] = {}  # lead_id -> sequence_id
        
        # Callbacks for events
        self._on_lead_queued: list[Callable] = []
        self._on_status_change: list[Callable] = []
    
    def on_approval(self, proposal: Proposal) -> LeadSyncResult:
        """
        Handle a proposal approval event.
        
        Called when a proposal is approved in ApprovalManager.
        Auto-adds lead to queue if configured.
        
        Args:
            proposal: The approved proposal
            
        Returns:
            LeadSyncResult with action taken
        """
        lead_id = proposal.lead_id
        lead_name = proposal.lead_name
        
        # Check if auto-queue is enabled
        if not self.config.auto_queue_on_approval:
            return LeadSyncResult(
                lead_id=lead_id,
                success=True,
                action="skipped",
                message="Auto-queue disabled"
            )
        
        # Get contactability score from proposal
        score = proposal.proposed_values.get("contactability_score", 0)
        
        # Check minimum score
        if score < self.config.min_score_for_queue:
            return LeadSyncResult(
                lead_id=lead_id,
                success=True,
                action="skipped",
                message=f"Score {score} below minimum {self.config.min_score_for_queue}"
            )
        
        # Check for duplicates
        if self.config.prevent_duplicates:
            if self.has_active_sequence(lead_id):
                return LeadSyncResult(
                    lead_id=lead_id,
                    success=False,
                    action="already_in_queue",
                    message="Lead already has active sequence"
                )
        
        # Determine best channel
        channel = self._determine_channel(proposal.proposed_values)
        
        # Add to queue
        return self.add_to_queue(
            lead_id=lead_id,
            lead_name=lead_name,
            contactability_score=score,
            channel=channel,
            reason=f"Auto-added from approval: {proposal.reasoning}"
        )
    
    def add_to_queue(
        self,
        lead_id: str,
        lead_name: str,
        contactability_score: int,
        channel: str,
        reason: str = "",
        is_followup: bool = False,
        next_touch_due: Optional[datetime] = None,
        sequence_position: int = 0
    ) -> LeadSyncResult:
        """
        Add a lead to the outreach queue.
        
        Args:
            lead_id: Lead ID
            lead_name: Lead name
            contactability_score: Score from validation
            channel: Recommended channel
            reason: Reason for adding
            is_followup: Whether this is a follow-up
            next_touch_due: When follow-up is due
            sequence_position: Position in sequence
            
        Returns:
            LeadSyncResult
        """
        # Check for duplicates
        if self.config.prevent_duplicates and not is_followup:
            if self.has_active_sequence(lead_id):
                return LeadSyncResult(
                    lead_id=lead_id,
                    success=False,
                    action="already_in_queue",
                    message="Lead already has active sequence"
                )
        
        # Add to queue
        queue_item = self.queue_manager.add_lead(
            lead_id=lead_id,
            lead_name=lead_name,
            contactability_score=contactability_score,
            recommended_channel=channel,
            is_followup=is_followup,
            next_touch_due=next_touch_due,
            sequence_position=sequence_position,
            reason=reason
        )
        
        if not queue_item:
            return LeadSyncResult(
                lead_id=lead_id,
                success=False,
                action="error",
                message="Failed to add to queue (limit reached?)"
            )
        
        # Track active sequence
        if not is_followup:
            self._active_sequences[lead_id] = f"seq_{lead_id}"
        
        # Sync status
        if self.config.sync_statuses:
            self.history_tracker.set_lead_status(lead_id, LeadStatus.READY)
        
        # Notify callbacks
        for callback in self._on_lead_queued:
            try:
                callback(lead_id, queue_item)
            except Exception as e:
                logger.error(f"Callback error: {e}")
        
        logger.info(f"Added {lead_id} to outreach queue")
        
        return LeadSyncResult(
            lead_id=lead_id,
            success=True,
            action="added_to_queue",
            message=f"Added to queue with channel {channel}",
            queue_item=queue_item
        )
    
    def has_active_sequence(self, lead_id: str) -> bool:
        """
        Check if a lead has an active sequence.
        
        Args:
            lead_id: Lead ID
            
        Returns:
            True if lead has active sequence
        """
        # Check our tracking first (primary source of truth)
        if lead_id in self._active_sequences:
            return True
        
        # Check sequence manager if available
        if self.sequence_manager:
            state = self.sequence_manager.get_lead_state(lead_id)
            if state and not state.is_completed and not state.is_paused:
                return True
        
        return False
    
    def complete_sequence(self, lead_id: str, reason: str = "") -> bool:
        """
        Mark a lead's sequence as complete.
        
        Args:
            lead_id: Lead ID
            reason: Reason for completion
            
        Returns:
            True if marked complete
        """
        if lead_id in self._active_sequences:
            del self._active_sequences[lead_id]
            logger.info(f"Completed sequence for {lead_id}: {reason}")
            return True
        return False
    
    def sync_status(
        self,
        lead_id: str,
        validation_status: Optional[str] = None,
        outreach_status: Optional[LeadStatus] = None
    ) -> bool:
        """
        Sync status between validation and outreach systems.
        
        Args:
            lead_id: Lead ID
            validation_status: Status from validation system
            outreach_status: Status from outreach system
            
        Returns:
            True if synced successfully
        """
        if not self.config.sync_statuses:
            return False
        
        # Map validation status to outreach status
        status_map = {
            "unvalidated": LeadStatus.UNVALIDATED,
            "ready": LeadStatus.READY,
            "needs_review": LeadStatus.UNVALIDATED,
            "contacted": LeadStatus.CONTACTED,
            "responded": LeadStatus.RESPONDED,
            "not_interested": LeadStatus.NOT_INTERESTED,
            "converted": LeadStatus.CONVERTED,
        }
        
        if validation_status:
            mapped = status_map.get(validation_status)
            if mapped:
                current = self.history_tracker.get_lead_status(lead_id)
                if current != mapped:
                    self.history_tracker.transition_status(
                        lead_id, mapped, 
                        reason=f"Synced from validation: {validation_status}",
                        triggered_by="system"
                    )
                    return True
        
        return False
    
    def process_approved_proposals(self) -> list[LeadSyncResult]:
        """
        Process all approved proposals that haven't been queued.
        
        Returns:
            List of LeadSyncResult for each processed proposal
        """
        results = []
        
        # Get all approved proposals
        for proposal in self.approval_manager.proposals.values():
            if proposal.status != "approved":
                continue
            
            # Check if already processed
            if self.has_active_sequence(proposal.lead_id):
                continue
            
            # Check if score meets threshold
            score = proposal.approved_changes.get("contactability_score", 0) if proposal.approved_changes else 0
            if score < self.config.min_score_for_queue:
                continue
            
            # Process
            result = self.on_approval(proposal)
            results.append(result)
        
        return results
    
    def get_integration_stats(self) -> dict:
        """Get integration statistics."""
        return {
            "active_sequences": len(self._active_sequences),
            "queue_pending": self.queue_manager.get_pending_count(),
            "history_tracked": len(self.history_tracker._lead_statuses),
            "auto_queue_enabled": self.config.auto_queue_on_approval,
            "min_score": self.config.min_score_for_queue,
            "duplicate_prevention": self.config.prevent_duplicates,
        }
    
    def register_on_queued(self, callback: Callable) -> None:
        """Register callback for when lead is queued."""
        self._on_lead_queued.append(callback)
    
    def register_on_status_change(self, callback: Callable) -> None:
        """Register callback for status changes."""
        self._on_status_change.append(callback)
    
    # -------------------------------------------------------------------------
    # Private Methods
    # -------------------------------------------------------------------------
    
    def _determine_channel(self, proposed_values: dict) -> str:
        """
        Determine best channel from proposed values.
        
        Args:
            proposed_values: Values from proposal
            
        Returns:
            Best channel to use
        """
        # Check for WhatsApp link
        if proposed_values.get("whatsapp_link"):
            return "whatsapp"
        
        # Check for Instagram
        if proposed_values.get("instagram_handle"):
            return "instagram"
        
        # Check for email
        if proposed_values.get("email"):
            return "email"
        
        # Default to first in priority
        return self.config.default_channel_priority[0]


# =============================================================================
# Convenience Functions
# =============================================================================

def create_integrated_pipeline(
    storage_path: Optional[Path] = None,
    config: Optional[IntegrationConfig] = None
) -> tuple[ApprovalManager, OutreachQueueManager, ContactHistoryTracker, PipelineIntegrator]:
    """
    Create a fully integrated pipeline with all components.
    
    Args:
        storage_path: Path for approval storage
        config: Integration configuration
        
    Returns:
        Tuple of (ApprovalManager, OutreachQueueManager, ContactHistoryTracker, PipelineIntegrator)
    """
    approval_manager = ApprovalManager(storage_path=storage_path)
    queue_manager = OutreachQueueManager()
    history_tracker = ContactHistoryTracker()
    
    integrator = PipelineIntegrator(
        approval_manager=approval_manager,
        queue_manager=queue_manager,
        history_tracker=history_tracker,
        config=config
    )
    
    return approval_manager, queue_manager, history_tracker, integrator


# =============================================================================
# Quick Test
# =============================================================================

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    print("Testing PipelineIntegrator...")
    
    # Create integrated pipeline
    approval, queue, history, integrator = create_integrated_pipeline()
    
    # Create and approve a proposal
    proposal = approval.propose(
        lead_id="lead_123",
        lead_name="Barbería Juan",
        current_values={"contactability_score": 0},
        proposed_values={
            "contactability_score": 75,
            "whatsapp_link": "wa.me/5491155551234",
            "validation_status": "ready"
        },
        reasoning="Phone validated, WhatsApp available"
    )
    
    # Approve it
    approval.approve(proposal.id, approved_by="admin")
    
    # Process approval
    result = integrator.on_approval(proposal)
    print(f"\nApproval result: {result.action} - {result.message}")
    
    # Try to add duplicate
    result2 = integrator.add_to_queue(
        lead_id="lead_123",
        lead_name="Barbería Juan",
        contactability_score=75,
        channel="whatsapp"
    )
    print(f"Duplicate attempt: {result2.action} - {result2.message}")
    
    # Check stats
    print(f"\nIntegration stats: {integrator.get_integration_stats()}")
    print(f"Queue stats: {queue.get_stats()}")
    
    print("\n✅ PipelineIntegrator test complete")
