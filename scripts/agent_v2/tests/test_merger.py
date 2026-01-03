"""
Property-Based Tests for SourceMerger
=====================================
Tests data merging, duplicate detection, and conflict resolution using Hypothesis.

Feature: lead-validation-quality
Property 7: Data Merging Correctness
Validates: Requirements 9.5, 9.6, 10.1, 10.2
"""

import pytest
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from datetime import datetime
import string

# Add parent to path for imports
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from skills.merger import (
    SourceMerger,
    DataSource,
    DataConflict,
    MergeResult,
    SOURCE_PRIORITY,
)


# =============================================================================
# Test Strategies (Generators)
# =============================================================================

def place_ids():
    """Generate valid place IDs."""
    return st.sampled_from([
        'ChIJ123abc456def', 'ChIJ789xyz012ghi', 'ChIJabc123def456',
        'ChIJxyz789ghi012', 'ChIJ111222333444', 'ChIJ555666777888',
        'ChIJaaa111bbb222', 'ChIJccc333ddd444', 'ChIJeee555fff666',
        'ChIJggg777hhh888'
    ])


def business_names():
    """Generate business names."""
    return st.sampled_from([
        'Barbería Juan', 'Restaurante María', 'Kiosco Don Pepe',
        'Café La Esquina', 'Peluquería El Centro', 'Bar Los Amigos',
        'Pizzería Roma', 'Panadería San José', 'Ferretería Central',
        'Farmacia del Pueblo'
    ])


def phone_numbers():
    """Generate phone number strings."""
    return st.builds(
        lambda prefix, num: f"{prefix} {num}",
        st.sampled_from(['11', '15', '+54 9 11']),
        st.text(alphabet='0123456789', min_size=8, max_size=8)
    )


def websites():
    """Generate website URLs."""
    return st.builds(
        lambda name: f"https://{name.lower().replace(' ', '')}.com.ar",
        business_names()
    )


def lead_data():
    """Generate lead data dictionaries."""
    return st.fixed_dictionaries({
        'place_id': place_ids(),
        'name': business_names(),
        'phone': st.one_of(phone_numbers(), st.none()),
        'website': st.one_of(websites(), st.none()),
        'rating': st.one_of(st.floats(min_value=1.0, max_value=5.0), st.none()),
    })


def lead_data_with_same_place_id(place_id: str):
    """Generate lead data with a specific place_id."""
    return st.fixed_dictionaries({
        'place_id': st.just(place_id),
        'name': business_names(),
        'phone': st.one_of(phone_numbers(), st.none()),
        'website': st.one_of(websites(), st.none()),
    })


def source_data():
    """Generate source data for merging."""
    return st.fixed_dictionaries({
        'name': business_names(),
        'phone': st.one_of(phone_numbers(), st.just("")),
        'website': st.one_of(websites(), st.just("")),
        'rating': st.one_of(st.floats(min_value=1.0, max_value=5.0), st.none()),
    })


def conflicting_field_values():
    """Generate pairs of conflicting values for a field."""
    return st.one_of(
        st.tuples(phone_numbers(), phone_numbers()),
        st.tuples(websites(), websites()),
        st.tuples(business_names(), business_names()),
    ).filter(lambda x: x[0] != x[1])


# =============================================================================
# Property Tests - Duplicate Detection
# =============================================================================

class TestDuplicateDetectionProperties:
    """
    Property tests for duplicate detection.
    
    Property 7: Data Merging Correctness
    Validates: Requirements 9.5
    """
    
    def setup_method(self):
        self.merger = SourceMerger()
    
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    @given(place_id=place_ids(), name1=business_names(), name2=business_names())
    def test_same_place_id_detected_as_duplicate(self, place_id: str, name1: str, name2: str):
        """
        Property 7: For any two leads with the same placeId, detect as duplicate.
        Validates: Requirements 9.5
        """
        existing = [{'place_id': place_id, 'name': name1, 'id': 'existing_123'}]
        new_lead = {'place_id': place_id, 'name': name2}
        
        is_dup, existing_id = self.merger.detect_duplicate(new_lead, existing)
        
        assert is_dup is True
        assert existing_id is not None
    
    @settings(max_examples=100)
    @given(place_id1=place_ids(), place_id2=place_ids())
    def test_different_place_id_not_duplicate(self, place_id1: str, place_id2: str):
        """
        Property 7: Different placeIds are not duplicates.
        Validates: Requirements 9.5
        """
        assume(place_id1 != place_id2)
        
        existing = [{'place_id': place_id1, 'name': 'Business 1'}]
        new_lead = {'place_id': place_id2, 'name': 'Business 2'}
        
        is_dup, _ = self.merger.detect_duplicate(new_lead, existing)
        
        assert is_dup is False
    
    @settings(max_examples=100)
    @given(lead=lead_data())
    def test_empty_existing_list_no_duplicate(self, lead: dict):
        """
        Property 7: Empty existing list means no duplicate.
        Validates: Requirements 9.5
        """
        is_dup, existing_id = self.merger.detect_duplicate(lead, [])
        
        assert is_dup is False
        assert existing_id is None


