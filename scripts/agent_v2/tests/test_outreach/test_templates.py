"""
Template Manager Tests
======================
Property-based tests for template rendering.

**Property 1: Template Variable Completeness**
**Validates: Requirements 1.4, 1.5, 1.6**
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from datetime import datetime

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from skills.outreach.templates import (
    TemplateManager, 
    MessageTemplate, 
    RenderedMessage,
    ValidationResult
)


# =============================================================================
# Strategies
# =============================================================================

@st.composite
def template_body_strategy(draw):
    """Generate template bodies with variables."""
    # Generate some text parts
    text_parts = draw(st.lists(
        st.text(alphabet="abcdefghijklmnopqrstuvwxyz ", min_size=1, max_size=20),
        min_size=1,
        max_size=5
    ))
    
    # Generate some variables
    variables = draw(st.lists(
        st.sampled_from(["business_name", "location", "phone", "instagram", "website"]),
        min_size=0,
        max_size=3
    ))
    
    # Interleave text and variables
    result = []
    for i, text in enumerate(text_parts):
        result.append(text)
        if i < len(variables):
            result.append(f"{{{{{variables[i]}}}}}")
    
    return "".join(result)


@st.composite
def lead_data_strategy(draw):
    """Generate lead data dictionaries."""
    return {
        "name": draw(st.text(min_size=1, max_size=50).filter(lambda x: x.strip())),
        "address": draw(st.text(min_size=0, max_size=100)),
        "phone": draw(st.text(min_size=0, max_size=20)),
        "instagram_handle": draw(st.text(min_size=0, max_size=30)),
        "website": draw(st.text(min_size=0, max_size=100)),
        "best_channel": draw(st.sampled_from(["whatsapp", "instagram", "email", "none", ""])),
        "category": draw(st.text(min_size=0, max_size=50)),
    }


@st.composite
def complete_lead_data_strategy(draw):
    """Generate lead data with all required fields filled."""
    return {
        "name": draw(st.text(min_size=1, max_size=50).filter(lambda x: x.strip())),
        "address": draw(st.text(min_size=1, max_size=100).filter(lambda x: x.strip())),
        "phone": draw(st.text(min_size=1, max_size=20).filter(lambda x: x.strip())),
        "instagram_handle": draw(st.text(min_size=1, max_size=30).filter(lambda x: x.strip())),
        "website": draw(st.text(min_size=1, max_size=100).filter(lambda x: x.strip())),
        "best_channel": draw(st.sampled_from(["whatsapp", "instagram", "email"])),
        "category": draw(st.text(min_size=1, max_size=50).filter(lambda x: x.strip())),
    }


# =============================================================================
# Property Tests
# =============================================================================

class TestTemplateVariableExtraction:
    """Tests for variable extraction from templates."""
    
    def test_extract_single_variable(self):
        """Test extracting a single variable."""
        text = "Hello {{business_name}}!"
        variables = TemplateManager.extract_variables(text)
        assert variables == ["business_name"]
    
    def test_extract_multiple_variables(self):
        """Test extracting multiple variables."""
        text = "Hello {{business_name}} in {{location}}!"
        variables = TemplateManager.extract_variables(text)
        assert set(variables) == {"business_name", "location"}
    
    def test_extract_no_variables(self):
        """Test text with no variables."""
        text = "Hello world!"
        variables = TemplateManager.extract_variables(text)
        assert variables == []
    
    def test_extract_duplicate_variables(self):
        """Test that duplicate variables are deduplicated."""
        text = "{{name}} and {{name}} again"
        variables = TemplateManager.extract_variables(text)
        assert variables == ["name"]
    
    @given(template_body_strategy())
    @settings(max_examples=100)
    def test_extracted_variables_are_in_body(self, body):
        """
        Property: All extracted variables must appear in the body.
        
        **Feature: automated-outreach, Property 1: Template Variable Completeness**
        **Validates: Requirements 1.2, 1.3**
        """
        variables = TemplateManager.extract_variables(body)
        for var in variables:
            assert f"{{{{{var}}}}}" in body


class TestTemplateRendering:
    """Tests for template rendering."""
    
    def test_render_simple_template(self):
        """Test rendering a simple template."""
        manager = TemplateManager.__new__(TemplateManager)
        manager.templates = {}
        manager.templates_dir = Path(".")
        
        template = MessageTemplate(
            id="test",
            name="Test",
            channel="whatsapp",
            body="Hello {{business_name}}!",
            variables=["business_name"]
        )
        manager.templates["test"] = template
        
        result = manager.render("test", {"name": "Test Business"})
        
        assert result.success
        assert "Test Business" in result.body
        assert "{{business_name}}" not in result.body
    
    def test_render_missing_variable(self):
        """Test rendering with missing variable."""
        manager = TemplateManager.__new__(TemplateManager)
        manager.templates = {}
        manager.templates_dir = Path(".")
        
        template = MessageTemplate(
            id="test",
            name="Test",
            channel="whatsapp",
            body="Hello {{business_name}} in {{location}}!",
            variables=["business_name", "location"]
        )
        manager.templates["test"] = template
        
        # Only provide business_name, not location
        result = manager.render("test", {"name": "Test"})
        
        assert not result.success
        assert "location" in result.missing_variables
        assert result.error is not None
    
    def test_render_nonexistent_template(self):
        """Test rendering a template that doesn't exist."""
        manager = TemplateManager.__new__(TemplateManager)
        manager.templates = {}
        manager.templates_dir = Path(".")
        
        result = manager.render("nonexistent", {"name": "Test"})
        
        assert not result.success
        assert "not found" in result.error.lower()
    
    @given(complete_lead_data_strategy())
    @settings(max_examples=100)
    def test_render_with_complete_data_succeeds(self, lead_data):
        """
        Property: Rendering with all required data should always succeed.
        
        **Feature: automated-outreach, Property 1: Template Variable Completeness**
        **Validates: Requirements 1.4, 1.5**
        """
        manager = TemplateManager.__new__(TemplateManager)
        manager.templates = {}
        manager.templates_dir = Path(".")
        
        # Create template with standard variables
        template = MessageTemplate(
            id="test",
            name="Test",
            channel="whatsapp",
            body="Hello {{business_name}} in {{location}}!",
            variables=["business_name", "location"]
        )
        manager.templates["test"] = template
        
        result = manager.render("test", lead_data)
        
        # Should succeed because we have all required data
        assert result.success
        assert result.missing_variables == []
        assert "{{" not in result.body  # No unrendered variables


