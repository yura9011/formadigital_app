"""
Outreach Queue Manager
======================
Manages the daily outreach queue with prioritization.

Implements Requirements 6.1-6.6:
- Queue items with priority and recommended actions
- Prioritization: follow-ups due > new leads by score > channel availability
- Daily limit configuration
- Channel distribution respecting rate limits
- Skip, snooze, remove actions
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, date, timedelta
from enum import Enum
from typing import Optional, Literal
import heapq

logger = logging.getLogger(__name__)


# =============================================================================
# Enums and Constants
# =============================================================================

class QueueAction(str, Enum):
    """Actions that can be taken on a queue item."""
    SEND_MESSAGE = "send_message"
    FOLLOW_UP = "follow_up"
    REVIEW = "review"


class QueueItemStatus(str, Enum):
    """Status of a queue item."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    SNOOZED = "snoozed"
    REMOVED = "removed"


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class QueueItem:
    """
    An item in the outreach queue.
    
    Represents a lead that needs to be contacted.
    """
    lead_id: str
    lead_name: str
    priority: int  # Lower = higher priority (for heap)
    action: QueueAction
    recommended_channel: Literal["whatsapp", "instagram", "email"]
    template_id: Optional[str] = None
    reason: str = ""
    contactability_score: int = 0
    sequence_position: int = 0
    next_touch_due: Optional[datetime] = None
    status: QueueItemStatus = QueueItemStatus.PENDING
    added_at: datetime = field(default_factory=datetime.now)
    snoozed_until: Optional[datetime] = None
    
    def __lt__(self, other: "QueueItem") -> bool:
        """For heap comparison - lower priority value = higher priority."""
        return self.priority < other.priority
    
    def to_dict(self) -> dict:
        return {
            "lead_id": self.lead_id,
            "lead_name": self.lead_name,
            "priority": self.priority,
            "action": self.action.value,
            "recommended_channel": self.recommended_channel,
            "template_id": self.template_id,
            "reason": self.reason,
            "contactability_score": self.contactability_score,
            "sequence_position": self.sequence_position,
            "next_touch_due": self.next_touch_due.isoformat() if self.next_touch_due else None,
            "status": self.status.value,
            "added_at": self.added_at.isoformat(),
            "snoozed_until": self.snoozed_until.isoformat() if self.snoozed_until else None,
        }


@dataclass
class QueueConfig:
    """Configuration for the outreach queue."""
    daily_limit: int = 50
    max_whatsapp_per_day: int = 30
    max_instagram_per_day: int = 20
    max_email_per_day: int = 50
    followup_priority_boost: int = 100  # Priority boost for follow-ups
    high_score_threshold: int = 80  # Score above which leads get priority


# =============================================================================
# Priority Calculator
# =============================================================================

class PriorityCalculator:
    """
    Calculates priority scores for queue items.
    
    Priority order (lower = higher priority):
    1. Follow-ups that are due (priority 0-99)
    2. New leads with high score (priority 100-199)
    3. New leads with medium score (priority 200-299)
    4. New leads with low score (priority 300-399)
    """
    
    def __init__(self, config: Optional[QueueConfig] = None):
        self.config = config or QueueConfig()
    
    def calculate(
        self,
        is_followup: bool,
        contactability_score: int,
        next_touch_due: Optional[datetime] = None,
        sequence_position: int = 0
    ) -> int:
        """
        Calculate priority for a lead.
        
        Args:
            is_followup: Whether this is a follow-up
            contactability_score: Lead's contactability score (0-100)
            next_touch_due: When the next touch is due
            sequence_position: Current position in sequence
            
        Returns:
            Priority value (lower = higher priority)
        """
        if is_followup and next_touch_due:
            # Follow-ups get highest priority
            # More overdue = higher priority
            now = datetime.now()
            if next_touch_due <= now:
                hours_overdue = (now - next_touch_due).total_seconds() / 3600
                # Cap at 99 to stay in follow-up range
                return max(0, 99 - min(int(hours_overdue), 99))
            else:
                # Not yet due, lower priority
                return 50
        
        # New leads - priority based on score
        if contactability_score >= self.config.high_score_threshold:
            # High score: 100-199
            return 100 + (100 - contactability_score)
        elif contactability_score >= 60:
            # Medium score: 200-299
            return 200 + (80 - contactability_score)
        else:
            # Low score: 300-399
            return 300 + (60 - contactability_score)


# =============================================================================
# Queue Manager
# =============================================================================

