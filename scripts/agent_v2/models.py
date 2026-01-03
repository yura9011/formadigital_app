"""
Agent V2 Data Models
====================
Data models for leads, validation, and contact tracking.
"""

from dataclasses import dataclass, field
from typing import Optional, Literal, Any
from datetime import datetime


# =============================================================================
# Contact Attempt Tracking
# =============================================================================

@dataclass
class ContactAttempt:
    """Record of a contact attempt with a lead."""
    date: datetime
    channel: Literal["whatsapp", "instagram", "email", "phone"]
    result: Literal["sent", "no_response", "responded", "rejected"]
    notes: Optional[str] = None


@dataclass
class StatusChange:
    """Record of a status change for a lead."""
    status: str
    changed_at: datetime
    changed_by: Literal["agent", "human"]
    reason: str


# =============================================================================
# Data Source Tracking (imported from merger for convenience)
# =============================================================================

@dataclass
class DataSource:
    """Tracks the source of a specific field value."""
    field: str
    source: Literal["harv3st", "serpapi", "website_scrape", "google_search"]
    value: Any
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class DataConflict:
    """Records a conflict between data sources."""
    field: str
    values: list[tuple[str, Any]]  # [(source, value), ...]
    resolved_value: Optional[Any] = None
    resolution_reason: Optional[str] = None


# =============================================================================
# Lead Model (Extended)
# =============================================================================

