"""
ScoringSkill - Contactability Score Calculation
===============================================
Calculates contactability scores for leads based on available contact channels.
Complements the existing opportunity_score with a "how easy to contact" metric.
"""

import logging
from dataclasses import dataclass
from typing import Optional, Literal, TYPE_CHECKING

if TYPE_CHECKING:
    from .models import Lead

logger = logging.getLogger(__name__)


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class ContactabilityResult:
    """Result of contactability score calculation."""
    score: int  # 0-100
    best_channel: Literal["whatsapp", "instagram", "email", "none"]
    status: Literal["ready", "needs_review"]
    reasoning: str


# =============================================================================
# Scoring Rules
# =============================================================================

DEFAULT_CONTACTABILITY_RULES = {
    # Positive factors
    "valid_mobile_phone": 30,
    "instagram_found": 25,
    "email_found": 15,
    "website_functional": 10,
    
    # Negative factors
    "invalid_phone_format": -10,
    "landline_only": -15,
    "no_contact_channels": -30,
}

# Status threshold
READY_THRESHOLD = 60


# =============================================================================
# ContactabilityScorer
# =============================================================================

class ContactabilityScorer:
    """
    Calculates contactability score and determines best contact channel.
    
    Scoring:
    - Valid mobile phone: +30
    - Instagram found: +25
    - Email found: +15
    - Website functional: +10
    - Invalid phone: -10
    - Landline only: -15
    - No channels: -30
    
    Classification:
    - score >= 60: "ready" (can be contacted)
    - score < 60: "needs_review" (requires manual verification)
    """
    
    def __init__(self, rules: Optional[dict] = None):
        """
        Args:
            rules: Optional custom scoring rules
        """
        self.rules = rules or DEFAULT_CONTACTABILITY_RULES
    
    def calculate(self, lead: dict) -> ContactabilityResult:
        """
        Calculates contactability score and determines best channel.
        
        Args:
            lead: Lead dictionary with validation fields:
                - phone_status: "valid_mobile" | "valid_landline" | "invalid" | "missing"
                - whatsapp_link: str | None
                - instagram_status: "found" | "not_found" | "unverified"
                - instagram_handle: str | None
                - email_status: "found" | "not_found"
                - email: str | None
                - website: str | None (original website)
                
        Returns:
            ContactabilityResult with score, best_channel, status, reasoning
        """
        score, reasoning = self._calculate_score(lead)
        best_channel = self._determine_best_channel(lead)
        status = self._classify_status(score)
        
        reasoning_str = "; ".join(reasoning) if reasoning else "No factors applied"
        
        return ContactabilityResult(
            score=score,
            best_channel=best_channel,
            status=status,
            reasoning=reasoning_str
        )
    
    def _calculate_score(self, lead: dict) -> tuple[int, list[str]]:
        """
        Calculate raw score and collect reasoning.
        
        Returns:
            Tuple of (score, list of reasoning strings)
        """
        score = 0
        reasoning = []
        
        # Check phone status
        phone_status = lead.get("phone_status", "missing")
        whatsapp_link = lead.get("whatsapp_link")
        
        if phone_status == "valid_mobile" or whatsapp_link:
            score += self.rules["valid_mobile_phone"]
            reasoning.append(f"+{self.rules['valid_mobile_phone']} valid mobile phone")
        elif phone_status == "valid_landline":
            score += self.rules["landline_only"]
            reasoning.append(f"{self.rules['landline_only']} landline only (no WhatsApp)")
        elif phone_status == "invalid":
            score += self.rules["invalid_phone_format"]
            reasoning.append(f"{self.rules['invalid_phone_format']} invalid phone format")
        
        # Check Instagram
        instagram_status = lead.get("instagram_status", "not_found")
        instagram_handle = lead.get("instagram_handle")
        
        if instagram_status == "found" or instagram_handle:
            score += self.rules["instagram_found"]
            reasoning.append(f"+{self.rules['instagram_found']} Instagram found")
        
        # Check Email
        email_status = lead.get("email_status", "not_found")
        email = lead.get("email")
        
        if email_status == "found" or email:
            score += self.rules["email_found"]
            reasoning.append(f"+{self.rules['email_found']} email found")
        
        # Check Website
        website = lead.get("website")
        if website and not website.startswith("search.google.com"):
            score += self.rules["website_functional"]
            reasoning.append(f"+{self.rules['website_functional']} website functional")
        
        # Check if no contact channels at all
        has_any_channel = (
            whatsapp_link or 
            instagram_handle or 
            email or
            phone_status == "valid_landline"
        )
        
        if not has_any_channel:
            score += self.rules["no_contact_channels"]
            reasoning.append(f"{self.rules['no_contact_channels']} no contact channels")
        
        # Clamp score to 0-100
        score = max(0, min(100, score))
        
        return (score, reasoning)
    
    def _determine_best_channel(self, lead: dict) -> Literal["whatsapp", "instagram", "email", "none"]:
        """
        Determine best contact channel based on priority.
        
        Priority: WhatsApp > Instagram > Email > None
        
        Returns:
            Best available channel
        """
        # Check WhatsApp first (highest priority)
        if lead.get("whatsapp_link") or lead.get("phone_status") == "valid_mobile":
            return "whatsapp"
        
        # Check Instagram
        if lead.get("instagram_handle") or lead.get("instagram_status") == "found":
            return "instagram"
        
        # Check Email
        if lead.get("email") or lead.get("email_status") == "found":
            return "email"
        
        return "none"
    
    def _classify_status(self, score: int) -> Literal["ready", "needs_review"]:
        """
        Classify lead status based on score.
        
        Returns:
            "ready" if score >= 60, "needs_review" otherwise
        """
        if score >= READY_THRESHOLD:
            return "ready"
        return "needs_review"


# Quick test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    scorer = ContactabilityScorer()
    print("ContactabilityScorer created")
    print(f"Rules: {scorer.rules}")
    print(f"Ready threshold: {READY_THRESHOLD}")
    
    print("\n✅ Scoring skill initialized successfully")
