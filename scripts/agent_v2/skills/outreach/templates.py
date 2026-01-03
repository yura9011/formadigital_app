"""
Template Manager
================
Manages message templates for outreach campaigns.

Implements Requirements 1.1-1.6:
- Template storage with variables
- Variable interpolation with {{var}} syntax
- Validation of required variables
"""

import json
import re
import logging
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional, Literal

logger = logging.getLogger(__name__)


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class MessageTemplate:
    """
    Message template with variable placeholders.
    
    Variables use {{variable_name}} syntax.
    """
    id: str
    name: str
    channel: Literal["whatsapp", "instagram", "email"]
    body: str
    category: Literal["initial", "followup", "response"] = "initial"
    subject: Optional[str] = None  # For email only
    variables: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        """Extract variables from body if not provided."""
        if not self.variables:
            self.variables = TemplateManager.extract_variables(self.body)
            if self.subject:
                self.variables.extend(TemplateManager.extract_variables(self.subject))
                self.variables = list(set(self.variables))


@dataclass
class RenderedMessage:
    """Result of rendering a template with lead data."""
    template_id: str
    channel: str
    subject: Optional[str]
    body: str
    success: bool
    missing_variables: list[str] = field(default_factory=list)
    error: Optional[str] = None


@dataclass
class ValidationResult:
    """Result of template validation."""
    valid: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


# =============================================================================
# Template Manager
# =============================================================================