class TestTemplateValidation:
    """Tests for template validation."""
    
    def test_validate_valid_template(self):
        """Test validating a valid template."""
        manager = TemplateManager.__new__(TemplateManager)
        manager.templates = {}
        manager.templates_dir = Path(".")
        
        template = MessageTemplate(
            id="test",
            name="Test Template",
            channel="whatsapp",
            body="Hello {{business_name}}!"
        )
        
        result = manager.validate(template)
        
        assert result.valid
        assert len(result.errors) == 0
    
    def test_validate_missing_id(self):
        """Test validating template without ID."""
        manager = TemplateManager.__new__(TemplateManager)
        manager.templates = {}
        manager.templates_dir = Path(".")
        
        template = MessageTemplate(
            id="",
            name="Test",
            channel="whatsapp",
            body="Hello!"
        )
        
        result = manager.validate(template)
        
        assert not result.valid
        assert any("ID" in e for e in result.errors)
    
    def test_validate_email_without_subject(self):
        """Test that email templates without subject get a warning."""
        manager = TemplateManager.__new__(TemplateManager)
        manager.templates = {}
        manager.templates_dir = Path(".")
        
        template = MessageTemplate(
            id="test",
            name="Test",
            channel="email",
            body="Hello!"
        )
        
        result = manager.validate(template)
        
        assert result.valid  # Still valid, just has warning
        assert any("subject" in w.lower() for w in result.warnings)


class TestPropertyVariableCompleteness:
    """
    Property 1: Template Variable Completeness
    
    For any template and any lead, if the template is rendered:
    - All variables must be replaced with non-empty values, OR
    - The render must fail with a clear error listing missing variables
    
    **Validates: Requirements 1.4, 1.5, 1.6**
    """
    
    @given(
        st.lists(
            st.sampled_from(["business_name", "location", "phone", "instagram", "website"]),
            min_size=1,
            max_size=3,
            unique=True
        ),
        lead_data_strategy()
    )
    @settings(max_examples=100)
    def test_render_either_succeeds_or_reports_missing(self, required_vars, lead_data):
        """
        Property: Render either succeeds with all vars replaced, or fails with missing list.
        
        **Feature: automated-outreach, Property 1: Template Variable Completeness**
        **Validates: Requirements 1.4, 1.5, 1.6**
        """
        manager = TemplateManager.__new__(TemplateManager)
        manager.templates = {}
        manager.templates_dir = Path(".")
        
        # Build template body with required variables
        body_parts = ["Hello "]
        for var in required_vars:
            body_parts.append(f"{{{{{var}}}}}")
            body_parts.append(" ")
        body = "".join(body_parts)
        
        template = MessageTemplate(
            id="test",
            name="Test",
            channel="whatsapp",
            body=body,
            variables=required_vars
        )
        manager.templates["test"] = template
        
        result = manager.render("test", lead_data)
        
        if result.success:
            # If success, no variables should remain unrendered
            assert "{{" not in result.body
            assert result.missing_variables == []
        else:
            # If failure, must report which variables are missing
            assert len(result.missing_variables) > 0
            assert result.error is not None
            # All reported missing vars should be in the template
            for missing in result.missing_variables:
                assert missing in required_vars


# =============================================================================
# Integration Tests
# =============================================================================

class TestTemplateManagerIntegration:
    """Integration tests with actual template files."""
    
    def test_load_default_templates(self):
        """Test loading templates from default directory."""
        manager = TemplateManager()
        
        # Should have loaded some templates
        assert len(manager.templates) > 0
        
        # Should have WhatsApp initial template
        whatsapp_initial = manager.get("whatsapp_initial")
        assert whatsapp_initial is not None
        assert whatsapp_initial.channel == "whatsapp"
    
    def test_render_whatsapp_initial(self):
        """Test rendering the default WhatsApp initial template."""
        manager = TemplateManager()
        
        lead_data = {
            "name": "Barbería Juan",
            "address": "Castelar, Buenos Aires",
        }
        
        result = manager.render("whatsapp_initial", lead_data)
        
        assert result.success
        assert "Barbería Juan" in result.body
        assert "Castelar" in result.body
    
    def test_list_by_channel(self):
        """Test listing templates by channel."""
        manager = TemplateManager()
        
        whatsapp_templates = manager.list(channel="whatsapp")
        instagram_templates = manager.list(channel="instagram")
        
        assert all(t.channel == "whatsapp" for t in whatsapp_templates)
        assert all(t.channel == "instagram" for t in instagram_templates)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
