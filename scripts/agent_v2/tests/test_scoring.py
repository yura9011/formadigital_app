"""
Property-Based Tests for Contactability Scoring
================================================
Tests scoring calculation and status assignment.

Feature: lead-validation-quality
"""

import pytest
from hypothesis import given, strategies as st, settings

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from skills.scoring import ContactabilityScorer, ContactabilityResult, READY_THRESHOLD


# =============================================================================
# Test Strategies
# =============================================================================

def lead_with_mobile():
    """Generate lead with valid mobile phone."""
    return st.fixed_dictionaries({
        "phone_status": st.just("valid_mobile"),
        "whatsapp_link": st.just("wa.me/5491155551234"),
        "instagram_status": st.sampled_from(["found", "not_found"]),
        "instagram_handle": st.one_of(st.none(), st.just("test_handle")),
        "email_status": st.sampled_from(["found", "not_found"]),
        "email": st.one_of(st.none(), st.just("test@example.com")),
        "website": st.one_of(st.none(), st.just("https://example.com")),
    })


def lead_with_instagram_only():
    """Generate lead with only Instagram."""
    return st.fixed_dictionaries({
        "phone_status": st.just("missing"),
        "whatsapp_link": st.none(),
        "instagram_status": st.just("found"),
        "instagram_handle": st.just("test_handle"),
        "email_status": st.just("not_found"),
        "email": st.none(),
        "website": st.one_of(st.none(), st.just("https://example.com")),
    })


def lead_with_no_channels():
    """Generate lead with no contact channels."""
    return st.fixed_dictionaries({
        "phone_status": st.just("missing"),
        "whatsapp_link": st.none(),
        "instagram_status": st.just("not_found"),
        "instagram_handle": st.none(),
        "email_status": st.just("not_found"),
        "email": st.none(),
        "website": st.one_of(st.none(), st.just("https://example.com")),
    })


def any_lead():
    """Generate any lead configuration."""
    return st.builds(
        lambda ps, wl, ist, ih, es, em, ws: {
            "phone_status": ps,
            "whatsapp_link": wl,
            "instagram_status": ist,
            "instagram_handle": ih,
            "email_status": es,
            "email": em,
            "website": ws,
        },
        ps=st.sampled_from(["valid_mobile", "valid_landline", "invalid", "missing"]),
        wl=st.sampled_from([None, "wa.me/5491155551234"]),
        ist=st.sampled_from(["found", "not_found", "unverified"]),
        ih=st.sampled_from([None, "test_handle"]),
        es=st.sampled_from(["found", "not_found"]),
        em=st.sampled_from([None, "test@example.com"]),
        ws=st.sampled_from([None, "https://example.com"]),
    )


# =============================================================================
# Property Tests - Contactability Scoring
# =============================================================================

class TestContactabilityScorerProperties:
    """
    Property tests for ContactabilityScorer.
    
    Feature: lead-validation-quality, Property 5: Contactability Scoring Correctness
    Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
    """
    
    def setup_method(self):
        self.scorer = ContactabilityScorer()
    
    @settings(max_examples=100)
    @given(lead=any_lead())
    def test_score_in_valid_range(self, lead: dict):
        """
        Property 5.1: Score is always in range [0, 100].
        
        Feature: lead-validation-quality, Property 5
        Validates: Requirements 4.1
        """
        result = self.scorer.calculate(lead)
        assert 0 <= result.score <= 100, f"Score {result.score} out of range"
    
    @settings(max_examples=100)
    @given(lead=lead_with_mobile())
    def test_mobile_phone_adds_30_points(self, lead: dict):
        """
        Property 5.2: Valid mobile phone adds exactly 30 points.
        
        Feature: lead-validation-quality, Property 5
        Validates: Requirements 4.2
        """
        result = self.scorer.calculate(lead)
        # Mobile phone contributes +30
        assert result.score >= 30, f"Mobile phone should add at least 30 points, got {result.score}"
        assert "+30 valid mobile phone" in result.reasoning
    
    @settings(max_examples=100)
    @given(lead=any_lead())
    def test_best_channel_follows_priority(self, lead: dict):
        """
        Property 5.3: Best channel follows priority WhatsApp > Instagram > Email > None.
        
        Feature: lead-validation-quality, Property 5
        Validates: Requirements 4.4
        """
        result = self.scorer.calculate(lead)
        
        has_whatsapp = lead.get("whatsapp_link") or lead.get("phone_status") == "valid_mobile"
        has_instagram = lead.get("instagram_handle") or lead.get("instagram_status") == "found"
        has_email = lead.get("email") or lead.get("email_status") == "found"
        
        if has_whatsapp:
            assert result.best_channel == "whatsapp"
        elif has_instagram:
            assert result.best_channel == "instagram"
        elif has_email:
            assert result.best_channel == "email"
        else:
            assert result.best_channel == "none"
    
    @settings(max_examples=100)
    @given(lead=any_lead())
    def test_status_matches_score_threshold(self, lead: dict):
        """
        Property 5.4: Status is "ready" iff score >= 60.
        
        Feature: lead-validation-quality, Property 5
        Validates: Requirements 4.5
        """
        result = self.scorer.calculate(lead)
        
        if result.score >= READY_THRESHOLD:
            assert result.status == "ready", f"Score {result.score} should be ready"
        else:
            assert result.status == "needs_review", f"Score {result.score} should be needs_review"
    
    @settings(max_examples=100)
    @given(lead=any_lead())
    def test_reasoning_is_not_empty(self, lead: dict):
        """
        Property 5.5: Reasoning string is never empty.
        
        Feature: lead-validation-quality, Property 5
        Validates: Requirements 4.6
        """
        result = self.scorer.calculate(lead)
        assert result.reasoning is not None
        assert len(result.reasoning) > 0


