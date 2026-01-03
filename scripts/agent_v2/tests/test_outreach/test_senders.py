"""
Channel Senders Tests
=====================
Tests for WhatsApp, Instagram, and Email senders.

**Property 4: Rate Limit Enforcement**
**Validates: Requirements 3.1-3.6, 4.1-4.6, 5.1-5.4**
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from skills.outreach.senders import (
    WhatsAppSender,
    InstagramSender,
    EmailSender,
    SenderManager,
    RateLimiter,
    RateLimitConfig,
    MessageTracker,
    SendResult,
)


# =============================================================================
# WhatsApp Sender Tests
# =============================================================================

class TestWhatsAppSender:
    """Tests for WhatsAppSender."""
    
    def test_prepare_valid_phone(self):
        """Test preparing message with valid phone."""
        sender = WhatsAppSender()
        result = sender.prepare("11 5555-1234", "Hola!")
        
        assert result.success
        assert result.channel == "whatsapp"
        assert result.link is not None
        assert "wa.me" in result.link
        assert result.status == "pending_confirmation"
        assert result.message_id.startswith("wa_")
    
    def test_prepare_invalid_phone(self):
        """Test preparing message with invalid phone."""
        sender = WhatsAppSender()
        result = sender.prepare("123", "Hola!")
        
        assert not result.success
        assert "Invalid phone" in result.error
    
    def test_generate_link_format(self):
        """Test WhatsApp link format."""
        sender = WhatsAppSender()
        link = sender.generate_link("5491155551234", "Hola mundo")
        
        assert link.startswith("https://wa.me/5491155551234")
        assert "text=" in link
        assert "Hola" in link
    
    def test_phone_normalization_argentine(self):
        """Test Argentine phone number normalization."""
        sender = WhatsAppSender()
        
        # Various Argentine formats
        test_cases = [
            ("11 5555-1234", "5491155551234"),
            ("15 5555-1234", "5491155551234"),
            ("+54 9 11 5555-1234", "5491155551234"),
            ("5491155551234", "5491155551234"),
        ]
        
        for input_phone, expected in test_cases:
            result = sender.prepare(input_phone, "Test")
            if result.success:
                assert expected in result.link, f"Failed for {input_phone}"
    
    def test_confirm_sent(self):
        """Test confirming message sent."""
        sender = WhatsAppSender()
        result = sender.prepare("11 5555-1234", "Hola!")
        
        assert sender.confirm_sent(result.message_id)
        
        # Check status updated
        tracked = sender.tracker.get(result.message_id)
        assert tracked.status == "sent"
    
    def test_mark_failed(self):
        """Test marking message as failed."""
        sender = WhatsAppSender()
        result = sender.prepare("11 5555-1234", "Hola!")
        
        assert sender.mark_failed(result.message_id, "User blocked")
        
        tracked = sender.tracker.get(result.message_id)
        assert tracked.status == "failed"
        assert tracked.error == "User blocked"
    
    def test_get_pending(self):
        """Test getting pending messages."""
        sender = WhatsAppSender()
        
        # Prepare multiple messages
        sender.prepare("11 5555-1234", "Msg 1")
        result2 = sender.prepare("11 5555-5678", "Msg 2")
        sender.prepare("11 5555-9012", "Msg 3")
        
        # Confirm one
        sender.confirm_sent(result2.message_id)
        
        pending = sender.get_pending()
        assert len(pending) == 2


# =============================================================================
# Instagram Sender Tests
# =============================================================================

class TestInstagramSender:
    """Tests for InstagramSender."""
    
    def test_prepare_valid_handle(self):
        """Test preparing DM with valid handle."""
        sender = InstagramSender()
        result = sender.prepare("barberia_juan", "Hola!")
        
        assert result.success
        assert result.channel == "instagram"
        assert result.link == "https://instagram.com/barberia_juan"
        assert result.prepared_message == "Hola!"
        assert result.message_id.startswith("ig_")
    
    def test_prepare_handle_with_at(self):
        """Test handle with @ symbol."""
        sender = InstagramSender()
        result = sender.prepare("@barberia_juan", "Hola!")
        
        assert result.success
        assert "barberia_juan" in result.link
        assert "@" not in result.link
    
    def test_prepare_full_url(self):
        """Test extracting handle from full URL."""
        sender = InstagramSender()
        result = sender.prepare("https://instagram.com/barberia_juan", "Hola!")
        
        assert result.success
        assert result.link == "https://instagram.com/barberia_juan"
    
    def test_prepare_invalid_handle(self):
        """Test invalid handle."""
        sender = InstagramSender()
        result = sender.prepare("", "Hola!")
        
        assert not result.success
        assert "Invalid Instagram handle" in result.error
    
    def test_confirm_sent(self):
        """Test confirming DM sent."""
        sender = InstagramSender()
        result = sender.prepare("test_user", "Hola!")
        
        assert sender.confirm_sent(result.message_id)
        
        tracked = sender.tracker.get(result.message_id)
        assert tracked.status == "sent"


# =============================================================================
# Email Sender Tests
# =============================================================================

class TestEmailSender:
    """Tests for EmailSender."""
    
    def test_prepare_valid_email(self):
        """Test preparing email."""
        sender = EmailSender()
        result = sender.prepare(
            "test@example.com",
            "Propuesta",
            "Hola, te contacto..."
        )
        
        assert result.success
        assert result.channel == "email"
        assert result.message_id.startswith("em_")
        assert "Subject: Propuesta" in result.prepared_message
    
    def test_prepare_invalid_email(self):
        """Test invalid email address."""
        sender = EmailSender()
        result = sender.prepare("not-an-email", "Subject", "Body")
        
        assert not result.success
        assert "Invalid email" in result.error
    
    def test_is_configured(self):
        """Test SMTP configuration check."""
        sender = EmailSender()
        assert not sender.is_configured()
    
    def test_send_without_config(self):
        """Test sending without SMTP config."""
        sender = EmailSender()
        result = sender.send("test@example.com", "Subject", "Body")
        
        assert not result.success
        assert "not configured" in result.error


# =============================================================================
# Rate Limiter Tests
# =============================================================================

class TestRateLimiter:
    """Tests for RateLimiter."""
    
    def test_can_send_initially(self):
        """Test can send when no messages sent."""
        limiter = RateLimiter()
        can_send, reason = limiter.can_send("whatsapp")
        
        assert can_send
        assert reason is None
    
    def test_daily_limit(self):
        """Test daily limit enforcement."""
        config = RateLimitConfig(max_per_day=3, max_per_hour=10, cooldown_seconds=0)
        limiter = RateLimiter(config)
        
        # Send up to limit
        for _ in range(3):
            limiter.record_send("whatsapp")
        
        can_send, reason = limiter.can_send("whatsapp")
        assert not can_send
        assert "Daily limit" in reason
    
    def test_hourly_limit(self):
        """Test hourly limit enforcement."""
        config = RateLimitConfig(max_per_day=100, max_per_hour=2, cooldown_seconds=0)
        limiter = RateLimiter(config)
        
        # Send up to hourly limit
        for _ in range(2):
            limiter.record_send("whatsapp")
        
        can_send, reason = limiter.can_send("whatsapp")
        assert not can_send
        assert "Hourly limit" in reason
    
    def test_cooldown(self):
        """Test cooldown enforcement."""
        config = RateLimitConfig(max_per_day=100, max_per_hour=100, cooldown_seconds=60)
        limiter = RateLimiter(config)
        
        limiter.record_send("whatsapp")
        
        can_send, reason = limiter.can_send("whatsapp")
        assert not can_send
        assert "Cooldown" in reason
    
    def test_separate_channels(self):
        """Test limits are separate per channel."""
        config = RateLimitConfig(max_per_day=2, max_per_hour=10, cooldown_seconds=0)
        limiter = RateLimiter(config)
        
        # Max out WhatsApp
        for _ in range(2):
            limiter.record_send("whatsapp")
        
        # Instagram should still work
        can_send, _ = limiter.can_send("instagram")
        assert can_send
    
    def test_get_stats(self):
        """Test getting rate limit stats."""
        limiter = RateLimiter()
        limiter.record_send("whatsapp")
        
        stats = limiter.get_stats("whatsapp")
        assert stats["daily_count"] == 1
        assert stats["channel"] == "whatsapp"


# =============================================================================
# Message Tracker Tests
# =============================================================================

class TestMessageTracker:
    """Tests for MessageTracker."""
    
    def test_track_and_get(self):
        """Test tracking and retrieving messages."""
        tracker = MessageTracker()
        result = SendResult(
            success=True,
            channel="whatsapp",
            message_id="test_123"
        )
        
        tracker.track(result)
        retrieved = tracker.get("test_123")
        
        assert retrieved is not None
        assert retrieved.message_id == "test_123"
    
    def test_confirm_sent(self):
        """Test confirming message sent."""
        tracker = MessageTracker()
        result = SendResult(
            success=True,
            channel="whatsapp",
            message_id="test_123",
            status="pending_confirmation"
        )
        tracker.track(result)
        
        assert tracker.confirm_sent("test_123")
        assert tracker.get("test_123").status == "sent"
    
    def test_get_pending(self):
        """Test getting pending messages."""
        tracker = MessageTracker()
        
        # Add messages with different statuses
        tracker.track(SendResult(True, "whatsapp", "msg1", status="pending_confirmation"))
        tracker.track(SendResult(True, "whatsapp", "msg2", status="sent"))
        tracker.track(SendResult(True, "instagram", "msg3", status="pending_confirmation"))
        
        pending = tracker.get_pending()
        assert len(pending) == 2


# =============================================================================
# Sender Manager Tests
# =============================================================================

class TestSenderManager:
    """Tests for SenderManager."""
    
    def test_prepare_whatsapp(self):
        """Test preparing WhatsApp via manager."""
        manager = SenderManager()
        result = manager.prepare_message(
            "whatsapp",
            "Hola!",
            phone="11 5555-1234"
        )
        
        assert result.success
        assert result.channel == "whatsapp"
    
    def test_prepare_instagram(self):
        """Test preparing Instagram via manager."""
        manager = SenderManager()
        result = manager.prepare_message(
            "instagram",
            "Hola!",
            handle="test_user"
        )
        
        assert result.success
        assert result.channel == "instagram"
    
    def test_prepare_email(self):
        """Test preparing email via manager."""
        manager = SenderManager()
        result = manager.prepare_message(
            "email",
            "Body text",
            to_email="test@example.com",
            subject="Subject"
        )
        
        assert result.success
        assert result.channel == "email"
    
    def test_unknown_channel(self):
        """Test unknown channel."""
        manager = SenderManager()
        result = manager.prepare_message("sms", "Hola!")
        
        assert not result.success
        assert "Unknown channel" in result.error
    
    def test_get_rate_stats(self):
        """Test getting rate stats for all channels."""
        manager = SenderManager()
        stats = manager.get_rate_stats()
        
        assert "whatsapp" in stats
        assert "instagram" in stats
        assert "email" in stats
    
    def test_get_all_pending(self):
        """Test getting all pending messages."""
        manager = SenderManager()
        
        manager.prepare_message("whatsapp", "Msg1", phone="11 5555-1234")
        manager.prepare_message("instagram", "Msg2", handle="test")
        
        pending = manager.get_all_pending()
        assert len(pending) == 2


# =============================================================================
# Property Tests
# =============================================================================

class TestPropertyRateLimits:
    """
    Property 4: Rate Limit Enforcement
    
    Rate limits must never be exceeded regardless of send patterns.
    
    **Validates: Requirements 3.4, 4.4, 5.4**
    """
    
    @given(st.integers(min_value=1, max_value=100))
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_daily_limit_never_exceeded(self, num_sends):
        """
        Property: Daily limit is never exceeded.
        
        **Feature: automated-outreach, Property 4: Rate Limit Enforcement**
        **Validates: Requirements 3.4, 4.4, 5.4**
        """
        daily_limit = 10
        config = RateLimitConfig(max_per_day=daily_limit, max_per_hour=100, cooldown_seconds=0)
        limiter = RateLimiter(config)
        
        successful_sends = 0
        for _ in range(num_sends):
            can_send, _ = limiter.can_send("whatsapp")
            if can_send:
                limiter.record_send("whatsapp")
                successful_sends += 1
        
        # Should never exceed daily limit
        assert successful_sends <= daily_limit
    
    @given(st.integers(min_value=1, max_value=50))
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_hourly_limit_never_exceeded(self, num_sends):
        """
        Property: Hourly limit is never exceeded.
        
        **Feature: automated-outreach, Property 4: Rate Limit Enforcement**
        **Validates: Requirements 3.4, 4.4, 5.4**
        """
        hourly_limit = 5
        config = RateLimitConfig(max_per_day=100, max_per_hour=hourly_limit, cooldown_seconds=0)
        limiter = RateLimiter(config)
        
        successful_sends = 0
        for _ in range(num_sends):
            can_send, _ = limiter.can_send("instagram")
            if can_send:
                limiter.record_send("instagram")
                successful_sends += 1
        
        # Should never exceed hourly limit
        assert successful_sends <= hourly_limit
    
    @given(
        st.lists(
            st.sampled_from(["whatsapp", "instagram", "email"]),
            min_size=1,
            max_size=50
        )
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_limits_independent_per_channel(self, channels):
        """
        Property: Each channel has independent limits.
        
        **Feature: automated-outreach, Property 4: Rate Limit Enforcement**
        **Validates: Requirements 3.4, 4.4, 5.4**
        """
        config = RateLimitConfig(max_per_day=5, max_per_hour=100, cooldown_seconds=0)
        limiter = RateLimiter(config)
        
        counts = {"whatsapp": 0, "instagram": 0, "email": 0}
        
        for channel in channels:
            can_send, _ = limiter.can_send(channel)
            if can_send:
                limiter.record_send(channel)
                counts[channel] += 1
        
        # Each channel should respect its own limit
        for channel, count in counts.items():
            assert count <= 5, f"{channel} exceeded limit: {count}"


class TestPropertyMessageTracking:
    """
    Property tests for message tracking.
    """
    
    @given(st.lists(st.text(min_size=1, max_size=20), min_size=1, max_size=20))
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_all_tracked_messages_retrievable(self, message_ids):
        """
        Property: All tracked messages can be retrieved.
        """
        tracker = MessageTracker()
        
        for msg_id in message_ids:
            result = SendResult(
                success=True,
                channel="whatsapp",
                message_id=msg_id
            )
            tracker.track(result)
        
        # All should be retrievable
        for msg_id in message_ids:
            assert tracker.get(msg_id) is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