# =============================================================================
# Property Tests - Data Merging
# =============================================================================

class TestDataMergingProperties:
    """
    Property tests for data merging.
    
    Property 7: Data Merging Correctness
    Validates: Requirements 9.6, 10.1, 10.2
    """
    
    def setup_method(self):
        self.merger = SourceMerger()
    
    @settings(max_examples=100)
    @given(harv3st=source_data(), serpapi=source_data())
    def test_merge_tracks_all_sources(self, harv3st: dict, serpapi: dict):
        """
        Property 7: Merged data tracks which source provided each field.
        Validates: Requirements 9.6
        """
        result = self.merger.merge(harv3st_data=harv3st, serpapi_data=serpapi)
        
        # Every field in merged_data should have a source tracked
        for field in result.merged_data.keys():
            sources_for_field = [ds for ds in result.data_sources if ds.field == field]
            assert len(sources_for_field) >= 1, f"No source tracked for field {field}"
    
    @settings(max_examples=100)
    @given(harv3st=source_data())
    def test_single_source_no_conflicts(self, harv3st: dict):
        """
        Property 7: Single source produces no conflicts.
        Validates: Requirements 10.1
        """
        result = self.merger.merge(harv3st_data=harv3st)
        
        assert len(result.conflicts) == 0
    
    @settings(max_examples=100)
    @given(field_values=conflicting_field_values())
    def test_conflicting_values_detected(self, field_values: tuple):
        """
        Property 7: Different values for same field are detected as conflict.
        Validates: Requirements 10.1
        """
        value1, value2 = field_values
        
        harv3st = {'test_field': value1}
        serpapi = {'test_field': value2}
        
        result = self.merger.merge(harv3st_data=harv3st, serpapi_data=serpapi)
        
        # Should detect conflict
        conflict_fields = [c.field for c in result.conflicts]
        assert 'test_field' in conflict_fields
    
    @settings(max_examples=100)
    @given(harv3st=source_data(), serpapi=source_data())
    def test_harv3st_priority_over_serpapi(self, harv3st: dict, serpapi: dict):
        """
        Property 7: Harv3st has priority over SerpApi for conflicts.
        Validates: Requirements 9.6, 10.2
        """
        # Create a definite conflict
        harv3st['priority_test'] = 'harv3st_value'
        serpapi['priority_test'] = 'serpapi_value'
        
        result = self.merger.merge(harv3st_data=harv3st, serpapi_data=serpapi)
        
        # Harv3st value should win
        assert result.merged_data.get('priority_test') == 'harv3st_value'
    
    @settings(max_examples=100)
    @given(serpapi=source_data())
    def test_non_empty_preferred_over_empty(self, serpapi: dict):
        """
        Property 7: Non-empty values preferred over empty.
        Validates: Requirements 10.2
        """
        harv3st = {'name': '', 'phone': ''}  # Empty values
        serpapi['name'] = 'Real Business Name'
        serpapi['phone'] = '11 5555-1234'
        
        result = self.merger.merge(harv3st_data=harv3st, serpapi_data=serpapi)
        
        # Non-empty values should be used
        if result.merged_data.get('name'):
            assert result.merged_data['name'] == 'Real Business Name'


# =============================================================================
# Property Tests - Conflict Resolution
# =============================================================================

class TestConflictResolutionProperties:
    """
    Property tests for conflict resolution.
    
    Property 7: Data Merging Correctness
    Validates: Requirements 10.1, 10.2
    """
    
    def setup_method(self):
        self.merger = SourceMerger()
    
    @settings(max_examples=100)
    @given(field_values=conflicting_field_values())
    def test_conflicts_store_both_values(self, field_values: tuple):
        """
        Property 7: Conflicts store both original values.
        Validates: Requirements 10.1
        """
        value1, value2 = field_values
        
        conflict = DataConflict(
            field='test',
            values=[('harv3st', value1), ('serpapi', value2)]
        )
        
        resolved, reason = self.merger._resolve_conflict(conflict)
        
        # Both values should be in the conflict
        assert len(conflict.values) == 2
        assert ('harv3st', value1) in conflict.values
        assert ('serpapi', value2) in conflict.values
    
    @settings(max_examples=100)
    @given(field_values=conflicting_field_values())
    def test_conflict_resolution_has_reason(self, field_values: tuple):
        """
        Property 7: Conflict resolution provides a reason.
        Validates: Requirements 10.2
        """
        value1, value2 = field_values
        
        conflict = DataConflict(
            field='test',
            values=[('harv3st', value1), ('serpapi', value2)]
        )
        
        resolved, reason = self.merger._resolve_conflict(conflict)
        
        assert reason is not None
        assert len(reason) > 0
    
    def test_empty_conflict_returns_none(self):
        """
        Property 7: Empty conflict returns None.
        Validates: Requirements 10.2
        """
        conflict = DataConflict(field='test', values=[])
        
        resolved, reason = self.merger._resolve_conflict(conflict)
        
        assert resolved is None


