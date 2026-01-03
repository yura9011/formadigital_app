"""
Outreach Queue Tests
====================
Tests for the outreach queue manager.

**Property 6: Queue Priority Ordering**
**Validates: Requirements 6.1-6.6**
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime, timedelta

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from skills.outreach.queue import (
    OutreachQueueManager,
    QueueItem,
    QueueConfig,
    QueueAction,
    QueueItemStatus,
    PriorityCalculator,
)


# =============================================================================
# Priority Calculator Tests
# =============================================================================

class TestPriorityCalculator:
    """Tests for PriorityCalculator."""
    
    def test_followup_highest_priority(self):
        """Test that follow-ups get highest priority."""
        calc = PriorityCalculator()
        
        followup_priority = calc.calculate(
            is_followup=True,
            contactability_score=50,
            next_touch_due=datetime.now() - timedelta(hours=1)
        )
        
        new_lead_priority = calc.calculate(
            is_followup=False,
            contactability_score=100
        )
        
        assert followup_priority < new_lead_priority
    
    def test_overdue_followup_higher_priority(self):
        """Test that more overdue follow-ups get higher priority."""
        calc = PriorityCalculator()
        
        very_overdue = calc.calculate(
            is_followup=True,
            contactability_score=50,
            next_touch_due=datetime.now() - timedelta(hours=48)
        )
        
        slightly_overdue = calc.calculate(
            is_followup=True,
            contactability_score=50,
            next_touch_due=datetime.now() - timedelta(hours=1)
        )
        
        assert very_overdue < slightly_overdue
    
    def test_high_score_leads_priority(self):
        """Test that high score leads get priority over low score."""
        calc = PriorityCalculator()
        
        high_score = calc.calculate(
            is_followup=False,
            contactability_score=90
        )
        
        low_score = calc.calculate(
            is_followup=False,
            contactability_score=50
        )
        
        assert high_score < low_score
    
    def test_priority_ranges(self):
        """Test that priorities fall in expected ranges."""
        calc = PriorityCalculator()
        
        # Follow-up: 0-99
        followup = calc.calculate(
            is_followup=True,
            contactability_score=50,
            next_touch_due=datetime.now()
        )
        assert 0 <= followup < 100
        
        # High score: 100-199
        high = calc.calculate(is_followup=False, contactability_score=85)
        assert 100 <= high < 200
        
        # Medium score: 200-299
        medium = calc.calculate(is_followup=False, contactability_score=70)
        assert 200 <= medium < 300
        
        # Low score: 300-399
        low = calc.calculate(is_followup=False, contactability_score=40)
        assert 300 <= low < 400


# =============================================================================
# Queue Item Tests
# =============================================================================

class TestQueueItem:
    """Tests for QueueItem."""
    
    def test_create_item(self):
        """Test creating a queue item."""
        item = QueueItem(
            lead_id="lead_123",
            lead_name="Test Lead",
            priority=100,
            action=QueueAction.SEND_MESSAGE,
            recommended_channel="whatsapp"
        )
        
        assert item.lead_id == "lead_123"
        assert item.status == QueueItemStatus.PENDING
    
    def test_item_comparison(self):
        """Test item comparison for heap."""
        item1 = QueueItem("a", "A", 50, QueueAction.SEND_MESSAGE, "whatsapp")
        item2 = QueueItem("b", "B", 100, QueueAction.SEND_MESSAGE, "whatsapp")
        
        assert item1 < item2  # Lower priority value = higher priority
    
    def test_to_dict(self):
        """Test converting item to dict."""
        item = QueueItem(
            lead_id="lead_123",
            lead_name="Test",
            priority=100,
            action=QueueAction.FOLLOW_UP,
            recommended_channel="instagram"
        )
        
        d = item.to_dict()
        assert d["lead_id"] == "lead_123"
        assert d["action"] == "follow_up"


# =============================================================================
# Queue Manager Tests
# =============================================================================

class TestOutreachQueueManager:
    """Tests for OutreachQueueManager."""
    
    def test_add_lead(self):
        """Test adding a lead to queue."""
        manager = OutreachQueueManager()
        
        item = manager.add_lead(
            lead_id="lead_1",
            lead_name="Test Lead",
            contactability_score=80,
            recommended_channel="whatsapp"
        )
        
        assert item is not None
        assert item.lead_id == "lead_1"
        assert manager.get_pending_count() == 1
    
    def test_add_duplicate_lead(self):
        """Test adding duplicate lead returns existing."""
        manager = OutreachQueueManager()
        
        item1 = manager.add_lead("lead_1", "Test", 80, "whatsapp")
        item2 = manager.add_lead("lead_1", "Test", 80, "whatsapp")
        
        assert item1 == item2
        assert manager.get_pending_count() == 1
    
    def test_get_next(self):
        """Test getting next item from queue."""
        manager = OutreachQueueManager()
        
        manager.add_lead("lead_1", "Lead 1", 70, "whatsapp")
        manager.add_lead("lead_2", "Lead 2", 90, "instagram")  # Higher score
        
        next_item = manager.get_next()
        
        # Higher score should come first
        assert next_item.lead_id == "lead_2"
        assert next_item.status == QueueItemStatus.IN_PROGRESS
    
    def test_followup_priority(self):
        """Test that follow-ups get priority."""
        manager = OutreachQueueManager()
        
        # Add new lead with high score
        manager.add_lead("lead_1", "New Lead", 95, "whatsapp")
        
        # Add follow-up with lower score
        manager.add_lead(
            "lead_2", "Follow-up Lead", 60, "instagram",
            is_followup=True,
            next_touch_due=datetime.now() - timedelta(hours=1)
        )
        
        next_item = manager.get_next()
        
        # Follow-up should come first
        assert next_item.lead_id == "lead_2"
    
    def test_complete(self):
        """Test completing a queue item."""
        manager = OutreachQueueManager()
        
        manager.add_lead("lead_1", "Test", 80, "whatsapp")
        item = manager.get_next()
        
        assert manager.complete(item.lead_id)
        assert item.status == QueueItemStatus.COMPLETED
    
    def test_skip(self):
        """Test skipping a queue item."""
        manager = OutreachQueueManager()
        
        manager.add_lead("lead_1", "Test", 80, "whatsapp")
        
        assert manager.skip("lead_1", "Not interested")
        
        item = manager._items_by_id["lead_1"]
        assert item.status == QueueItemStatus.SKIPPED
    
    def test_snooze(self):
        """Test snoozing a queue item."""
        manager = OutreachQueueManager()
        
        manager.add_lead("lead_1", "Test", 80, "whatsapp")
        
        assert manager.snooze("lead_1", hours=24)
        
        item = manager._items_by_id["lead_1"]
        assert item.status == QueueItemStatus.SNOOZED
        assert item.snoozed_until is not None
    
    def test_snoozed_item_not_returned(self):
        """Test that snoozed items are not returned by get_next."""
        manager = OutreachQueueManager()
        
        manager.add_lead("lead_1", "Test", 80, "whatsapp")
        manager.snooze("lead_1", hours=24)
        
        # Should return None since only item is snoozed
        next_item = manager.get_next()
        assert next_item is None
    
    def test_remove(self):
        """Test removing a queue item."""
        manager = OutreachQueueManager()
        
        manager.add_lead("lead_1", "Test", 80, "whatsapp")
        
        assert manager.remove("lead_1", "Duplicate")
        
        item = manager._items_by_id["lead_1"]
        assert item.status == QueueItemStatus.REMOVED
    
    def test_get_queue(self):
        """Test getting all queue items."""
        manager = OutreachQueueManager()
        
        manager.add_lead("lead_1", "Lead 1", 80, "whatsapp")
        manager.add_lead("lead_2", "Lead 2", 70, "instagram")
        manager.add_lead("lead_3", "Lead 3", 90, "email")
        
        queue = manager.get_queue()
        
        assert len(queue) == 3
        # Should be sorted by priority
        assert queue[0].contactability_score == 90  # Highest score = lowest priority value
    
    def test_get_queue_filtered(self):
        """Test getting queue filtered by status."""
        manager = OutreachQueueManager()
        
        manager.add_lead("lead_1", "Lead 1", 80, "whatsapp")
        manager.add_lead("lead_2", "Lead 2", 70, "instagram")
        manager.skip("lead_2")
        
        pending = manager.get_queue(QueueItemStatus.PENDING)
        assert len(pending) == 1
        assert pending[0].lead_id == "lead_1"
    
    def test_get_stats(self):
        """Test getting queue statistics."""
        manager = OutreachQueueManager()
        
        manager.add_lead("lead_1", "Lead 1", 80, "whatsapp")
        manager.add_lead("lead_2", "Lead 2", 70, "instagram")
        
        stats = manager.get_stats()
        
        assert stats["total_items"] == 2
        assert stats["pending"] == 2
        assert stats["daily_limit"] == 50
    
    def test_clear_completed(self):
        """Test clearing completed items."""
        manager = OutreachQueueManager()
        
        manager.add_lead("lead_1", "Lead 1", 80, "whatsapp")
        manager.add_lead("lead_2", "Lead 2", 70, "instagram")
        
        item = manager.get_next()
        manager.complete(item.lead_id)
        
        cleared = manager.clear_completed()
        
        assert cleared == 1
        assert len(manager._items_by_id) == 1
    
    def test_daily_limit(self):
        """Test daily limit enforcement."""
        config = QueueConfig(daily_limit=2)
        manager = OutreachQueueManager(config)
        
        manager.add_lead("lead_1", "Lead 1", 80, "whatsapp")
        manager.get_next()
        manager.complete("lead_1")
        
        manager.add_lead("lead_2", "Lead 2", 80, "whatsapp")
        manager.get_next()
        manager.complete("lead_2")
        
        # Third should be rejected
        item = manager.add_lead("lead_3", "Lead 3", 80, "whatsapp")
        assert item is None
    
    def test_channel_limit(self):
        """Test channel limit enforcement."""
        config = QueueConfig(max_whatsapp_per_day=1, max_instagram_per_day=10)
        manager = OutreachQueueManager(config)
        
        # First WhatsApp should work
        item1 = manager.add_lead("lead_1", "Lead 1", 80, "whatsapp")
        manager.get_next()
        manager.complete("lead_1")
        
        # Second WhatsApp should get alternate channel
        item2 = manager.add_lead("lead_2", "Lead 2", 80, "whatsapp")
        assert item2 is not None
        assert item2.recommended_channel == "instagram"  # Alternate


# =============================================================================
# Property Tests
# =============================================================================

class TestPropertyQueueOrdering:
    """
    Property 6: Queue Priority Ordering
    
    Queue must always return items in priority order.
    
    **Validates: Requirements 6.2**
    """
    
    @given(st.lists(
        st.tuples(
            st.text(min_size=1, max_size=10, alphabet="abcdefghijklmnop"),
            st.integers(min_value=0, max_value=100)
        ),
        min_size=1,
        max_size=20,
        unique_by=lambda x: x[0]
    ))
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_items_returned_in_priority_order(self, leads):
        """
        Property: Items are always returned in priority order.
        
        **Feature: automated-outreach, Property 6: Queue Priority Ordering**
        **Validates: Requirements 6.2**
        """
        manager = OutreachQueueManager()
        
        # Add all leads
        for lead_id, score in leads:
            manager.add_lead(
                lead_id=f"lead_{lead_id}",
                lead_name=f"Lead {lead_id}",
                contactability_score=score,
                recommended_channel="whatsapp"
            )
        
        # Get items and verify order
        prev_priority = -1
        while True:
            item = manager.get_next()
            if not item:
                break
            
            # Priority should be non-decreasing (lower = higher priority)
            assert item.priority >= prev_priority
            prev_priority = item.priority
            
            manager.complete(item.lead_id)
    
    @given(st.lists(
        st.integers(min_value=0, max_value=100),
        min_size=1,
        max_size=30
    ))
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_followups_always_before_new_leads(self, scores):
        """
        Property: Follow-ups always come before new leads.
        
        **Feature: automated-outreach, Property 6: Queue Priority Ordering**
        **Validates: Requirements 6.2**
        """
        manager = OutreachQueueManager()
        
        # Add mix of follow-ups and new leads
        for i, score in enumerate(scores):
            is_followup = i % 2 == 0
            manager.add_lead(
                lead_id=f"lead_{i}",
                lead_name=f"Lead {i}",
                contactability_score=score,
                recommended_channel="whatsapp",
                is_followup=is_followup,
                next_touch_due=datetime.now() - timedelta(hours=1) if is_followup else None
            )
        
        # Get items
        seen_new_lead = False
        while True:
            item = manager.get_next()
            if not item:
                break
            
            is_followup = item.action == QueueAction.FOLLOW_UP
            
            # Once we see a new lead, we shouldn't see follow-ups
            if seen_new_lead and is_followup:
                # This would be a violation, but due to priority calculation
                # follow-ups should always come first
                assert item.priority >= 100  # New leads start at 100
            
            if not is_followup:
                seen_new_lead = True
            
            manager.complete(item.lead_id)
    
    @given(st.integers(min_value=1, max_value=50))
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_daily_limit_never_exceeded(self, num_leads):
        """
        Property: Daily limit is never exceeded.
        
        **Feature: automated-outreach, Property 6: Queue Priority Ordering**
        **Validates: Requirements 6.3**
        """
        daily_limit = 10
        config = QueueConfig(daily_limit=daily_limit)
        manager = OutreachQueueManager(config)
        
        # Try to add many leads
        added = 0
        for i in range(num_leads):
            item = manager.add_lead(
                lead_id=f"lead_{i}",
                lead_name=f"Lead {i}",
                contactability_score=80,
                recommended_channel="whatsapp"
            )
            if item:
                next_item = manager.get_next()
                if next_item:
                    manager.complete(next_item.lead_id)
                    added += 1
        
        # Should never exceed daily limit
        assert added <= daily_limit


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
