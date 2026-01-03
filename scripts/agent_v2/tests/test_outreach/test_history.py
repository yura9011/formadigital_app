"""
Contact History Tests
=====================
Tests for contact history tracking.

**Property 5: Contact History Completeness**
**Property 7: Status Transition Validity**
**Validates: Requirements 7.1-7.6**
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime, timedelta

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from skills.outreach.history import (
    ContactHistoryTracker,
    ContactEntry,
    ContactDirection,
    ContactStatus,
    LeadStatus,
    LeadMetrics,
    StatusTransition,
    VALID_TRANSITIONS,
)


# =============================================================================
# Contact Entry Tests
# =============================================================================

class TestContactEntry:
    """Tests for ContactEntry."""
    
    def test_create_entry(self):
        """Test creating a contact entry."""
        entry = ContactEntry(
            id="test_123",
            lead_id="lead_1",
            timestamp=datetime.now(),
            channel="whatsapp",
            direction=ContactDirection.OUTBOUND,
            message="Hello!"
        )
        
        assert entry.id == "test_123"
        assert entry.direction == ContactDirection.OUTBOUND
        assert entry.status == ContactStatus.PENDING
    
    def test_to_dict(self):
        """Test converting entry to dict."""
        entry = ContactEntry(
            id="test_123",
            lead_id="lead_1",
            timestamp=datetime.now(),
            channel="whatsapp",
            direction=ContactDirection.OUTBOUND,
            message="Hello!"
        )
        
        d = entry.to_dict()
        assert d["id"] == "test_123"
        assert d["direction"] == "outbound"
    
    def test_from_dict(self):
        """Test creating entry from dict."""
        data = {
            "id": "test_123",
            "lead_id": "lead_1",
            "timestamp": datetime.now().isoformat(),
            "channel": "instagram",
            "direction": "inbound",
            "message": "Hi!",
            "status": "responded"
        }
        
        entry = ContactEntry.from_dict(data)
        assert entry.id == "test_123"
        assert entry.direction == ContactDirection.INBOUND
        assert entry.status == ContactStatus.RESPONDED


# =============================================================================
# Contact History Tracker Tests
# =============================================================================

class TestContactHistoryTracker:
    """Tests for ContactHistoryTracker."""
    
    def test_log_outbound(self):
        """Test logging outbound contact."""
        tracker = ContactHistoryTracker()
        tracker.set_lead_status("lead_1", LeadStatus.READY)
        
        entry = tracker.log_outbound(
            lead_id="lead_1",
            channel="whatsapp",
            message="Hello!"
        )
        
        assert entry.id.startswith("contact_")
        assert entry.direction == ContactDirection.OUTBOUND
        assert tracker.get_lead_status("lead_1") == LeadStatus.CONTACTED
    
    def test_log_inbound(self):
        """Test logging inbound response."""
        tracker = ContactHistoryTracker()
        tracker.set_lead_status("lead_1", LeadStatus.CONTACTED)
        
        entry = tracker.log_inbound(
            lead_id="lead_1",
            channel="whatsapp",
            message="Yes, interested!"
        )
        
        assert entry.direction == ContactDirection.INBOUND
        assert entry.status == ContactStatus.RESPONDED
        assert tracker.get_lead_status("lead_1") == LeadStatus.RESPONDED
    
    def test_get_lead_history(self):
        """Test getting lead history."""
        tracker = ContactHistoryTracker()
        tracker.set_lead_status("lead_1", LeadStatus.READY)
        
        tracker.log_outbound("lead_1", "whatsapp", "Msg 1")
        tracker.log_outbound("lead_1", "instagram", "Msg 2")
        tracker.log_inbound("lead_1", "whatsapp", "Response")
        
        history = tracker.get_lead_history("lead_1")
        assert len(history) == 3
        
        # Filter by direction
        outbound = tracker.get_lead_history("lead_1", direction=ContactDirection.OUTBOUND)
        assert len(outbound) == 2
        
        # Filter by channel
        whatsapp = tracker.get_lead_history("lead_1", channel="whatsapp")
        assert len(whatsapp) == 2
    
    def test_calculate_metrics(self):
        """Test calculating lead metrics."""
        tracker = ContactHistoryTracker()
        tracker.set_lead_status("lead_1", LeadStatus.READY)
        
        tracker.log_outbound("lead_1", "whatsapp", "Msg 1")
        tracker.log_outbound("lead_1", "instagram", "Msg 2")
        tracker.log_inbound("lead_1", "whatsapp", "Response")
        
        metrics = tracker.calculate_metrics("lead_1")
        
        assert metrics.total_touches == 3
        assert metrics.outbound_count == 2
        assert metrics.inbound_count == 1
        assert metrics.response_rate == 0.5
        assert "whatsapp" in metrics.channels_used
        assert "instagram" in metrics.channels_used
    
    def test_calculate_metrics_empty(self):
        """Test metrics for lead with no history."""
        tracker = ContactHistoryTracker()
        
        metrics = tracker.calculate_metrics("lead_unknown")
        
        assert metrics.total_touches == 0
        assert metrics.response_rate == 0.0
    
    def test_update_status(self):
        """Test updating contact status."""
        tracker = ContactHistoryTracker()
        tracker.set_lead_status("lead_1", LeadStatus.READY)
        
        entry = tracker.log_outbound("lead_1", "whatsapp", "Hello")
        
        assert tracker.update_status(entry.id, ContactStatus.SENT)
        assert tracker._entries[entry.id].status == ContactStatus.SENT
    
    def test_transition_status(self):
        """Test status transitions."""
        tracker = ContactHistoryTracker()
        tracker.set_lead_status("lead_1", LeadStatus.READY)
        
        # Valid transition
        assert tracker.transition_status("lead_1", LeadStatus.CONTACTED, "First contact")
        assert tracker.get_lead_status("lead_1") == LeadStatus.CONTACTED
        
        # Check transition was recorded
        transitions = tracker.get_transitions("lead_1")
        assert len(transitions) == 1
        assert transitions[0].from_status == LeadStatus.READY
        assert transitions[0].to_status == LeadStatus.CONTACTED
    
    def test_invalid_transition(self):
        """Test invalid status transition."""
        tracker = ContactHistoryTracker()
        tracker.set_lead_status("lead_1", LeadStatus.READY)
        
        # Invalid: READY -> CONVERTED (must go through CONTACTED first)
        assert not tracker.transition_status("lead_1", LeadStatus.CONVERTED)
        assert tracker.get_lead_status("lead_1") == LeadStatus.READY
    
    def test_is_valid_transition(self):
        """Test transition validation."""
        tracker = ContactHistoryTracker()
        
        # Valid transitions
        assert tracker.is_valid_transition(LeadStatus.READY, LeadStatus.CONTACTED)
        assert tracker.is_valid_transition(LeadStatus.CONTACTED, LeadStatus.RESPONDED)
        assert tracker.is_valid_transition(LeadStatus.RESPONDED, LeadStatus.CONVERTED)
        
        # Invalid transitions
        assert not tracker.is_valid_transition(LeadStatus.READY, LeadStatus.CONVERTED)
        assert not tracker.is_valid_transition(LeadStatus.CONVERTED, LeadStatus.READY)
    
    def test_get_leads_by_status(self):
        """Test getting leads by status."""
        tracker = ContactHistoryTracker()
        
        tracker.set_lead_status("lead_1", LeadStatus.READY)
        tracker.set_lead_status("lead_2", LeadStatus.CONTACTED)
        tracker.set_lead_status("lead_3", LeadStatus.READY)
        
        ready_leads = tracker.get_leads_by_status(LeadStatus.READY)
        assert len(ready_leads) == 2
        assert "lead_1" in ready_leads
        assert "lead_3" in ready_leads
    
    def test_get_recent_contacts(self):
        """Test getting recent contacts."""
        tracker = ContactHistoryTracker()
        tracker.set_lead_status("lead_1", LeadStatus.READY)
        
        tracker.log_outbound("lead_1", "whatsapp", "Recent")
        
        recent = tracker.get_recent_contacts(hours=1)
        assert len(recent) == 1
    
    def test_get_stats(self):
        """Test getting overall stats."""
        tracker = ContactHistoryTracker()
        tracker.set_lead_status("lead_1", LeadStatus.READY)
        
        tracker.log_outbound("lead_1", "whatsapp", "Msg 1")
        tracker.log_inbound("lead_1", "whatsapp", "Response")
        
        stats = tracker.get_stats()
        
        assert stats["total_contacts"] == 2
        assert stats["outbound_count"] == 1
        assert stats["inbound_count"] == 1
        assert stats["response_rate"] == 1.0


# =============================================================================
# Property Tests
# =============================================================================

class TestPropertyContactHistory:
    """
    Property 5: Contact History Completeness
    
    All logged contacts must be retrievable and metrics must be accurate.
    
    **Validates: Requirements 7.1, 7.2**
    """
    
    @given(st.lists(
        st.tuples(
            st.sampled_from(["whatsapp", "instagram", "email"]),
            st.text(min_size=1, max_size=50)
        ),
        min_size=1,
        max_size=20
    ))
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_all_contacts_retrievable(self, contacts):
        """
        Property: All logged contacts can be retrieved.
        
        **Feature: automated-outreach, Property 5: Contact History Completeness**
        **Validates: Requirements 7.1, 7.2**
        """
        tracker = ContactHistoryTracker()
        tracker.set_lead_status("lead_1", LeadStatus.READY)
        
        logged_ids = []
        for channel, message in contacts:
            entry = tracker.log_outbound("lead_1", channel, message)
            logged_ids.append(entry.id)
        
        # All should be retrievable
        history = tracker.get_lead_history("lead_1")
        retrieved_ids = [e.id for e in history]
        
        for entry_id in logged_ids:
            assert entry_id in retrieved_ids
    
    @given(st.lists(
        st.booleans(),  # True = outbound, False = inbound
        min_size=1,
        max_size=30
    ))
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_metrics_accuracy(self, directions):
        """
        Property: Metrics accurately reflect contact history.
        
        **Feature: automated-outreach, Property 5: Contact History Completeness**
        **Validates: Requirements 7.4**
        """
        tracker = ContactHistoryTracker()
        tracker.set_lead_status("lead_1", LeadStatus.READY)
        
        expected_outbound = 0
        expected_inbound = 0
        
        for is_outbound in directions:
            if is_outbound:
                tracker.log_outbound("lead_1", "whatsapp", "Out")
                expected_outbound += 1
            else:
                tracker.log_inbound("lead_1", "whatsapp", "In")
                expected_inbound += 1
        
        metrics = tracker.calculate_metrics("lead_1")
        
        assert metrics.outbound_count == expected_outbound
        assert metrics.inbound_count == expected_inbound
        assert metrics.total_touches == expected_outbound + expected_inbound
        
        if expected_outbound > 0:
            expected_rate = expected_inbound / expected_outbound
            assert abs(metrics.response_rate - expected_rate) < 0.001


class TestPropertyStatusTransitions:
    """
    Property 7: Status Transition Validity
    
    Only valid status transitions should be allowed.
    
    **Validates: Requirements 7.6**
    """
    
    @given(
        st.sampled_from(list(LeadStatus)),
        st.sampled_from(list(LeadStatus))
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_only_valid_transitions_succeed(self, from_status, to_status):
        """
        Property: Only valid transitions succeed.
        
        **Feature: automated-outreach, Property 7: Status Transition Validity**
        **Validates: Requirements 7.6**
        """
        tracker = ContactHistoryTracker()
        tracker.set_lead_status("lead_1", from_status)
        
        result = tracker.transition_status("lead_1", to_status)
        
        # Check against valid transitions
        valid_targets = VALID_TRANSITIONS.get(from_status, [])
        
        if to_status in valid_targets:
            assert result, f"Valid transition {from_status} -> {to_status} should succeed"
            assert tracker.get_lead_status("lead_1") == to_status
        else:
            assert not result, f"Invalid transition {from_status} -> {to_status} should fail"
            assert tracker.get_lead_status("lead_1") == from_status
    
    @given(st.lists(
        st.sampled_from(list(LeadStatus)),
        min_size=1,
        max_size=10
    ))
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_transitions_are_recorded(self, target_statuses):
        """
        Property: All successful transitions are recorded.
        
        **Feature: automated-outreach, Property 7: Status Transition Validity**
        **Validates: Requirements 7.6**
        """
        tracker = ContactHistoryTracker()
        tracker.set_lead_status("lead_1", LeadStatus.UNVALIDATED)
        
        successful_transitions = 0
        
        for target in target_statuses:
            if tracker.transition_status("lead_1", target):
                successful_transitions += 1
        
        # All successful transitions should be recorded
        transitions = tracker.get_transitions("lead_1")
        assert len(transitions) == successful_transitions
    
    def test_terminal_states_have_no_transitions(self):
        """
        Property: Terminal states have no valid outgoing transitions.
        
        **Feature: automated-outreach, Property 7: Status Transition Validity**
        **Validates: Requirements 7.6**
        """
        # CONVERTED is terminal
        assert len(VALID_TRANSITIONS[LeadStatus.CONVERTED]) == 0
        
        tracker = ContactHistoryTracker()
        tracker.set_lead_status("lead_1", LeadStatus.CONVERTED)
        
        # No transition should succeed
        for status in LeadStatus:
            if status != LeadStatus.CONVERTED:
                assert not tracker.transition_status("lead_1", status)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
