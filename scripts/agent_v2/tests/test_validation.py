"""
Property-Based Tests for Validation Skills
==========================================
Tests phone validation, Instagram finding, and email extraction using Hypothesis.

Feature: lead-validation-quality
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
import re
import string

# Add parent to path for imports
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from skills.validation import (
    PhoneValidatorSkill,
    PhoneValidationResult,
    InstagramFinderSkill,
    InstagramResult,
    EmailFinderSkill,
    EmailResult,
)


# =============================================================================
# Test Strategies (Generators)
# =============================================================================

def valid_argentine_mobile_numbers():
    """Generate valid Argentine mobile phone numbers."""
    return st.one_of(
        st.builds(
            lambda prefix, suffix: f"11 {prefix}{suffix}",
            st.sampled_from(['5', '6', '7', '2', '3']),
            st.text(alphabet='0123456789', min_size=7, max_size=7)
        ),
        st.builds(
            lambda prefix, suffix: f"+54 9 11 {prefix}{suffix}",
            st.sampled_from(['5', '6', '7', '2', '3']),
            st.text(alphabet='0123456789', min_size=7, max_size=7)
        ),
        st.builds(
            lambda num: f"15 {num[:4]}-{num[4:]}",
            st.text(alphabet='0123456789', min_size=8, max_size=8)
        ),
    )


def valid_argentine_landline_numbers():
    """Generate valid Argentine landline phone numbers."""
    return st.one_of(
        st.builds(
            lambda suffix: f"11 4{suffix}",
            st.text(alphabet='0123456789', min_size=7, max_size=7)
        ),
        st.builds(
            lambda suffix: f"+54 11 4{suffix}",
            st.text(alphabet='0123456789', min_size=7, max_size=7)
        ),
    )


def invalid_phone_numbers():
    """Generate invalid phone numbers."""
    return st.one_of(
        st.text(alphabet='0123456789', min_size=1, max_size=5),
        st.text(alphabet='0123456789', min_size=15, max_size=20),
        st.just(""),
        st.text(alphabet=' \t\n', min_size=1, max_size=5),
        st.text(alphabet=string.ascii_letters, min_size=5, max_size=10),
    )


def instagram_handles():
    """Generate valid Instagram handles."""
    return st.text(
        alphabet=string.ascii_lowercase + string.digits + '_.',
        min_size=3,
        max_size=30
    ).filter(lambda x: not x.startswith('.') and not x.endswith('.') and '..' not in x)


def html_with_instagram():
    """Generate HTML content containing Instagram links."""
    return st.builds(
        lambda handle: f'<a href="https://instagram.com/{handle}">Follow us</a>',
        instagram_handles()
    )


def html_without_instagram():
    """Generate HTML content without Instagram links."""
    return st.just('<a href="https://facebook.com/business">Facebook</a>')


def business_names():
    """Generate business names."""
    return st.builds(
        lambda p, n: f"{p} {n}",
        st.sampled_from(['Barbería', 'Restaurante', 'Kiosco', 'Café']),
        st.sampled_from(['Juan', 'María', 'Don Pepe', 'La Esquina'])
    )


def locations():
    """Generate location strings."""
    return st.sampled_from(['Castelar', 'Palermo', 'Buenos Aires', 'Morón'])


def valid_emails():
    """Generate valid email addresses."""
    return st.builds(
        lambda local, domain: f"{local}@{domain}",
        st.text(alphabet=string.ascii_lowercase + string.digits, min_size=3, max_size=10),
        st.sampled_from(['gmail.com', 'empresa.com.ar', 'negocio.com'])
    )


def generic_emails():
    """Generate generic emails."""
    return st.builds(
        lambda prefix, domain: f"{prefix}@{domain}",
        st.sampled_from(['info', 'noreply', 'support', 'admin']),
        st.sampled_from(['gmail.com', 'empresa.com.ar'])
    )


def preferred_emails():
    """Generate preferred business emails."""
    return st.builds(
        lambda prefix, domain: f"{prefix}@{domain}",
        st.sampled_from(['ventas', 'contacto', 'reservas', 'hola']),
        st.sampled_from(['gmail.com', 'empresa.com.ar'])
    )


def html_with_emails():
    """Generate HTML with emails."""
    return st.builds(
        lambda email: f'<p>Contact: {email}</p>',
        valid_emails()
    )


# =============================================================================
# Property Tests - Phone Validation
# =============================================================================

class TestPhoneValidatorProperties:
    """Property tests for PhoneValidatorSkill. Validates: Requirements 1.2-1.5"""
    
    def setup_method(self):
        self.validator = PhoneValidatorSkill()
    
    @settings(max_examples=100)
    @given(phone=valid_argentine_mobile_numbers())
    def test_valid_mobile_returns_valid_result(self, phone: str):
        """Property 1: Valid mobile returns is_valid=True, type=mobile"""
        result = self.validator.validate(phone)
        assert result.is_valid is True
        assert result.phone_type == "mobile"
        assert result.normalized_number is not None
    
    @settings(max_examples=100)
    @given(phone=valid_argentine_mobile_numbers())
    def test_valid_mobile_generates_whatsapp_link(self, phone: str):
        """Property 1: Valid mobile generates WhatsApp link"""
        result = self.validator.validate(phone)
        if result.is_valid and result.phone_type == "mobile":
            assert result.whatsapp_link is not None
            assert result.whatsapp_link.startswith("wa.me/")
    
    @settings(max_examples=100)
    @given(phone=valid_argentine_landline_numbers())
    def test_valid_landline_returns_valid_result(self, phone: str):
        """Property 1: Valid landline returns is_valid=True, type=landline"""
        result = self.validator.validate(phone)
        assert result.is_valid is True
        assert result.phone_type == "landline"
    
    @settings(max_examples=100)
    @given(phone=valid_argentine_landline_numbers())
    def test_landline_has_no_whatsapp_link(self, phone: str):
        """Property 1: Landline has no WhatsApp link"""
        result = self.validator.validate(phone)
        if result.is_valid and result.phone_type == "landline":
            assert result.whatsapp_link is None


class TestPhoneValidatorErrorHandling:
    """Property tests for phone error handling. Validates: Requirements 1.6"""
    
    def setup_method(self):
        self.validator = PhoneValidatorSkill()
    
    @settings(max_examples=100)
    @given(phone=invalid_phone_numbers())
    def test_invalid_phone_returns_error(self, phone: str):
        """Property 2: Invalid phone returns is_valid=False with error"""
        result = self.validator.validate(phone)
        assert result.is_valid is False
        assert result.error_message is not None


# =============================================================================
# Property Tests - Instagram Finder
# =============================================================================

class TestInstagramFinderProperties:
    """Property tests for InstagramFinderSkill. Validates: Requirements 2.4-2.6"""
    
    def setup_method(self):
        self.finder = InstagramFinderSkill()
    
    @settings(max_examples=100)
    @given(html=html_with_instagram())
    def test_found_result_has_handle_and_url(self, html: str):
        """Property 3: Found result has handle and URL"""
        result = self.finder.find("Test", "Buenos Aires", html_content=html)
        if result.found:
            assert result.handle is not None
            assert result.url is not None
            assert "instagram.com" in result.url
    
    @settings(max_examples=100)
    @given(handle=instagram_handles(), business_name=business_names(), location=locations())
    def test_verify_match_returns_valid_confidence(self, handle: str, business_name: str, location: str):
        """Property 3: verify_match returns valid confidence"""
        confidence = self.finder.verify_match(handle, business_name, location)
        assert confidence in ["high", "medium", "low"]


# =============================================================================
# Property Tests - Email Finder
# =============================================================================

class TestEmailFinderProperties:
    """Property tests for EmailFinderSkill. Validates: Requirements 3.2-3.5"""
    
    def setup_method(self):
        self.finder = EmailFinderSkill()
    
    @settings(max_examples=100)
    @given(html=html_with_emails())
    def test_extracts_emails_from_html(self, html: str):
        """Property 4: Extracts emails from HTML"""
        emails = self.finder.extract_emails(html)
        assert len(emails) > 0
        for email in emails:
            assert '@' in email
    
    @settings(max_examples=100)
    @given(email=generic_emails())
    def test_identifies_generic_emails(self, email: str):
        """Property 4: Identifies generic emails"""
        is_generic = self.finder.is_generic_email(email)
        assert is_generic is True
    
    @settings(max_examples=100)
    @given(preferred=preferred_emails(), generic=generic_emails())
    def test_prioritizes_preferred_over_generic(self, preferred: str, generic: str):
        """Property 4: Prioritizes preferred over generic"""
        emails = [generic, preferred]
        result = self.finder.filter_and_prioritize(emails)
        assert result is not None
        best_email, confidence = result
        assert best_email == preferred
        assert confidence == "high"


# =============================================================================
# Unit Tests - Examples
# =============================================================================

class TestPhoneValidatorExamples:
    """Unit tests for phone validation."""
    
    def setup_method(self):
        self.validator = PhoneValidatorSkill()
    
    def test_buenos_aires_mobile(self):
        result = self.validator.validate("11 5555-1234")
        assert result.is_valid is True
        assert result.phone_type == "mobile"
    
    def test_buenos_aires_landline(self):
        result = self.validator.validate("11 4567-8901")
        assert result.is_valid is True
        assert result.phone_type == "landline"
    
    def test_empty_phone(self):
        result = self.validator.validate("")
        assert result.is_valid is False


class TestInstagramFinderExamples:
    """Unit tests for Instagram finding."""
    
    def setup_method(self):
        self.finder = InstagramFinderSkill()
    
    def test_extract_from_simple_html(self):
        html = '<a href="https://instagram.com/barberia_juan">IG</a>'
        result = self.finder.extract_from_html(html)
        assert result is not None
        handle, url = result
        assert handle == "barberia_juan"
    
    def test_verify_match_medium_confidence(self):
        confidence = self.finder.verify_match("juancuts", "Barbería Juan", "Castelar")
        assert confidence == "medium"


class TestEmailFinderExamples:
    """Unit tests for email finding."""
    
    def setup_method(self):
        self.finder = EmailFinderSkill()
    
    def test_extract_simple_email(self):
        html = '<p>Email: test@example.com</p>'
        emails = self.finder.extract_emails(html)
        assert 'test@example.com' in emails
    
    def test_prioritize_ventas_over_info(self):
        emails = ['info@business.com', 'ventas@business.com']
        result = self.finder.filter_and_prioritize(emails)
        assert result is not None
        email, confidence = result
        assert email == 'ventas@business.com'
        assert confidence == "high"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
