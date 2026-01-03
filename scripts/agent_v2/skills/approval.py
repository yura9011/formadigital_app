"""
ApprovalManager - Human Approval System
=======================================
Manages proposals for lead changes that require human approval.
Implements Requirements 8.1-8.5.
"""

import json
import logging
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional, Literal, Any

logger = logging.getLogger(__name__)


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class Proposal:
    """Proposal for changes to a lead, pending human approval."""
    id: str
    lead_id: str
    lead_name: str
    current_values: dict
    proposed_values: dict
    reasoning: str
    created_at: datetime = field(default_factory=datetime.now)
    status: Literal["pending", "approved", "rejected", "partial"] = "pending"
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    approved_changes: Optional[dict] = None  # For partial approvals
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "lead_id": self.lead_id,
            "lead_name": self.lead_name,
            "current_values": self.current_values,
            "proposed_values": self.proposed_values,
            "reasoning": self.reasoning,
            "created_at": self.created_at.isoformat(),
            "status": self.status,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "rejection_reason": self.rejection_reason,
            "approved_changes": self.approved_changes,
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "Proposal":
        """Create Proposal from dictionary."""
        # Handle datetime fields
        if data.get("created_at") and isinstance(data["created_at"], str):
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        if data.get("approved_at") and isinstance(data["approved_at"], str):
            data["approved_at"] = datetime.fromisoformat(data["approved_at"])
        return cls(**data)
    
    def format_for_display(self) -> str:
        """Format proposal for human-readable display."""
        lines = [
            f"═══════════════════════════════════════════════════════",
            f"📋 PROPOSAL: {self.id}",
            f"═══════════════════════════════════════════════════════",
            f"Lead: {self.lead_name} ({self.lead_id})",
            f"Status: {self.status.upper()}",
            f"Created: {self.created_at.strftime('%Y-%m-%d %H:%M')}",
            f"",
            f"📝 REASONING:",
            f"   {self.reasoning}",
            f"",
            f"📊 PROPOSED CHANGES:",
        ]
        
        for field_name, new_value in self.proposed_values.items():
            old_value = self.current_values.get(field_name, "N/A")
            lines.append(f"   • {field_name}:")
            lines.append(f"     Current: {old_value}")
            lines.append(f"     Proposed: {new_value}")
        
        lines.append(f"═══════════════════════════════════════════════════════")
        return "\n".join(lines)


# =============================================================================
# ApprovalManager
# =============================================================================