class TestStatusAssignmentProperties:
    """
    Property tests for status assignment.
    
    Feature: lead-validation-quality, Property 6: Status Assignment Correctness
    Validates: Requirements 6.1, 6.2, 6.3
    """
    
    def setup_method(self):
        self.scorer = ContactabilityScorer()
    
    @settings(max_examples=100)
    @given(lead=any_lead())
    def test_status_is_valid_value(self, lead: dict):
        """
        Property 6.1: Status is always a valid value.
        
        Feature: lead-validation-quality, Property 6
        Validates: Requirements 6.1
        """
        result = self.scorer.calculate(lead)
        assert result.status in ["ready", "needs_review"]
    
    @settings(max_examples=50)
    @given(lead=lead_with_mobile())
    def test_lead_with_channel_can_be_ready(self, lead: dict):
        """
        Property 6.2: Lead with valid contact channel can be "ready".
        
        Feature: lead-validation-quality, Property 6
        Validates: Requirements 6.2
        """
        result = self.scorer.calculate(lead)
        # Mobile phone alone gives 30 points, not enough for ready (60)
        # But with website (+10) or instagram (+25) it can be ready
        assert result.best_channel != "none"
    
    @settings(max_examples=50)
    @given(lead=lead_with_no_channels())
    def test_lead_without_channels_needs_review(self, lead: dict):
        """
        Property 6.3: Lead without contact channels is "needs_review".
        
        Feature: lead-validation-quality, Property 6
        Validates: Requirements 6.3
        """
        result = self.scorer.calculate(lead)
        assert result.status == "needs_review"
        assert result.best_channel == "none"


# =============================================================================
# Unit Tests - Examples
# =============================================================================

class TestContactabilityScorerExamples:
    """Unit tests for ContactabilityScorer."""
    
    def setup_method(self):
        self.scorer = ContactabilityScorer()
    
    def test_mobile_plus_instagram_is_ready(self):
        """Lead with mobile + Instagram should be ready (30+25=55, need website for 65)."""
        lead = {
            "phone_status": "valid_mobile",
            "whatsapp_link": "wa.me/5491155551234",
            "instagram_status": "found",
            "instagram_handle": "test",
            "email_status": "not_found",
            "email": None,
            "website": "https://example.com",  # +10
        }
        result = self.scorer.calculate(lead)
        # 30 + 25 + 10 = 65
        assert result.score == 65
        assert result.status == "ready"
        assert result.best_channel == "whatsapp"
    
    def test_no_channels_is_needs_review(self):
        """Lead with no channels should be needs_review."""
        lead = {
            "phone_status": "missing",
            "whatsapp_link": None,
            "instagram_status": "not_found",
            "instagram_handle": None,
            "email_status": "not_found",
            "email": None,
            "website": None,
        }
        result = self.scorer.calculate(lead)
        # -30 for no channels, clamped to 0
        assert result.score == 0
        assert result.status == "needs_review"
        assert result.best_channel == "none"
    
    def test_landline_only_penalized(self):
        """Lead with only landline should be penalized."""
        lead = {
            "phone_status": "valid_landline",
            "whatsapp_link": None,
            "instagram_status": "not_found",
            "instagram_handle": None,
            "email_status": "not_found",
            "email": None,
            "website": None,
        }
        result = self.scorer.calculate(lead)
        # -15 for landline only, clamped to 0
        assert result.score == 0
        assert result.status == "needs_review"
    
    def test_instagram_only_is_not_ready(self):
        """Lead with only Instagram (25 points) is not ready."""
        lead = {
            "phone_status": "missing",
            "whatsapp_link": None,
            "instagram_status": "found",
            "instagram_handle": "test",
            "email_status": "not_found",
            "email": None,
            "website": None,
        }
        result = self.scorer.calculate(lead)
        # 25 for Instagram
        assert result.score == 25
        assert result.status == "needs_review"
        assert result.best_channel == "instagram"
    
    def test_all_channels_high_score(self):
        """Lead with all channels should have high score."""
        lead = {
            "phone_status": "valid_mobile",
            "whatsapp_link": "wa.me/5491155551234",
            "instagram_status": "found",
            "instagram_handle": "test",
            "email_status": "found",
            "email": "test@example.com",
            "website": "https://example.com",
        }
        result = self.scorer.calculate(lead)
        # 30 + 25 + 15 + 10 = 80
        assert result.score == 80
        assert result.status == "ready"
        assert result.best_channel == "whatsapp"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