@dataclass
class Lead:
    """
    Extended Lead model with validation fields.
    
    Combines original GMB/Harv3st data with validation results.
    """
    
    # ==========================================================================
    # Core Identity (from Harv3st/GMB)
    # ==========================================================================
    id: str
    place_id: Optional[str] = None
    name: str = ""
    address: str = ""
    
    # ==========================================================================
    # Contact Info (original)
    # ==========================================================================
    phone: Optional[str] = None
    website: Optional[str] = None
    
    # ==========================================================================
    # Business Metrics
    # ==========================================================================
    rating: Optional[float] = None
    review_count: Optional[int] = None
    category: Optional[str] = None
    photo_count: Optional[int] = None
    
    # ==========================================================================
    # Location
    # ==========================================================================
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_maps_uri: Optional[str] = None
    
    # ==========================================================================
    # Existing Scores
    # ==========================================================================
    opportunity_score: int = 0  # From Harv3st scoring
    tier: Optional[Literal["HOT", "WARM", "COLD"]] = None
    
    # ==========================================================================
    # Phone Validation (NEW)
    # ==========================================================================
    phone_status: Literal["valid_mobile", "valid_landline", "invalid", "missing"] = "missing"
    phone_type: Literal["mobile", "landline", "unknown"] = "unknown"
    normalized_phone: Optional[str] = None
    whatsapp_link: Optional[str] = None
    
    # ==========================================================================
    # Instagram Validation (NEW)
    # ==========================================================================
    instagram_status: Literal["found", "not_found", "unverified"] = "not_found"
    instagram_handle: Optional[str] = None
    instagram_url: Optional[str] = None
    instagram_source: Optional[Literal["website", "knowledge_graph", "google_search"]] = None
    instagram_confidence: Optional[Literal["high", "medium", "low"]] = None
    
    # ==========================================================================
    # Email Validation (NEW)
    # ==========================================================================
    email_status: Literal["found", "not_found"] = "not_found"
    email: Optional[str] = None
    email_source: Optional[str] = None
    
    # ==========================================================================
    # Contactability (NEW)
    # ==========================================================================
    contactability_score: int = 0  # 0-100
    best_channel: Literal["whatsapp", "instagram", "email", "none"] = "none"
    validation_status: Literal[
        "unvalidated", "ready", "needs_review", 
        "contacted", "responded", "not_interested", "converted"
    ] = "unvalidated"
    validation_notes: Optional[str] = None
    validated_at: Optional[datetime] = None
    validation_attempts: int = 0
    
    # ==========================================================================
    # Source Tracking (NEW)
    # ==========================================================================
    data_sources: list[DataSource] = field(default_factory=list)
    conflicts: list[DataConflict] = field(default_factory=list)
    
    # ==========================================================================
    # Contact History (NEW)
    # ==========================================================================
    contact_attempts: list[ContactAttempt] = field(default_factory=list)
    status_history: list[StatusChange] = field(default_factory=list)
    
    # ==========================================================================
    # Outreach System (NEW)
    # ==========================================================================
    outreach_status: Literal[
        "not_started", "queued", "in_sequence", "paused",
        "responded", "converted", "exhausted", "not_interested"
    ] = "not_started"
    campaign_id: Optional[str] = None
    sequence_id: Optional[str] = None
    sequence_position: int = 0
    total_touches: int = 0
    last_touch_at: Optional[datetime] = None
    next_touch_at: Optional[datetime] = None
    first_response_at: Optional[datetime] = None
    converted_at: Optional[datetime] = None
    
    # ==========================================================================
    # Metadata
    # ==========================================================================
    source: str = "unknown"  # harv3st, serpapi, etc.
    enriched_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def has_valid_contact_channel(self) -> bool:
        """Check if lead has at least one valid contact channel."""
        return (
            self.whatsapp_link is not None or
            self.instagram_handle is not None or
            self.email is not None
        )
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "place_id": self.place_id,
            "name": self.name,
            "address": self.address,
            "phone": self.phone,
            "website": self.website,
            "rating": self.rating,
            "review_count": self.review_count,
            "category": self.category,
            "photo_count": self.photo_count,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "google_maps_uri": self.google_maps_uri,
            "opportunity_score": self.opportunity_score,
            "tier": self.tier,
            # Validation fields
            "phone_status": self.phone_status,
            "phone_type": self.phone_type,
            "normalized_phone": self.normalized_phone,
            "whatsapp_link": self.whatsapp_link,
            "instagram_status": self.instagram_status,
            "instagram_handle": self.instagram_handle,
            "instagram_url": self.instagram_url,
            "instagram_source": self.instagram_source,
            "instagram_confidence": self.instagram_confidence,
            "email_status": self.email_status,
            "email": self.email,
            "email_source": self.email_source,
            "contactability_score": self.contactability_score,
            "best_channel": self.best_channel,
            "validation_status": self.validation_status,
            "validation_notes": self.validation_notes,
            "validated_at": self.validated_at.isoformat() if self.validated_at else None,
            "validation_attempts": self.validation_attempts,
            # Outreach fields
            "outreach_status": self.outreach_status,
            "campaign_id": self.campaign_id,
            "sequence_id": self.sequence_id,
            "sequence_position": self.sequence_position,
            "total_touches": self.total_touches,
            "last_touch_at": self.last_touch_at.isoformat() if self.last_touch_at else None,
            "next_touch_at": self.next_touch_at.isoformat() if self.next_touch_at else None,
            "first_response_at": self.first_response_at.isoformat() if self.first_response_at else None,
            "converted_at": self.converted_at.isoformat() if self.converted_at else None,
            # Metadata
            "source": self.source,
            "enriched_at": self.enriched_at.isoformat() if self.enriched_at else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "Lead":
        """Create Lead from dictionary."""
        # Handle datetime fields
        for dt_field in [
            "validated_at", "enriched_at", "created_at", "updated_at",
            "last_touch_at", "next_touch_at", "first_response_at", "converted_at"
        ]:
            if data.get(dt_field) and isinstance(data[dt_field], str):
                data[dt_field] = datetime.fromisoformat(data[dt_field])
        
        # Filter to only known fields
        known_fields = {f.name for f in cls.__dataclass_fields__.values()}
        filtered_data = {k: v for k, v in data.items() if k in known_fields}
        
        return cls(**filtered_data)
    
    @classmethod
    def from_harv3st(cls, harv3st_data: dict) -> "Lead":
        """Create Lead from Harv3st data format."""
        return cls(
            id=harv3st_data.get("id", harv3st_data.get("placeId", "")),
            place_id=harv3st_data.get("placeId"),
            name=harv3st_data.get("name", ""),
            address=harv3st_data.get("fullAddress", harv3st_data.get("address", "")),
            phone=harv3st_data.get("phones", [None])[0] if harv3st_data.get("phones") else harv3st_data.get("phone"),
            website=harv3st_data.get("website"),
            rating=harv3st_data.get("averageRating", harv3st_data.get("rating")),
            review_count=harv3st_data.get("reviewCount"),
            category=harv3st_data.get("categories", [None])[0] if harv3st_data.get("categories") else harv3st_data.get("category"),
            photo_count=harv3st_data.get("photoCount"),
            latitude=harv3st_data.get("latitude"),
            longitude=harv3st_data.get("longitude"),
            google_maps_uri=harv3st_data.get("googleMapsUri"),
            opportunity_score=harv3st_data.get("score", 0),
            source="harv3st",
        )
    
    @classmethod
    def from_serpapi(cls, serpapi_data: dict) -> "Lead":
        """Create Lead from SerpApi data format."""
        return cls(
            id=serpapi_data.get("place_id", serpapi_data.get("placeId", "")),
            place_id=serpapi_data.get("place_id", serpapi_data.get("placeId")),
            name=serpapi_data.get("title", serpapi_data.get("name", "")),
            address=serpapi_data.get("address", ""),
            phone=serpapi_data.get("phone"),
            website=serpapi_data.get("website"),
            rating=serpapi_data.get("rating"),
            review_count=serpapi_data.get("reviews", serpapi_data.get("reviewCount")),
            category=serpapi_data.get("type", serpapi_data.get("category")),
            latitude=serpapi_data.get("gps_coordinates", {}).get("latitude"),
            longitude=serpapi_data.get("gps_coordinates", {}).get("longitude"),
            google_maps_uri=serpapi_data.get("link", serpapi_data.get("googleMapsUri")),
            source="serpapi",
        )


# =============================================================================
# Approval System Models
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


# Quick test
if __name__ == "__main__":
    # Test Lead creation
    lead = Lead(
        id="test-123",
        name="Test Business",
        address="123 Test St",
        phone="11 1234-5678",
    )
    print(f"Created lead: {lead.name}")
    print(f"Has valid contact: {lead.has_valid_contact_channel()}")
    
    # Test from_harv3st
    harv3st_data = {
        "placeId": "ChIJ123",
        "name": "Barbería Juan",
        "fullAddress": "Av. Rivadavia 1234, Castelar",
        "phones": ["11 5555-1234"],
        "averageRating": 4.5,
        "reviewCount": 50,
    }
    lead2 = Lead.from_harv3st(harv3st_data)
    print(f"\nFrom Harv3st: {lead2.name} - {lead2.phone}")
    
    print("\n✅ Models initialized successfully")
