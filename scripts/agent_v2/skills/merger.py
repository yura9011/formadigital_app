"""
MergerSkill - Data Source Merging
=================================
Combines lead data from multiple sources (Harv3st, SerpApi, website scraping).
Detects duplicates, handles conflicts, and tracks data provenance.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional, Literal, Any
from datetime import datetime

logger = logging.getLogger(__name__)


# =============================================================================
# Data Classes
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


@dataclass
class MergeResult:
    """Result of merging data from multiple sources."""
    merged_data: dict
    is_duplicate: bool
    existing_id: Optional[str]  # ID of existing lead if duplicate
    data_sources: list[DataSource]
    conflicts: list[DataConflict]
    merge_notes: str


# =============================================================================
# Source Priority
# =============================================================================

# Priority order for resolving conflicts (higher = more trusted)
SOURCE_PRIORITY = {
    "harv3st": 100,
    "website_scrape": 80,
    "serpapi": 60,
    "google_search": 40,
}


# =============================================================================
# SourceMerger
# =============================================================================

class SourceMerger:
    """
    Merges lead data from multiple sources with conflict detection.
    
    Priority: Harv3st > Website Scraping > SerpApi > Google Search
    
    Heuristics:
    - Prefer non-empty over empty
    - Prefer more recent timestamp
    - Prefer higher priority source
    - Prefer more specific (full URL over handle)
    """
    
    def __init__(self, source_priority: Optional[dict] = None):
        """
        Args:
            source_priority: Optional custom source priority mapping
        """
        self.source_priority = source_priority or SOURCE_PRIORITY
    
    def merge(
        self, 
        harv3st_data: Optional[dict] = None,
        serpapi_data: Optional[dict] = None,
        scraped_data: Optional[dict] = None,
        google_data: Optional[dict] = None
    ) -> MergeResult:
        """
        Merges data from multiple sources with conflict detection.
        
        Args:
            harv3st_data: Data from Harv3st scraper
            serpapi_data: Data from SerpApi Google Maps
            scraped_data: Data from website scraping
            google_data: Data from Google Search (Knowledge Graph)
            
        Returns:
            MergeResult with merged data, conflicts, source tracking
        """
        # Build sources list in priority order
        sources: list[tuple[str, dict, datetime]] = []
        now = datetime.now()
        
        if harv3st_data:
            ts = harv3st_data.get("_timestamp", now)
            sources.append(("harv3st", harv3st_data, ts))
        if scraped_data:
            ts = scraped_data.get("_timestamp", now)
            sources.append(("website_scrape", scraped_data, ts))
        if serpapi_data:
            ts = serpapi_data.get("_timestamp", now)
            sources.append(("serpapi", serpapi_data, ts))
        if google_data:
            ts = google_data.get("_timestamp", now)
            sources.append(("google_search", google_data, ts))
        
        if not sources:
            return MergeResult(
                merged_data={},
                is_duplicate=False,
                existing_id=None,
                data_sources=[],
                conflicts=[],
                merge_notes="No data sources provided"
            )
        
        # Detect conflicts
        source_pairs = [(name, data) for name, data, _ in sources]
        conflicts = self._detect_conflicts(source_pairs)
        
        # Resolve conflicts
        for conflict in conflicts:
            resolved_value, reason = self._resolve_conflict(conflict)
            conflict.resolved_value = resolved_value
            conflict.resolution_reason = reason
        
        # Build merged data
        merged_data = self._build_merged_data(sources, conflicts)
        
        # Track sources
        data_sources = self._track_sources(merged_data, source_pairs)
        
        # Generate merge notes
        notes_parts = []
        notes_parts.append(f"Merged from {len(sources)} source(s)")
        if conflicts:
            notes_parts.append(f"{len(conflicts)} conflict(s) resolved")
        merge_notes = ". ".join(notes_parts)
        
        return MergeResult(
            merged_data=merged_data,
            is_duplicate=False,  # Duplicate detection is separate
            existing_id=None,
            data_sources=data_sources,
            conflicts=conflicts,
            merge_notes=merge_notes
        )
    
    def _build_merged_data(
        self, 
        sources: list[tuple[str, dict, datetime]],
        conflicts: list[DataConflict]
    ) -> dict:
        """
        Build merged data dictionary from sources.
        
        Priority: Harv3st > Website Scraping > SerpApi > Google Search
        For conflicts, use resolved value.
        """
        merged = {}
        conflict_fields = {c.field for c in conflicts}
        
        # Get all fields from all sources
        all_fields = set()
        for _, data, _ in sources:
            all_fields.update(k for k in data.keys() if not k.startswith("_"))
        
        # For each field, pick value by priority
        for field_name in all_fields:
            if field_name in conflict_fields:
                # Use resolved value from conflict
                for conflict in conflicts:
                    if conflict.field == field_name:
                        merged[field_name] = conflict.resolved_value
                        break
            else:
                # Pick first non-empty value by priority
                for source_name, data, _ in sources:
                    value = data.get(field_name)
                    if value is not None and value != "":
                        merged[field_name] = value
                        break
        
        return merged
    
    def detect_duplicate(
        self, 
        new_lead: dict, 
        existing_leads: list[dict]
    ) -> tuple[bool, Optional[str]]:
        """
        Detect if new_lead is a duplicate of an existing lead.
        
        Uses placeId as primary identifier.
        Falls back to name+address hash if placeId missing.
        
        Args:
            new_lead: New lead data to check
            existing_leads: List of existing leads
            
        Returns:
            Tuple of (is_duplicate, existing_lead_id or None)
        """
        if not existing_leads:
            return False, None
        
        new_place_id = new_lead.get("place_id") or new_lead.get("placeId")
        
        # Primary check: placeId match
        if new_place_id:
            for existing in existing_leads:
                existing_place_id = existing.get("place_id") or existing.get("placeId")
                if existing_place_id and existing_place_id == new_place_id:
                    existing_id = existing.get("id") or existing.get("place_id")
                    logger.info(f"Duplicate detected by placeId: {new_place_id}")
                    return True, existing_id
        
        # Fallback: name + address hash
        new_fingerprint = self._generate_fingerprint(new_lead)
        if new_fingerprint:
            for existing in existing_leads:
                existing_fingerprint = self._generate_fingerprint(existing)
                if existing_fingerprint and existing_fingerprint == new_fingerprint:
                    existing_id = existing.get("id") or existing.get("place_id")
                    logger.info(f"Duplicate detected by fingerprint: {new_fingerprint}")
                    return True, existing_id
        
        return False, None
    
    def _generate_fingerprint(self, lead: dict) -> Optional[str]:
        """
        Generate a fingerprint from name + address for fallback duplicate detection.
        
        Returns:
            Normalized fingerprint string or None if insufficient data
        """
        name = lead.get("name", "").lower().strip()
        address = lead.get("address", "").lower().strip()
        
        if not name:
            return None
        
        # Normalize: remove common words, punctuation, extra spaces
        import re
        name = re.sub(r'[^\w\s]', '', name)
        address = re.sub(r'[^\w\s]', '', address)
        
        # Create fingerprint
        fingerprint = f"{name}|{address}"
        return fingerprint if name else None
    
    def _detect_conflicts(
        self, 
        sources: list[tuple[str, dict]]
    ) -> list[DataConflict]:
        """
        Detect fields with conflicting values across sources.
        
        Args:
            sources: List of (source_name, data_dict) tuples
            
        Returns:
            List of DataConflict objects
        """
        conflicts = []
        
        # Get all fields from all sources
        all_fields = set()
        for _, data in sources:
            all_fields.update(k for k in data.keys() if not k.startswith("_"))
        
        # Check each field for conflicts
        for field_name in all_fields:
            values_by_source = []
            
            for source_name, data in sources:
                value = data.get(field_name)
                if value is not None and value != "":
                    values_by_source.append((source_name, value))
            
            # Conflict exists if we have 2+ different non-empty values
            if len(values_by_source) >= 2:
                unique_values = set(str(v) for _, v in values_by_source)
                if len(unique_values) > 1:
                    conflicts.append(DataConflict(
                        field=field_name,
                        values=values_by_source,
                        resolved_value=None,
                        resolution_reason=None
                    ))
                    logger.debug(f"Conflict detected for field '{field_name}': {values_by_source}")
        
        return conflicts
    
    def _resolve_conflict(self, conflict: DataConflict) -> tuple[Any, str]:
        """
        Resolve a conflict using heuristics.
        
        Heuristics:
        1. Prefer non-empty over empty
        2. Prefer higher priority source
        3. Prefer more specific value (longer strings, full URLs)
        
        Returns:
            Tuple of (resolved_value, resolution_reason)
        """
        if not conflict.values:
            return None, "No values to resolve"
        
        if len(conflict.values) == 1:
            return conflict.values[0][1], "Single value available"
        
        # Filter out empty values
        non_empty = [(src, val) for src, val in conflict.values 
                     if val is not None and val != ""]
        
        if not non_empty:
            return None, "All values empty"
        
        if len(non_empty) == 1:
            return non_empty[0][1], "Only one non-empty value"
        
        # Sort by source priority (highest first)
        sorted_by_priority = sorted(
            non_empty, 
            key=lambda x: self.source_priority.get(x[0], 0),
            reverse=True
        )
        
        # Check if highest priority source has a value
        best_source, best_value = sorted_by_priority[0]
        second_source, second_value = sorted_by_priority[1]
        
        # Heuristic: prefer more specific value (longer string, full URL)
        if isinstance(best_value, str) and isinstance(second_value, str):
            # If second value is significantly more specific, prefer it
            if len(second_value) > len(best_value) * 1.5:
                # But only if priority difference isn't too large
                priority_diff = (self.source_priority.get(best_source, 0) - 
                               self.source_priority.get(second_source, 0))
                if priority_diff < 30:  # Allow override if sources are close in priority
                    return second_value, f"More specific value from {second_source}"
        
        return best_value, f"Higher priority source: {best_source}"
    
    def _track_sources(
        self, 
        merged_data: dict, 
        sources: list[tuple[str, dict]]
    ) -> list[DataSource]:
        """
        Track which source provided each field in merged data.
        
        Returns:
            List of DataSource objects
        """
        data_sources = []
        now = datetime.now()
        
        for field_name, merged_value in merged_data.items():
            # Find which source provided this value
            for source_name, data in sources:
                value = data.get(field_name)
                if value == merged_value and value is not None:
                    timestamp = data.get("_timestamp", now)
                    data_sources.append(DataSource(
                        field=field_name,
                        source=source_name,
                        value=value,
                        timestamp=timestamp
                    ))
                    break
        
        return data_sources


# Quick test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    merger = SourceMerger()
    print("SourceMerger created")
    print(f"Source priority: {merger.source_priority}")
    
    print("\n✅ Merger skill initialized successfully")
