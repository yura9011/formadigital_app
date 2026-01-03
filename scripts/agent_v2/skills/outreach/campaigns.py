"""
Campaign Manager
================
Manages outreach campaigns with target criteria and automatic lead assignment.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Any
from enum import Enum
import json
import os
import uuid


class CampaignStatus(str, Enum):
    """Campaign status values."""
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    DRAFT = "draft"


@dataclass
class TargetCriteria:
    """Criteria for filtering leads into a campaign."""
    locations: Optional[list[str]] = None  # e.g., ["Castelar", "Morón"]
    business_types: Optional[list[str]] = None  # e.g., ["barberia", "peluqueria"]
    min_score: int = 0
    max_score: int = 100
    channels_required: list[str] = field(default_factory=lambda: ["whatsapp"])
    
    def matches(self, lead: dict) -> bool:
        """Check if a lead matches this criteria."""
        # Check location
        if self.locations:
            lead_location = lead.get("location", "").lower()
            if not any(loc.lower() in lead_location for loc in self.locations):
                return False
        
        # Check business type
        if self.business_types:
            lead_type = lead.get("business_type", "").lower()
            lead_category = lead.get("category", "").lower()
            combined = f"{lead_type} {lead_category}"
            if not any(bt.lower() in combined for bt in self.business_types):
                return False
        
        # Check score range
        lead_score = lead.get("contactability_score", 0)
        if lead_score < self.min_score or lead_score > self.max_score:
            return False
        
        # Check required channels
        for channel in self.channels_required:
            if channel == "whatsapp":
                if not lead.get("whatsapp_link") and not lead.get("phone"):
                    return False
            elif channel == "instagram":
                if not lead.get("instagram_handle"):
                    return False
            elif channel == "email":
                if not lead.get("email"):
                    return False
        
        return True
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "locations": self.locations,
            "business_types": self.business_types,
            "min_score": self.min_score,
            "max_score": self.max_score,
            "channels_required": self.channels_required,
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "TargetCriteria":
        """Create from dictionary."""
        return cls(
            locations=data.get("locations"),
            business_types=data.get("business_types"),
            min_score=data.get("min_score", 0),
            max_score=data.get("max_score", 100),
            channels_required=data.get("channels_required", ["whatsapp"]),
        )


@dataclass
class CampaignMetrics:
    """Metrics for a campaign."""
    leads_assigned: int = 0
    leads_contacted: int = 0
    leads_responded: int = 0
    leads_converted: int = 0
    messages_sent: int = 0
    response_rate: float = 0.0
    conversion_rate: float = 0.0
    
    def update_rates(self) -> None:
        """Recalculate rates."""
        if self.leads_contacted > 0:
            self.response_rate = self.leads_responded / self.leads_contacted
        if self.leads_responded > 0:
            self.conversion_rate = self.leads_converted / self.leads_responded
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "leads_assigned": self.leads_assigned,
            "leads_contacted": self.leads_contacted,
            "leads_responded": self.leads_responded,
            "leads_converted": self.leads_converted,
            "messages_sent": self.messages_sent,
            "response_rate": self.response_rate,
            "conversion_rate": self.conversion_rate,
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "CampaignMetrics":
        """Create from dictionary."""
        return cls(
            leads_assigned=data.get("leads_assigned", 0),
            leads_contacted=data.get("leads_contacted", 0),
            leads_responded=data.get("leads_responded", 0),
            leads_converted=data.get("leads_converted", 0),
            messages_sent=data.get("messages_sent", 0),
            response_rate=data.get("response_rate", 0.0),
            conversion_rate=data.get("conversion_rate", 0.0),
        )


@dataclass
class Campaign:
    """Campaign configuration."""
    id: str
    name: str
    description: str
    target_criteria: TargetCriteria
    sequence_id: str
    templates: dict[str, str]  # channel -> template_id
    status: CampaignStatus = CampaignStatus.DRAFT
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    metrics: CampaignMetrics = field(default_factory=CampaignMetrics)
    
    @property
    def active(self) -> bool:
        """Check if campaign is active."""
        return self.status == CampaignStatus.ACTIVE
    
    def to_dict(self) -> dict:
        """Convert to dictionary for storage."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "target_criteria": self.target_criteria.to_dict(),
            "sequence_id": self.sequence_id,
            "templates": self.templates,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "metrics": self.metrics.to_dict(),
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "Campaign":
        """Create from dictionary."""
        return cls(
            id=data["id"],
            name=data["name"],
            description=data.get("description", ""),
            target_criteria=TargetCriteria.from_dict(data.get("target_criteria", {})),
            sequence_id=data.get("sequence_id", "default_sequence"),
            templates=data.get("templates", {}),
            status=CampaignStatus(data.get("status", "draft")),
            created_at=datetime.fromisoformat(data["created_at"]) if "created_at" in data else datetime.now(),
            updated_at=datetime.fromisoformat(data["updated_at"]) if "updated_at" in data else datetime.now(),
            metrics=CampaignMetrics.from_dict(data.get("metrics", {})),
        )