class ApprovalManager:
    """
    Manages the approval queue for lead changes.
    
    In experimental phase, all changes proposed by the agent
    must be approved by a human before being persisted.
    
    Storage: JSON file (can be upgraded to SQLite/DB later)
    """
    
    def __init__(self, storage_path: Optional[Path] = None):
        """
        Args:
            storage_path: Path to JSON file for storing proposals
        """
        self.storage_path = storage_path or Path(__file__).parent.parent / "proposals.json"
        self.proposals: dict[str, Proposal] = {}
        self._load()
    
    def propose(
        self, 
        lead_id: str, 
        lead_name: str,
        current_values: dict, 
        proposed_values: dict, 
        reasoning: str
    ) -> Proposal:
        """
        Create a proposal for human review.
        
        Args:
            lead_id: ID of the lead being modified
            lead_name: Name of the lead (for display)
            current_values: Current field values
            proposed_values: Proposed new values
            reasoning: Explanation of why changes are proposed
            
        Returns:
            Created Proposal object
        """
        proposal_id = f"prop_{uuid.uuid4().hex[:8]}"
        
        proposal = Proposal(
            id=proposal_id,
            lead_id=lead_id,
            lead_name=lead_name,
            current_values=current_values,
            proposed_values=proposed_values,
            reasoning=reasoning,
        )
        
        self.proposals[proposal_id] = proposal
        self._save()
        
        logger.info(f"📋 Created proposal {proposal_id} for lead {lead_name}")
        return proposal
    
    def approve(
        self, 
        proposal_id: str, 
        approved_by: str,
        approved_changes: Optional[dict] = None
    ) -> Optional[dict]:
        """
        Approve a proposal and return the changes to apply.
        
        Args:
            proposal_id: ID of the proposal to approve
            approved_by: Username/ID of the approver
            approved_changes: Optional subset of changes to approve (for partial)
            
        Returns:
            Dictionary of approved changes to apply, or None if not found
        """
        proposal = self.proposals.get(proposal_id)
        if not proposal:
            logger.warning(f"Proposal {proposal_id} not found")
            return None
        
        if proposal.status != "pending":
            logger.warning(f"Proposal {proposal_id} is not pending (status: {proposal.status})")
            return None
        
        # Determine what changes to apply
        if approved_changes:
            # Partial approval
            proposal.status = "partial"
            proposal.approved_changes = approved_changes
            changes_to_apply = approved_changes
        else:
            # Full approval
            proposal.status = "approved"
            proposal.approved_changes = proposal.proposed_values
            changes_to_apply = proposal.proposed_values
        
        proposal.approved_by = approved_by
        proposal.approved_at = datetime.now()
        
        self._save()
        
        logger.info(f"✅ Approved proposal {proposal_id} by {approved_by}")
        return changes_to_apply
    
    def reject(
        self, 
        proposal_id: str, 
        rejected_by: str,
        reason: str
    ) -> bool:
        """
        Reject a proposal.
        
        Args:
            proposal_id: ID of the proposal to reject
            rejected_by: Username/ID of the rejector
            reason: Reason for rejection
            
        Returns:
            True if rejected, False if not found
        """
        proposal = self.proposals.get(proposal_id)
        if not proposal:
            logger.warning(f"Proposal {proposal_id} not found")
            return False
        
        if proposal.status != "pending":
            logger.warning(f"Proposal {proposal_id} is not pending (status: {proposal.status})")
            return False
        
        proposal.status = "rejected"
        proposal.approved_by = rejected_by  # Reusing field for rejector
        proposal.approved_at = datetime.now()
        proposal.rejection_reason = reason
        
        self._save()
        
        logger.info(f"❌ Rejected proposal {proposal_id} by {rejected_by}: {reason}")
        return True
    
    def get_pending(self) -> list[Proposal]:
        """Get all pending proposals."""
        return [p for p in self.proposals.values() if p.status == "pending"]
    
    def get_proposal(self, proposal_id: str) -> Optional[Proposal]:
        """Get a specific proposal by ID."""
        return self.proposals.get(proposal_id)
    
    def get_proposals_for_lead(self, lead_id: str) -> list[Proposal]:
        """Get all proposals for a specific lead."""
        return [p for p in self.proposals.values() if p.lead_id == lead_id]
    
    def _load(self):
        """Load proposals from storage."""
        if self.storage_path.exists():
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.proposals = {
                        k: Proposal.from_dict(v) 
                        for k, v in data.items()
                    }
                logger.info(f"Loaded {len(self.proposals)} proposals from {self.storage_path}")
            except Exception as e:
                logger.error(f"Failed to load proposals: {e}")
                self.proposals = {}
        else:
            self.proposals = {}
    
    def _save(self):
        """Save proposals to storage."""
        try:
            self.storage_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.storage_path, "w", encoding="utf-8") as f:
                data = {k: v.to_dict() for k, v in self.proposals.items()}
                json.dump(data, f, ensure_ascii=False, indent=2)
            logger.debug(f"Saved {len(self.proposals)} proposals to {self.storage_path}")
        except Exception as e:
            logger.error(f"Failed to save proposals: {e}")


# Quick test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Use temp file for testing
    import tempfile
    temp_path = Path(tempfile.mktemp(suffix=".json"))
    
    manager = ApprovalManager(storage_path=temp_path)
    
    # Test propose
    proposal = manager.propose(
        lead_id="lead_123",
        lead_name="Barbería Juan",
        current_values={"phone_status": "missing", "contactability_score": 0},
        proposed_values={"phone_status": "valid_mobile", "contactability_score": 55},
        reasoning="Phone validated as mobile, WhatsApp link generated"
    )
    print(f"Created proposal: {proposal.id}")
    print(proposal.format_for_display())
    
    # Test approve
    changes = manager.approve(proposal.id, approved_by="admin")
    print(f"\nApproved changes: {changes}")
    
    # Test reject (create new proposal first)
    proposal2 = manager.propose(
        lead_id="lead_456",
        lead_name="Kiosco Test",
        current_values={},
        proposed_values={"instagram_handle": "kiosco_test"},
        reasoning="Found Instagram via Google search"
    )
    manager.reject(proposal2.id, rejected_by="admin", reason="Wrong Instagram profile")
    print(f"\nRejected proposal: {proposal2.id}")
    
    # Cleanup
    temp_path.unlink(missing_ok=True)
    
    print("\n✅ ApprovalManager test complete")