class TemplateManager:
    """
    Manages message templates for outreach.
    
    Features:
    - Load templates from JSON files
    - Variable extraction and interpolation
    - Template validation
    """
    
    # Standard variables available for all templates
    STANDARD_VARIABLES = [
        "business_name",
        "owner_name", 
        "location",
        "phone",
        "instagram",
        "website",
        "best_channel",
        "category",
    ]
    
    # Regex pattern for {{variable}} syntax
    VARIABLE_PATTERN = re.compile(r'\{\{(\w+)\}\}')
    
    def __init__(self, templates_dir: Optional[Path] = None):
        """
        Initialize TemplateManager.
        
        Args:
            templates_dir: Directory containing template JSON files
        """
        if templates_dir is None:
            templates_dir = Path(__file__).parent.parent.parent / "data" / "templates"
        
        self.templates_dir = Path(templates_dir)
        self.templates: dict[str, MessageTemplate] = {}
        
        # Load templates from files
        self._load_templates()
    
    def _load_templates(self):
        """Load all templates from JSON files in templates directory."""
        if not self.templates_dir.exists():
            logger.warning(f"Templates directory not found: {self.templates_dir}")
            return
        
        for json_file in self.templates_dir.glob("*.json"):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                for template_data in data.get("templates", []):
                    template = self._parse_template(template_data)
                    self.templates[template.id] = template
                    logger.debug(f"Loaded template: {template.id}")
                    
            except Exception as e:
                logger.error(f"Error loading templates from {json_file}: {e}")
        
        logger.info(f"Loaded {len(self.templates)} templates")
    
    def _parse_template(self, data: dict) -> MessageTemplate:
        """Parse template data from JSON."""
        # Handle datetime fields
        created_at = data.get("created_at")
        updated_at = data.get("updated_at")
        
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
        
        return MessageTemplate(
            id=data["id"],
            name=data["name"],
            channel=data["channel"],
            body=data["body"],
            category=data.get("category", "initial"),
            subject=data.get("subject"),
            variables=data.get("variables", []),
            created_at=created_at or datetime.now(),
            updated_at=updated_at or datetime.now(),
        )
    
    @staticmethod
    def extract_variables(text: str) -> list[str]:
        """
        Extract variable names from template text.
        
        Args:
            text: Template text with {{variable}} placeholders
            
        Returns:
            List of unique variable names found
        """
        matches = TemplateManager.VARIABLE_PATTERN.findall(text)
        return list(set(matches))
    
    def create(self, template: MessageTemplate) -> MessageTemplate:
        """
        Create a new template.
        
        Args:
            template: Template to create
            
        Returns:
            Created template
        """
        template.created_at = datetime.now()
        template.updated_at = datetime.now()
        
        # Extract variables if not set
        if not template.variables:
            template.variables = self.extract_variables(template.body)
            if template.subject:
                template.variables.extend(self.extract_variables(template.subject))
                template.variables = list(set(template.variables))
        
        self.templates[template.id] = template
        logger.info(f"Created template: {template.id}")
        
        return template
    
    def get(self, template_id: str) -> Optional[MessageTemplate]:
        """
        Get a template by ID.
        
        Args:
            template_id: Template ID
            
        Returns:
            Template if found, None otherwise
        """
        return self.templates.get(template_id)
    
    def list(self, channel: Optional[str] = None, category: Optional[str] = None) -> list[MessageTemplate]:
        """
        List templates with optional filtering.
        
        Args:
            channel: Filter by channel (whatsapp, instagram, email)
            category: Filter by category (initial, followup, response)
            
        Returns:
            List of matching templates
        """
        templates = list(self.templates.values())
        
        if channel:
            templates = [t for t in templates if t.channel == channel]
        
        if category:
            templates = [t for t in templates if t.category == category]
        
        return templates
    
    def render(self, template_id: str, lead_data: dict) -> RenderedMessage:
        """
        Render a template with lead data.
        
        Args:
            template_id: Template ID to render
            lead_data: Dictionary with lead data for variable substitution
            
        Returns:
            RenderedMessage with rendered content or error
        """
        template = self.get(template_id)
        
        if not template:
            return RenderedMessage(
                template_id=template_id,
                channel="unknown",
                subject=None,
                body="",
                success=False,
                error=f"Template not found: {template_id}"
            )
        
        # Build variable mapping from lead data
        var_mapping = self._build_variable_mapping(lead_data)
        
        # Check for missing required variables
        missing = []
        for var in template.variables:
            if var not in var_mapping or not var_mapping[var]:
                missing.append(var)
        
        if missing:
            return RenderedMessage(
                template_id=template_id,
                channel=template.channel,
                subject=template.subject,
                body=template.body,
                success=False,
                missing_variables=missing,
                error=f"Missing required variables: {', '.join(missing)}"
            )
        
        # Render body
        rendered_body = self._interpolate(template.body, var_mapping)
        
        # Render subject if present
        rendered_subject = None
        if template.subject:
            rendered_subject = self._interpolate(template.subject, var_mapping)
        
        return RenderedMessage(
            template_id=template_id,
            channel=template.channel,
            subject=rendered_subject,
            body=rendered_body,
            success=True
        )
    
    def _build_variable_mapping(self, lead_data: dict) -> dict[str, str]:
        """
        Build variable mapping from lead data.
        
        Maps standard variable names to lead data fields.
        Also accepts direct variable names (e.g., business_name) for flexibility.
        """
        return {
            # Accept both "name" and "business_name" as input
            "business_name": lead_data.get("business_name", lead_data.get("name", "")),
            "owner_name": lead_data.get("owner_name", ""),
            # Accept both "address" and "location" as input
            "location": lead_data.get("location", lead_data.get("address", "")),
            "phone": lead_data.get("phone", lead_data.get("normalized_phone", "")),
            "instagram": lead_data.get("instagram_handle", lead_data.get("instagram", "")),
            "website": lead_data.get("website", ""),
            "best_channel": lead_data.get("best_channel", ""),
            "category": lead_data.get("category", ""),
        }
    
    def _interpolate(self, text: str, var_mapping: dict[str, str]) -> str:
        """
        Replace {{variable}} placeholders with values.
        
        Args:
            text: Template text
            var_mapping: Variable name to value mapping
            
        Returns:
            Text with variables replaced
        """
        def replace_var(match):
            var_name = match.group(1)
            return var_mapping.get(var_name, match.group(0))
        
        return self.VARIABLE_PATTERN.sub(replace_var, text)
    
    def validate(self, template: MessageTemplate) -> ValidationResult:
        """
        Validate a template.
        
        Checks:
        - Required fields present
        - Variables are valid
        - Channel-specific requirements
        
        Args:
            template: Template to validate
            
        Returns:
            ValidationResult with errors and warnings
        """
        errors = []
        warnings = []
        
        # Check required fields
        if not template.id:
            errors.append("Template ID is required")
        if not template.name:
            errors.append("Template name is required")
        if not template.body:
            errors.append("Template body is required")
        if not template.channel:
            errors.append("Template channel is required")
        
        # Check channel-specific requirements
        if template.channel == "email" and not template.subject:
            warnings.append("Email templates should have a subject")
        
        # Check for unknown variables
        extracted_vars = self.extract_variables(template.body)
        if template.subject:
            extracted_vars.extend(self.extract_variables(template.subject))
        
        unknown_vars = [v for v in extracted_vars if v not in self.STANDARD_VARIABLES]
        if unknown_vars:
            warnings.append(f"Non-standard variables used: {', '.join(unknown_vars)}")
        
        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    def save_to_file(self, channel: str):
        """
        Save templates for a channel to JSON file.
        
        Args:
            channel: Channel to save (whatsapp, instagram, email)
        """
        templates = self.list(channel=channel)
        
        data = {
            "templates": [
                {
                    "id": t.id,
                    "name": t.name,
                    "channel": t.channel,
                    "category": t.category,
                    "subject": t.subject,
                    "body": t.body,
                    "variables": t.variables,
                    "created_at": t.created_at.isoformat(),
                    "updated_at": t.updated_at.isoformat(),
                }
                for t in templates
            ]
        }
        
        filepath = self.templates_dir / f"{channel}_templates.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved {len(templates)} templates to {filepath}")


# =============================================================================
# Quick Test
# =============================================================================

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    print("Testing TemplateManager...")
    
    manager = TemplateManager()
    
    # List templates
    print(f"\nLoaded {len(manager.templates)} templates:")
    for t in manager.list():
        print(f"  - {t.id}: {t.name} ({t.channel})")
    
    # Test rendering
    lead_data = {
        "name": "Barbería Juan",
        "address": "Castelar, Buenos Aires",
        "phone": "11 5555-1234",
    }
    
    result = manager.render("whatsapp_initial", lead_data)
    print(f"\nRendered message:")
    print(f"  Success: {result.success}")
    print(f"  Body:\n{result.body}")
    
    # Test with missing variable
    result2 = manager.render("whatsapp_initial", {"name": "Test"})
    print(f"\nMissing variable test:")
    print(f"  Success: {result2.success}")
    print(f"  Missing: {result2.missing_variables}")
    print(f"  Error: {result2.error}")
    
    print("\n✅ TemplateManager test complete")