class OutreachQueueManager:
    """
    Manages the daily outreach queue.
    
    Features:
    - Add leads to queue with automatic prioritization
    - Get next lead to contact
    - Track channel distribution
    - Skip, snooze, remove items
    """
    
    def __init__(self, config: Optional[QueueConfig] = None):
        self.config = config or QueueConfig()
        self.priority_calc = PriorityCalculator(self.config)
        
        # Queue storage
        self._queue: list[QueueItem] = []  # Heap
        self._items_by_id: dict[str, QueueItem] = {}
        
        # Daily tracking
        self._daily_counts: dict[date, dict[str, int]] = {}
        self._today_processed: set[str] = set()
    
    def add_lead(
        self,
        lead_id: str,
        lead_name: str,
        contactability_score: int,
        recommended_channel: str,
        is_followup: bool = False,
        next_touch_due: Optional[datetime] = None,
        sequence_position: int = 0,
        template_id: Optional[str] = None,
        reason: str = ""
    ) -> Optional[QueueItem]:
        """
        Add a lead to the queue.
        
        Args:
            lead_id: Lead ID
            lead_name: Lead name for display
            contactability_score: Score from validation
            recommended_channel: Best channel to use
            is_followup: Whether this is a follow-up
            next_touch_due: When follow-up is due
            sequence_position: Position in sequence
            template_id: Template to use
            reason: Reason for adding
            
        Returns:
            QueueItem if added, None if rejected
        """
        # Check if already in queue
        if lead_id in self._items_by_id:
            existing = self._items_by_id[lead_id]
            if existing.status == QueueItemStatus.PENDING:
                logger.debug(f"Lead {lead_id} already in queue")
                return existing
        
        # Check daily limit
        if not self._can_add_today():
            logger.warning(f"Daily limit reached, cannot add {lead_id}")
            return None
        
        # Check channel limit
        if not self._can_add_channel(recommended_channel):
            # Try alternate channel
            alternate = self._get_alternate_channel(recommended_channel)
            if alternate and self._can_add_channel(alternate):
                recommended_channel = alternate
            else:
                logger.warning(f"Channel limits reached for {lead_id}")
                return None
        
        # Calculate priority
        priority = self.priority_calc.calculate(
            is_followup=is_followup,
            contactability_score=contactability_score,
            next_touch_due=next_touch_due,
            sequence_position=sequence_position
        )
        
        # Determine action
        action = QueueAction.FOLLOW_UP if is_followup else QueueAction.SEND_MESSAGE
        
        # Create item
        item = QueueItem(
            lead_id=lead_id,
            lead_name=lead_name,
            priority=priority,
            action=action,
            recommended_channel=recommended_channel,
            template_id=template_id,
            reason=reason or ("Follow-up due" if is_followup else "New lead"),
            contactability_score=contactability_score,
            sequence_position=sequence_position,
            next_touch_due=next_touch_due,
        )
        
        # Add to queue
        heapq.heappush(self._queue, item)
        self._items_by_id[lead_id] = item
        
        logger.info(f"Added {lead_id} to queue with priority {priority}")
        
        return item
    
    def get_next(self) -> Optional[QueueItem]:
        """
        Get the next lead to contact.
        
        Returns:
            Next QueueItem or None if queue empty
        """
        while self._queue:
            item = heapq.heappop(self._queue)
            
            # Skip if not pending
            if item.status != QueueItemStatus.PENDING:
                continue
            
            # Skip if snoozed
            if item.snoozed_until and item.snoozed_until > datetime.now():
                # Re-add to queue
                heapq.heappush(self._queue, item)
                continue
            
            # Mark as in progress
            item.status = QueueItemStatus.IN_PROGRESS
            
            return item
        
        return None
    
    def peek_next(self) -> Optional[QueueItem]:
        """Peek at next item without removing."""
        for item in sorted(self._queue):
            if item.status == QueueItemStatus.PENDING:
                if not item.snoozed_until or item.snoozed_until <= datetime.now():
                    return item
        return None
    
    def complete(self, lead_id: str) -> bool:
        """
        Mark a queue item as completed.
        
        Args:
            lead_id: Lead ID
            
        Returns:
            True if marked successfully
        """
        item = self._items_by_id.get(lead_id)
        if not item:
            return False
        
        item.status = QueueItemStatus.COMPLETED
        self._record_processed(lead_id, item.recommended_channel)
        
        logger.info(f"Completed queue item for {lead_id}")
        return True
    
    def skip(self, lead_id: str, reason: str = "") -> bool:
        """
        Skip a queue item.
        
        Args:
            lead_id: Lead ID
            reason: Reason for skipping
            
        Returns:
            True if skipped successfully
        """
        item = self._items_by_id.get(lead_id)
        if not item:
            return False
        
        item.status = QueueItemStatus.SKIPPED
        if reason:
            item.reason = f"Skipped: {reason}"
        
        logger.info(f"Skipped queue item for {lead_id}: {reason}")
        return True
    
    def snooze(self, lead_id: str, hours: int = 24) -> bool:
        """
        Snooze a queue item.
        
        Args:
            lead_id: Lead ID
            hours: Hours to snooze
            
        Returns:
            True if snoozed successfully
        """
        item = self._items_by_id.get(lead_id)
        if not item:
            return False
        
        item.status = QueueItemStatus.SNOOZED
        item.snoozed_until = datetime.now() + timedelta(hours=hours)
        
        # Re-add to queue with updated status
        if item not in self._queue:
            heapq.heappush(self._queue, item)
        
        logger.info(f"Snoozed queue item for {lead_id} until {item.snoozed_until}")
        return True
    
    def remove(self, lead_id: str, reason: str = "") -> bool:
        """
        Remove a lead from the queue.
        
        Args:
            lead_id: Lead ID
            reason: Reason for removal
            
        Returns:
            True if removed successfully
        """
        item = self._items_by_id.get(lead_id)
        if not item:
            return False
        
        item.status = QueueItemStatus.REMOVED
        if reason:
            item.reason = f"Removed: {reason}"
        
        logger.info(f"Removed queue item for {lead_id}: {reason}")
        return True
    
    def get_queue(self, status: Optional[QueueItemStatus] = None) -> list[QueueItem]:
        """
        Get all items in queue.
        
        Args:
            status: Filter by status (None = all)
            
        Returns:
            List of QueueItems sorted by priority
        """
        items = list(self._items_by_id.values())
        
        if status:
            items = [i for i in items if i.status == status]
        
        return sorted(items, key=lambda x: x.priority)
    
    def get_pending_count(self) -> int:
        """Get count of pending items."""
        return sum(1 for i in self._items_by_id.values() if i.status == QueueItemStatus.PENDING)
    
    def get_stats(self) -> dict:
        """Get queue statistics."""
        today = date.today()
        counts = self._daily_counts.get(today, {})
        
        status_counts = {}
        for item in self._items_by_id.values():
            status_counts[item.status.value] = status_counts.get(item.status.value, 0) + 1
        
        channel_counts = {}
        for item in self._items_by_id.values():
            if item.status == QueueItemStatus.PENDING:
                ch = item.recommended_channel
                channel_counts[ch] = channel_counts.get(ch, 0) + 1
        
        return {
            "total_items": len(self._items_by_id),
            "pending": self.get_pending_count(),
            "daily_limit": self.config.daily_limit,
            "processed_today": len(self._today_processed),
            "by_status": status_counts,
            "by_channel": channel_counts,
            "channel_counts_today": counts,
        }
    
    def clear_completed(self) -> int:
        """
        Clear completed items from queue.
        
        Returns:
            Number of items cleared
        """
        to_remove = [
            lead_id for lead_id, item in self._items_by_id.items()
            if item.status in [QueueItemStatus.COMPLETED, QueueItemStatus.REMOVED]
        ]
        
        for lead_id in to_remove:
            del self._items_by_id[lead_id]
        
        # Rebuild heap
        self._queue = [i for i in self._queue if i.lead_id in self._items_by_id]
        heapq.heapify(self._queue)
        
        return len(to_remove)
    
    def reset_daily(self) -> None:
        """Reset daily counters."""
        self._today_processed.clear()
        today = date.today()
        self._daily_counts[today] = {}
    
    # -------------------------------------------------------------------------
    # Private Methods
    # -------------------------------------------------------------------------
    
    def _can_add_today(self) -> bool:
        """Check if we can add more items today."""
        return len(self._today_processed) < self.config.daily_limit
    
    def _can_add_channel(self, channel: str) -> bool:
        """Check if we can add more items for this channel."""
        today = date.today()
        counts = self._daily_counts.get(today, {})
        current = counts.get(channel, 0)
        
        limits = {
            "whatsapp": self.config.max_whatsapp_per_day,
            "instagram": self.config.max_instagram_per_day,
            "email": self.config.max_email_per_day,
        }
        
        return current < limits.get(channel, 50)
    
    def _get_alternate_channel(self, channel: str) -> Optional[str]:
        """Get an alternate channel if primary is at limit."""
        order = ["whatsapp", "instagram", "email"]
        
        for alt in order:
            if alt != channel and self._can_add_channel(alt):
                return alt
        
        return None
    
    def _record_processed(self, lead_id: str, channel: str) -> None:
        """Record a processed item."""
        self._today_processed.add(lead_id)
        
        today = date.today()
        if today not in self._daily_counts:
            self._daily_counts[today] = {}
        
        self._daily_counts[today][channel] = self._daily_counts[today].get(channel, 0) + 1


# =============================================================================
# Quick Test
# =============================================================================

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    print("Testing OutreachQueueManager...")
    
    manager = OutreachQueueManager()
    
    # Add some leads
    manager.add_lead(
        lead_id="lead_1",
        lead_name="Barbería Juan",
        contactability_score=85,
        recommended_channel="whatsapp",
        reason="High score lead"
    )
    
    manager.add_lead(
        lead_id="lead_2",
        lead_name="Peluquería María",
        contactability_score=65,
        recommended_channel="instagram",
        is_followup=True,
        next_touch_due=datetime.now() - timedelta(hours=2),
        sequence_position=2
    )
    
    manager.add_lead(
        lead_id="lead_3",
        lead_name="Spa Relax",
        contactability_score=70,
        recommended_channel="email"
    )
    
    # Get queue
    print(f"\nQueue stats: {manager.get_stats()}")
    
    # Get next items
    print("\nProcessing queue:")
    while True:
        item = manager.get_next()
        if not item:
            break
        print(f"  - {item.lead_name} (priority: {item.priority}, channel: {item.recommended_channel})")
        manager.complete(item.lead_id)
    
    print(f"\nFinal stats: {manager.get_stats()}")
    
    print("\n✅ OutreachQueueManager test complete")
