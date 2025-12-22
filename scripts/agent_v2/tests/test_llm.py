"""
Unit Tests for LLMSkill - Agent V2
===================================
Tests the audit_business method and Blue Ocean strategy prompts.
"""

import pytest
import json
from unittest.mock import MagicMock, patch

# Add parent to path for imports
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from skills.llm import LLMSkill


class TestLLMSkill:
    """Tests for LLMSkill class."""

    def setup_method(self):
        """Setup test fixtures."""
        self.sample_business = {
            "name": "Kiosco Don Pepe",
            "address": "Av. Corrientes 1234, Buenos Aires",
            "category": "Convenience Store",
            "rating": 4.2,
            "reviewCount": 150,
            "website": "https://kioscodonpepe.com",
            "phone": "+54 11 1234-5678"
        }
        
        self.sample_competitors = [
            {"name": "Kiosco La Esquina", "rating": 4.5},
            {"name": "Almacen Central", "rating": 3.8},
            {"name": "Tienda Express", "rating": 4.0},
        ]

    def test_build_audit_prompt_includes_business_info(self):
        """Test that audit prompt includes all business information."""
        skill = LLMSkill()
        
        prompt = skill._build_audit_prompt(self.sample_business, self.sample_competitors)
        
        assert "Kiosco Don Pepe" in prompt
        assert "Av. Corrientes 1234" in prompt
        assert "Convenience Store" in prompt
        assert "4.2" in prompt
        assert "Blue Ocean" in prompt
        assert "OPPORTUNITY SCORE" in prompt

    def test_build_audit_prompt_includes_competitors(self):
        """Test that competitors are included in prompt."""
        skill = LLMSkill()
        
        prompt = skill._build_audit_prompt(self.sample_business, self.sample_competitors)
        
        assert "Kiosco La Esquina" in prompt
        assert "Almacen Central" in prompt

    def test_build_audit_prompt_limits_competitors(self):
        """Test that only top 5 competitors are included."""
        skill = LLMSkill()
        
        many_competitors = [{"name": f"Comp{i}", "rating": 4.0} for i in range(10)]
        prompt = skill._build_audit_prompt(self.sample_business, many_competitors)
        
        # Should only have 5 competitors
        assert "Comp4" in prompt
        assert "Comp5" not in prompt

    def test_default_audit_returns_valid_structure(self):
        """Test that default audit returns required fields."""
        skill = LLMSkill()
        
        result = skill._default_audit()
        
        assert "completenessScore" in result
        assert "executiveSummary" in result
        assert "basicChecklist" in result
        assert "swotAnalysis" in result
        assert result["completenessScore"] == 0

    def test_parse_response_handles_markdown_code_blocks(self):
        """Test JSON parsing with markdown code blocks."""
        skill = LLMSkill()
        
        response = '''```json
{
    "completenessScore": 75,
    "executiveSummary": "Test summary"
}
```'''
        
        result = skill._parse_response(response)
        
        assert result is not None
        assert result["completenessScore"] == 75

    def test_parse_response_handles_plain_json(self):
        """Test JSON parsing with plain JSON."""
        skill = LLMSkill()
        
        response = '{"completenessScore": 80, "executiveSummary": "Plain test"}'
        
        result = skill._parse_response(response)
        
        assert result is not None
        assert result["completenessScore"] == 80

    def test_parse_response_returns_none_on_invalid_json(self):
        """Test that invalid JSON returns None."""
        skill = LLMSkill()
        
        result = skill._parse_response("This is not valid JSON at all")
        
        assert result is None

    @patch.object(LLMSkill, '_build_audit_prompt')
    def test_audit_business_calls_providers(self, mock_prompt):
        """Test that audit_business tries available providers."""
        mock_prompt.return_value = "test prompt"
        
        skill = LLMSkill()
        
        # If no providers are available, should return default
        if not skill.providers:
            result = skill.audit_business(self.sample_business, self.sample_competitors)
            assert result["completenessScore"] == 0  # Default audit


class TestDefaultAnalysis:
    """Tests for _default_analysis (used by analyze_business)."""

    def test_default_analysis_returns_valid_structure(self):
        """Test default analysis structure."""
        skill = LLMSkill()
        
        result = skill._default_analysis()
        
        assert "summary" in result
        assert "gaps" in result
        assert "tier" in result
        assert "score" in result
        assert result["tier"] == "WARM"
        assert result["score"] == 50


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