@dataclass
class LeadCampaignAssignment:
    """Tracks a lead's assignment to a campaign."""
    lead_id: str
    campaign_id: str
    assigned_at: datetime = field(default_factory=datetime.now)
    status: str = "assigned"  # assigned, contacted, responded, converted, removed
    
    def to_dict(self) -> dict:
        return {
            "lead_id": self.lead_id,
            "campaign_id": self.campaign_id,
            "assigned_at": self.assigned_at.isoformat(),
            "status": self.status,
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "LeadCampaignAssignment":
        return cls(
            lead_id=data["lead_id"],
            campaign_id=data["campaign_id"],
            assigned_at=datetime.fromisoformat(data["assigned_at"]) if "assigned_at" in data else datetime.now(),
            status=data.get("status", "assigned"),
        )


class CampaignManager:
    """Manages campaigns and lead assignments."""
    
    DEFAULT_CAMPAIGN_ID = "general_prospecting"
    
    def __init__(self, data_dir: str = "data/campaigns"):
        """Initialize campaign manager.
        
        Args:
            data_dir: Directory for campaign data storage
        """
        self.data_dir = data_dir
        self._campaigns: dict[str, Campaign] = {}
        self._assignments: dict[str, LeadCampaignAssignment] = {}  # lead_id -> assignment
        self._ensure_data_dir()
        self._load_campaigns()
        self._ensure_default_campaign()
    
    def _ensure_data_dir(self) -> None:
        """Ensure data directory exists."""
        os.makedirs(self.data_dir, exist_ok=True)
    
    def _campaigns_file(self) -> str:
        """Get campaigns file path."""
        return os.path.join(self.data_dir, "campaigns.json")
    
    def _assignments_file(self) -> str:
        """Get assignments file path."""
        return os.path.join(self.data_dir, "assignments.json")
    
    def _load_campaigns(self) -> None:
        """Load campaigns from disk."""
        # Load campaigns
        campaigns_file = self._campaigns_file()
        if os.path.exists(campaigns_file):
            with open(campaigns_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for campaign_data in data.get("campaigns", []):
                    campaign = Campaign.from_dict(campaign_data)
                    self._campaigns[campaign.id] = campaign
        
        # Load assignments
        assignments_file = self._assignments_file()
        if os.path.exists(assignments_file):
            with open(assignments_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for assignment_data in data.get("assignments", []):
                    assignment = LeadCampaignAssignment.from_dict(assignment_data)
                    self._assignments[assignment.lead_id] = assignment
    
    def _save_campaigns(self) -> None:
        """Save campaigns to disk."""
        campaigns_file = self._campaigns_file()
        data = {
            "campaigns": [c.to_dict() for c in self._campaigns.values()],
            "updated_at": datetime.now().isoformat(),
        }
        with open(campaigns_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    def _save_assignments(self) -> None:
        """Save assignments to disk."""
        assignments_file = self._assignments_file()
        data = {
            "assignments": [a.to_dict() for a in self._assignments.values()],
            "updated_at": datetime.now().isoformat(),
        }
        with open(assignments_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    def _ensure_default_campaign(self) -> None:
        """Ensure default campaign exists."""
        if self.DEFAULT_CAMPAIGN_ID not in self._campaigns:
            default = Campaign(
                id=self.DEFAULT_CAMPAIGN_ID,
                name="General Prospecting",
                description="Campaña general para leads sin criterios específicos",
                target_criteria=TargetCriteria(
                    min_score=60,
                    channels_required=["whatsapp"],
                ),
                sequence_id="default_sequence",
                templates={
                    "whatsapp": "initial_whatsapp",
                    "instagram": "initial_instagram",
                    "email": "initial_email",
                },
                status=CampaignStatus.ACTIVE,
            )
            self._campaigns[default.id] = default
            self._save_campaigns()
    
    # Campaign CRUD operations
    
    def create_campaign(
        self,
        name: str,
        description: str = "",
        target_criteria: Optional[TargetCriteria] = None,
        sequence_id: str = "default_sequence",
        templates: Optional[dict[str, str]] = None,
    ) -> Campaign:
        """Create a new campaign.
        
        Args:
            name: Campaign name
            description: Campaign description
            target_criteria: Lead filtering criteria
            sequence_id: Sequence to use for this campaign
            templates: Channel -> template_id mapping
            
        Returns:
            Created campaign
        """
        campaign_id = f"campaign_{uuid.uuid4().hex[:8]}"
        
        campaign = Campaign(
            id=campaign_id,
            name=name,
            description=description,
            target_criteria=target_criteria or TargetCriteria(),
            sequence_id=sequence_id,
            templates=templates or {},
            status=CampaignStatus.DRAFT,
        )
        
        self._campaigns[campaign_id] = campaign
        self._save_campaigns()
        
        return campaign
    
    def get_campaign(self, campaign_id: str) -> Optional[Campaign]:
        """Get a campaign by ID."""
        return self._campaigns.get(campaign_id)
    
    def list_campaigns(
        self,
        active_only: bool = False,
        include_metrics: bool = True,
    ) -> list[Campaign]:
        """List all campaigns.
        
        Args:
            active_only: Only return active campaigns
            include_metrics: Include metrics in response
            
        Returns:
            List of campaigns
        """
        campaigns = list(self._campaigns.values())
        
        if active_only:
            campaigns = [c for c in campaigns if c.active]
        
        return sorted(campaigns, key=lambda c: c.created_at, reverse=True)
    
    def update_campaign(
        self,
        campaign_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        target_criteria: Optional[TargetCriteria] = None,
        sequence_id: Optional[str] = None,
        templates: Optional[dict[str, str]] = None,
        status: Optional[CampaignStatus] = None,
    ) -> Optional[Campaign]:
        """Update a campaign.
        
        Args:
            campaign_id: Campaign to update
            name: New name (optional)
            description: New description (optional)
            target_criteria: New criteria (optional)
            sequence_id: New sequence (optional)
            templates: New templates (optional)
            status: New status (optional)
            
        Returns:
            Updated campaign or None if not found
        """
        campaign = self._campaigns.get(campaign_id)
        if not campaign:
            return None
        
        if name is not None:
            campaign.name = name
        if description is not None:
            campaign.description = description
        if target_criteria is not None:
            campaign.target_criteria = target_criteria
        if sequence_id is not None:
            campaign.sequence_id = sequence_id
        if templates is not None:
            campaign.templates = templates
        if status is not None:
            campaign.status = status
        
        campaign.updated_at = datetime.now()
        self._save_campaigns()
        
        return campaign
    
    def activate_campaign(self, campaign_id: str) -> Optional[Campaign]:
        """Activate a campaign."""
        return self.update_campaign(campaign_id, status=CampaignStatus.ACTIVE)
    
    def pause_campaign(self, campaign_id: str) -> Optional[Campaign]:
        """Pause a campaign."""
        return self.update_campaign(campaign_id, status=CampaignStatus.PAUSED)
    
    def delete_campaign(self, campaign_id: str) -> bool:
        """Delete a campaign (cannot delete default)."""
        if campaign_id == self.DEFAULT_CAMPAIGN_ID:
            return False
        
        if campaign_id in self._campaigns:
            del self._campaigns[campaign_id]
            self._save_campaigns()
            return True
        
        return False

    
    # Lead filtering and assignment
    
    def filter_leads_by_criteria(
        self,
        leads: list[dict],
        criteria: TargetCriteria,
    ) -> list[dict]:
        """Filter leads by target criteria.
        
        Args:
            leads: List of lead dictionaries
            criteria: Filtering criteria
            
        Returns:
            Filtered list of leads
        """
        return [lead for lead in leads if criteria.matches(lead)]
    
    def find_matching_campaign(self, lead: dict) -> Optional[Campaign]:
        """Find the best matching active campaign for a lead.
        
        Checks active campaigns in order of specificity (most specific first).
        Falls back to default campaign if no specific match.
        
        Args:
            lead: Lead dictionary
            
        Returns:
            Matching campaign or None
        """
        # Get active campaigns (excluding default)
        active_campaigns = [
            c for c in self._campaigns.values()
            if c.active and c.id != self.DEFAULT_CAMPAIGN_ID
        ]
        
        # Sort by specificity (more criteria = more specific)
        def specificity(campaign: Campaign) -> int:
            criteria = campaign.target_criteria
            score = 0
            if criteria.locations:
                score += len(criteria.locations)
            if criteria.business_types:
                score += len(criteria.business_types)
            if criteria.min_score > 0:
                score += 1
            if criteria.max_score < 100:
                score += 1
            return score
        
        active_campaigns.sort(key=specificity, reverse=True)
        
        # Find first matching campaign
        for campaign in active_campaigns:
            if campaign.target_criteria.matches(lead):
                return campaign
        
        # Fall back to default campaign
        default = self._campaigns.get(self.DEFAULT_CAMPAIGN_ID)
        if default and default.active and default.target_criteria.matches(lead):
            return default
        
        return None
    
    def assign_lead_to_campaign(
        self,
        lead_id: str,
        lead: dict,
        campaign_id: Optional[str] = None,
    ) -> Optional[LeadCampaignAssignment]:
        """Assign a lead to a campaign.
        
        If campaign_id is not provided, automatically finds best match.
        
        Args:
            lead_id: Lead identifier
            lead: Lead dictionary
            campaign_id: Specific campaign (optional, auto-matches if None)
            
        Returns:
            Assignment or None if no matching campaign
        """
        # Check if already assigned
        if lead_id in self._assignments:
            existing = self._assignments[lead_id]
            # Return existing if same campaign
            if campaign_id and existing.campaign_id == campaign_id:
                return existing
            # Otherwise, remove old assignment
            self.remove_lead_from_campaign(lead_id)
        
        # Find campaign
        if campaign_id:
            campaign = self._campaigns.get(campaign_id)
        else:
            campaign = self.find_matching_campaign(lead)
        
        if not campaign:
            return None
        
        # Create assignment
        assignment = LeadCampaignAssignment(
            lead_id=lead_id,
            campaign_id=campaign.id,
        )
        
        self._assignments[lead_id] = assignment
        
        # Update campaign metrics
        campaign.metrics.leads_assigned += 1
        campaign.metrics.update_rates()
        
        self._save_assignments()
        self._save_campaigns()
        
        return assignment
    
    def get_lead_assignment(self, lead_id: str) -> Optional[LeadCampaignAssignment]:
        """Get a lead's campaign assignment."""
        return self._assignments.get(lead_id)
    
    def remove_lead_from_campaign(self, lead_id: str) -> bool:
        """Remove a lead from its campaign."""
        if lead_id in self._assignments:
            del self._assignments[lead_id]
            self._save_assignments()
            return True
        return False
    
    def get_campaign_leads(self, campaign_id: str) -> list[LeadCampaignAssignment]:
        """Get all leads assigned to a campaign."""
        return [
            a for a in self._assignments.values()
            if a.campaign_id == campaign_id
        ]
    
    # Metrics tracking
    
    def record_contact(self, lead_id: str) -> None:
        """Record that a lead was contacted."""
        assignment = self._assignments.get(lead_id)
        if assignment:
            assignment.status = "contacted"
            campaign = self._campaigns.get(assignment.campaign_id)
            if campaign:
                campaign.metrics.leads_contacted += 1
                campaign.metrics.messages_sent += 1
                campaign.metrics.update_rates()
                self._save_campaigns()
            self._save_assignments()
    
    def record_response(self, lead_id: str) -> None:
        """Record that a lead responded."""
        assignment = self._assignments.get(lead_id)
        if assignment:
            assignment.status = "responded"
            campaign = self._campaigns.get(assignment.campaign_id)
            if campaign:
                campaign.metrics.leads_responded += 1
                campaign.metrics.update_rates()
                self._save_campaigns()
            self._save_assignments()
    
    def record_conversion(self, lead_id: str) -> None:
        """Record that a lead converted."""
        assignment = self._assignments.get(lead_id)
        if assignment:
            assignment.status = "converted"
            campaign = self._campaigns.get(assignment.campaign_id)
            if campaign:
                campaign.metrics.leads_converted += 1
                campaign.metrics.update_rates()
                self._save_campaigns()
            self._save_assignments()
    
    def get_campaign_metrics(self, campaign_id: str) -> Optional[CampaignMetrics]:
        """Get metrics for a specific campaign."""
        campaign = self._campaigns.get(campaign_id)
        if campaign:
            return campaign.metrics
        return None
    
    def get_all_metrics(self) -> dict[str, CampaignMetrics]:
        """Get metrics for all campaigns."""
        return {
            campaign_id: campaign.metrics
            for campaign_id, campaign in self._campaigns.items()
        }
