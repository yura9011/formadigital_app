"""
Agent V2 Skills Package
=======================
Modular skills for the local analysis agent.
"""

from .search import SearchSkill
from .scraper import ScraperSkill
from .llm import LLMSkill
from .sync import SyncSkill

# Validation skills (new)
from .validation import (
    PhoneValidatorSkill,
    InstagramFinderSkill,
    EmailFinderSkill,
    PhoneValidationResult,
    InstagramResult,
    EmailResult,
)
from .scoring import ContactabilityScorer, ContactabilityResult
from .merger import SourceMerger, MergeResult, DataSource, DataConflict

__all__ = [
    # Original skills
    "SearchSkill", 
    "ScraperSkill", 
    "LLMSkill", 
    "SyncSkill",
    # Validation skills
    "PhoneValidatorSkill",
    "InstagramFinderSkill", 
    "EmailFinderSkill",
    "PhoneValidationResult",
    "InstagramResult",
    "EmailResult",
    # Scoring
    "ContactabilityScorer",
    "ContactabilityResult",
    # Merger
    "SourceMerger",
    "MergeResult",
    "DataSource",
    "DataConflict",
]
