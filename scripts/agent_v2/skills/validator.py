"""
Lead Validation Flow
====================
Orchestrates all validation skills to validate and score leads.

Implements Requirements 7.1-7.5:
- Validation order: phone → instagram → email → score
- Early exit if score >= 60
- Logging of each step
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

# Add parent to path for imports
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import Lead
from skills.validation import PhoneValidatorSkill, InstagramFinderSkill, EmailFinderSkill
from skills.scoring import ContactabilityScorer
from skills.scraper import ScraperSkill

logger = logging.getLogger(__name__)


# =============================================================================
# Validation Result
# =============================================================================

@dataclass
class ValidationResult:
    """Result of the full validation flow."""
    lead: Lead
    success: bool
    steps_completed: list[str]
    early_exit: bool
    validation_time_ms: int
    error: Optional[str] = None


@dataclass
class ValidationStep:
    """Record of a single validation step."""
    step_name: str
    timestamp: datetime
    success: bool
    result: Optional[dict] = None
    error: Optional[str] = None


# =============================================================================
# Lead Validator
# =============================================================================

class LeadValidator:
    """
    Orchestrates the full lead validation flow.
    
    Validation order (per Requirements 7.1):
    1. validate_phone
    2. check existing Instagram
    3. find_instagram if missing
    4. find_email if no other channels
    5. calculate contactability score
    
    Early exit (per Requirements 7.2):
    - Stop if contactability_score >= 60
    """
    
    def __init__(
        self,
        phone_validator: Optional[PhoneValidatorSkill] = None,
        instagram_finder: Optional[InstagramFinderSkill] = None,
        email_finder: Optional[EmailFinderSkill] = None,
        scorer: Optional[ContactabilityScorer] = None,
        scraper: Optional[ScraperSkill] = None,
    ):
        self.phone_validator = phone_validator or PhoneValidatorSkill()
        self.instagram_finder = instagram_finder or InstagramFinderSkill()
        self.email_finder = email_finder or EmailFinderSkill()
        self.scorer = scorer or ContactabilityScorer()
        self.scraper = scraper or ScraperSkill()
        
        self.steps: list[ValidationStep] = []
    
    def validate_lead(self, lead: Lead, early_exit_threshold: int = 60) -> ValidationResult:
        """
        Execute the full validation flow for a lead.
        
        Args:
            lead: Lead to validate
            early_exit_threshold: Score threshold for early exit (default 60)
            
        Returns:
            ValidationResult with updated lead and validation metadata
        """
        start_time = datetime.now()
        self.steps = []
        steps_completed = []
        
        logger.info(f"🔍 Starting validation for: {lead.name}")
        lead.validation_attempts += 1
        
        try:
            # Step 1: Validate phone
            self._log_step("phone_validation", "Starting phone validation")
            lead = self._validate_phone(lead)
            steps_completed.append("phone_validation")
            
            # Calculate intermediate score
            score_result = self.scorer.calculate(lead.to_dict())
            lead.contactability_score = score_result.score
            
            # Early exit check
            if score_result.score >= early_exit_threshold:
                logger.info(f"✅ Early exit: score {score_result.score} >= {early_exit_threshold}")
                lead = self._finalize_lead(lead, score_result)
                return self._build_result(lead, steps_completed, True, start_time)
            
            # Step 2: Check/Find Instagram
            self._log_step("instagram_search", "Starting Instagram search")
            lead = self._find_instagram(lead)
            steps_completed.append("instagram_search")
            
            # Recalculate score
            score_result = self.scorer.calculate(lead.to_dict())
            lead.contactability_score = score_result.score
            
            # Early exit check
            if score_result.score >= early_exit_threshold:
                logger.info(f"✅ Early exit: score {score_result.score} >= {early_exit_threshold}")
                lead = self._finalize_lead(lead, score_result)
                return self._build_result(lead, steps_completed, True, start_time)
            
            # Step 3: Find email (only if no other channels)
            if not lead.whatsapp_link and not lead.instagram_handle:
                self._log_step("email_search", "Starting email search")
                lead = self._find_email(lead)
                steps_completed.append("email_search")
            
            # Final score calculation
            score_result = self.scorer.calculate(lead.to_dict())
            lead = self._finalize_lead(lead, score_result)
            
            logger.info(f"✅ Validation complete: {lead.name} - Score: {lead.contactability_score}")
            return self._build_result(lead, steps_completed, False, start_time)
            
        except Exception as e:
            logger.error(f"❌ Validation failed for {lead.name}: {e}")
            return ValidationResult(
                lead=lead,
                success=False,
                steps_completed=steps_completed,
                early_exit=False,
                validation_time_ms=self._calc_time_ms(start_time),
                error=str(e)
            )
    
    def _validate_phone(self, lead: Lead) -> Lead:
        """Step 1: Validate phone number."""
        if not lead.phone:
            logger.info("  📞 No phone number to validate")
            lead.phone_status = "missing"
            self._record_step("phone_validation", True, {"status": "missing"})
            return lead
        
        result = self.phone_validator.validate(lead.phone)
        
        if result.is_valid:
            lead.phone_status = f"valid_{result.phone_type}"
            lead.phone_type = result.phone_type
            lead.normalized_phone = result.normalized_number
            lead.whatsapp_link = result.whatsapp_link
            logger.info(f"  📞 Phone valid: {result.phone_type}, WhatsApp: {result.whatsapp_link is not None}")
        else:
            lead.phone_status = "invalid"
            lead.phone_type = "unknown"
            logger.info(f"  📞 Phone invalid: {result.error_message}")
        
        self._record_step("phone_validation", True, {
            "is_valid": result.is_valid,
            "phone_type": result.phone_type,
            "has_whatsapp": result.whatsapp_link is not None
        })
        
        return lead
    
    def _find_instagram(self, lead: Lead) -> Lead:
        """Step 2: Find Instagram profile."""
        # Check if already has Instagram from previous enrichment
        if lead.instagram_handle:
            logger.info(f"  📸 Instagram already found: @{lead.instagram_handle}")
            lead.instagram_status = "found"
            self._record_step("instagram_search", True, {"source": "existing"})
            return lead
        
        # Try to find Instagram
        html_content = None
        if lead.website:
            try:
                scrape_result = self.scraper.scrape(lead.website)
                html_content = scrape_result.get("raw_html", "")
            except Exception as e:
                logger.warning(f"  📸 Could not scrape website: {e}")
        
        result = self.instagram_finder.find(
            business_name=lead.name,
            location=lead.address,
            html_content=html_content
        )
        
        if result.found:
            lead.instagram_status = "found"
            lead.instagram_handle = result.handle
            lead.instagram_url = result.url
            lead.instagram_source = result.source
            lead.instagram_confidence = result.confidence
            logger.info(f"  📸 Instagram found: @{result.handle} ({result.confidence})")
        else:
            lead.instagram_status = "not_found"
            logger.info("  📸 Instagram not found")
        
        self._record_step("instagram_search", True, {
            "found": result.found,
            "handle": result.handle,
            "confidence": result.confidence
        })
        
        return lead
    
    def _find_email(self, lead: Lead) -> Lead:
        """Step 3: Find email address."""
        if lead.email:
            logger.info(f"  📧 Email already found: {lead.email}")
            lead.email_status = "found"
            self._record_step("email_search", True, {"source": "existing"})
            return lead
        
        if not lead.website:
            logger.info("  📧 No website to search for email")
            lead.email_status = "not_found"
            self._record_step("email_search", True, {"reason": "no_website"})
            return lead
        
        result = self.email_finder.find(lead.website)
        
        if result.found:
            lead.email_status = "found"
            lead.email = result.email
            lead.email_source = result.source_page
            logger.info(f"  📧 Email found: {result.email}")
        else:
            lead.email_status = "not_found"
            logger.info("  📧 Email not found")
        
        self._record_step("email_search", True, {
            "found": result.found,
            "email": result.email
        })
        
        return lead
    
    def _finalize_lead(self, lead: Lead, score_result) -> Lead:
        """Finalize lead with score and status."""
        lead.contactability_score = score_result.score
        lead.best_channel = score_result.best_channel
        lead.validation_status = score_result.status
        lead.validation_notes = score_result.reasoning
        lead.validated_at = datetime.now()
        lead.updated_at = datetime.now()
        return lead
    
    def get_validation_log(self) -> list[dict]:
        """
        Get the log of all validation steps.
        
        Returns:
            List of step dictionaries with timestamp, name, success, result
        """
        return [
            {
                "step_name": step.step_name,
                "timestamp": step.timestamp.isoformat(),
                "success": step.success,
                "result": step.result,
                "error": step.error
            }
            for step in self.steps
        ]
    
    def _log_step(self, step_name: str, message: str):
        """Log a validation step."""
        logger.info(f"  [{step_name}] {message}")
    
    def _record_step(self, step_name: str, success: bool, result: dict = None, error: str = None):
        """Record a validation step for tracking."""
        self.steps.append(ValidationStep(
            step_name=step_name,
            timestamp=datetime.now(),
            success=success,
            result=result,
            error=error
        ))
    
    def _build_result(
        self, 
        lead: Lead, 
        steps_completed: list[str], 
        early_exit: bool,
        start_time: datetime
    ) -> ValidationResult:
        """Build the final validation result."""
        return ValidationResult(
            lead=lead,
            success=True,
            steps_completed=steps_completed,
            early_exit=early_exit,
            validation_time_ms=self._calc_time_ms(start_time)
        )
    
    def _calc_time_ms(self, start_time: datetime) -> int:
        """Calculate elapsed time in milliseconds."""
        return int((datetime.now() - start_time).total_seconds() * 1000)


# =============================================================================
# Convenience Function
# =============================================================================

def validate_lead(lead: Lead, early_exit_threshold: int = 60) -> ValidationResult:
    """
    Convenience function to validate a single lead.
    
    Args:
        lead: Lead to validate
        early_exit_threshold: Score threshold for early exit
        
    Returns:
        ValidationResult with updated lead
    """
    validator = LeadValidator()
    return validator.validate_lead(lead, early_exit_threshold)


# Quick test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Create test lead
    lead = Lead(
        id="test-123",
        name="Barbería Juan",
        address="Av. Rivadavia 1234, Castelar",
        phone="11 5555-1234",
        website="https://barberiajuan.com"
    )
    
    print("Testing LeadValidator...")
    validator = LeadValidator()
    result = validator.validate_lead(lead)
    
    print(f"\nResult:")
    print(f"  Success: {result.success}")
    print(f"  Steps: {result.steps_completed}")
    print(f"  Early exit: {result.early_exit}")
    print(f"  Time: {result.validation_time_ms}ms")
    print(f"  Score: {result.lead.contactability_score}")
    print(f"  Status: {result.lead.validation_status}")
    print(f"  Best channel: {result.lead.best_channel}")
    
    print("\n✅ LeadValidator test complete")