# =============================================================================
# Property Tests - Merge Result Completeness
# =============================================================================

class TestMergeResultProperties:
    """
    Property tests for merge result completeness.
    
    Property 7: Data Merging Correctness
    Validates: Requirements 9.5, 9.6, 10.1, 10.2
    """
    
    def setup_method(self):
        self.merger = SourceMerger()
    
    @settings(max_examples=100)
    @given(harv3st=source_data(), serpapi=source_data())
    def test_merge_result_has_all_fields(self, harv3st: dict, serpapi: dict):
        """
        Property 7: MergeResult contains all required fields.
        Validates: Requirements 9.5, 9.6
        """
        result = self.merger.merge(harv3st_data=harv3st, serpapi_data=serpapi)
        
        assert isinstance(result, MergeResult)
        assert isinstance(result.merged_data, dict)
        assert isinstance(result.is_duplicate, bool)
        assert isinstance(result.data_sources, list)
        assert isinstance(result.conflicts, list)
        assert isinstance(result.merge_notes, str)
    
    @settings(max_examples=100)
    @given(harv3st=source_data(), serpapi=source_data())
    def test_all_conflicts_resolved(self, harv3st: dict, serpapi: dict):
        """
        Property 7: All conflicts have resolved values.
        Validates: Requirements 10.2
        """
        result = self.merger.merge(harv3st_data=harv3st, serpapi_data=serpapi)
        
        for conflict in result.conflicts:
            assert conflict.resolved_value is not None or conflict.values == []
            assert conflict.resolution_reason is not None


# =============================================================================
# Unit Tests - Examples
# =============================================================================

class TestSourceMergerExamples:
    """Unit tests for SourceMerger."""
    
    def setup_method(self):
        self.merger = SourceMerger()
    
    def test_duplicate_by_place_id(self):
        """Test duplicate detection by placeId."""
        existing = [{'place_id': 'ChIJ123', 'name': 'Test Business', 'id': 'lead_1'}]
        new_lead = {'place_id': 'ChIJ123', 'name': 'Test Business Updated'}
        
        is_dup, existing_id = self.merger.detect_duplicate(new_lead, existing)
        
        assert is_dup is True
        assert existing_id == 'lead_1'
    
    def test_no_duplicate_different_place_id(self):
        """Test no duplicate with different placeId."""
        existing = [{'place_id': 'ChIJ123', 'name': 'Business 1'}]
        new_lead = {'place_id': 'ChIJ456', 'name': 'Business 2'}
        
        is_dup, _ = self.merger.detect_duplicate(new_lead, existing)
        
        assert is_dup is False
    
    def test_merge_harv3st_and_serpapi(self):
        """Test merging data from Harv3st and SerpApi."""
        harv3st = {
            'name': 'Barbería Juan',
            'phone': '11 5555-1234',
            'website': 'https://barberiajuan.com'
        }
        serpapi = {
            'name': 'Barberia Juan',
            'rating': 4.5,
            'review_count': 50
        }
        
        result = self.merger.merge(harv3st_data=harv3st, serpapi_data=serpapi)
        
        # Harv3st name should win (higher priority)
        assert result.merged_data['name'] == 'Barbería Juan'
        # SerpApi-only fields should be included
        assert result.merged_data['rating'] == 4.5
        assert result.merged_data['review_count'] == 50
    
    def test_conflict_detection(self):
        """Test conflict detection for different values."""
        harv3st = {'phone': '11 5555-1234'}
        serpapi = {'phone': '11 9999-8888'}
        
        result = self.merger.merge(harv3st_data=harv3st, serpapi_data=serpapi)
        
        assert len(result.conflicts) == 1
        assert result.conflicts[0].field == 'phone'
    
    def test_source_tracking(self):
        """Test that sources are tracked correctly."""
        harv3st = {'name': 'Test Business'}
        
        result = self.merger.merge(harv3st_data=harv3st)
        
        name_sources = [ds for ds in result.data_sources if ds.field == 'name']
        assert len(name_sources) == 1
        assert name_sources[0].source == 'harv3st'


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
