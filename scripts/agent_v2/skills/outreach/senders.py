"""
Channel Senders
===============
Senders for different outreach channels.

Implements Requirements 3.1-3.6, 4.1-4.6, 5.1-5.4:
- WhatsApp: Generate wa.me links with pre-filled messages
- Instagram: Generate profile links for manual DM
- Email: SMTP-based sending (optional in phase 1)
- Rate limiting per channel
- Status tracking with confirmation flow
"""

import logging
import re
import smtplib
import uuid
from dataclasses import dataclass, field
from datetime import datetime, date
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Literal
from urllib.parse import quote

logger = logging.getLogger(__name__)


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class SendResult:
    """Result of preparing/sending a message."""
    success: bool
    channel: Literal["whatsapp", "instagram", "email"]
    message_id: str = ""
    link: Optional[str] = None
    prepared_message: Optional[str] = None
    status: Literal["pending_confirmation", "sent", "failed", "rate_limited"] = "pending_confirmation"
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "channel": self.channel,
            "message_id": self.message_id,
            "link": self.link,
            "prepared_message": self.prepared_message,
            "status": self.status,
            "error": self.error,
            "created_at": self.created_at.isoformat(),
        }


@dataclass
class RateLimitConfig:
    """Rate limit configuration per channel."""
    max_per_day: int = 50
    max_per_hour: int = 10
    cooldown_seconds: int = 60  # Minimum seconds between messages


@dataclass
class SMTPConfig:
    """SMTP configuration for email sending."""
    host: str = ""
    port: int = 587
    username: str = ""
    password: str = ""
    from_email: str = ""
    from_name: str = "Forma Digital"
    use_tls: bool = True


# =============================================================================
# Rate Limiter
# =============================================================================

class RateLimiter:
    """
    Tracks and enforces rate limits per channel.
    
    Prevents exceeding platform limits to avoid blocks.
    """
    
    def __init__(self, config: Optional[RateLimitConfig] = None):
        self.config = config or RateLimitConfig()
        self._daily_counts: dict[str, dict[date, int]] = {}
        self._hourly_counts: dict[str, dict[datetime, int]] = {}
        self._last_send: dict[str, datetime] = {}
    
    def can_send(self, channel: str) -> tuple[bool, Optional[str]]:
        """
        Check if we can send on this channel.
        
        Returns:
            Tuple of (can_send, reason_if_blocked)
        """
        today = date.today()
        now = datetime.now()
        current_hour = now.replace(minute=0, second=0, microsecond=0)
        
        # Check daily limit
        daily = self._daily_counts.get(channel, {}).get(today, 0)
        if daily >= self.config.max_per_day:
            return False, f"Daily limit reached ({self.config.max_per_day}/day)"
        
        # Check hourly limit
        hourly = self._hourly_counts.get(channel, {}).get(current_hour, 0)
        if hourly >= self.config.max_per_hour:
            return False, f"Hourly limit reached ({self.config.max_per_hour}/hour)"
        
        # Check cooldown
        last = self._last_send.get(channel)
        if last:
            elapsed = (now - last).total_seconds()
            if elapsed < self.config.cooldown_seconds:
                remaining = self.config.cooldown_seconds - elapsed
                return False, f"Cooldown active ({remaining:.0f}s remaining)"
        
        return True, None
    
    def record_send(self, channel: str) -> None:
        """Record a send for rate limiting."""
        today = date.today()
        now = datetime.now()
        current_hour = now.replace(minute=0, second=0, microsecond=0)
        
        # Update daily count
        if channel not in self._daily_counts:
            self._daily_counts[channel] = {}
        self._daily_counts[channel][today] = self._daily_counts[channel].get(today, 0) + 1
        
        # Update hourly count
        if channel not in self._hourly_counts:
            self._hourly_counts[channel] = {}
        self._hourly_counts[channel][current_hour] = self._hourly_counts[channel].get(current_hour, 0) + 1
        
        # Update last send time
        self._last_send[channel] = now
    
    def get_stats(self, channel: str) -> dict:
        """Get current rate limit stats for a channel."""
        today = date.today()
        now = datetime.now()
        current_hour = now.replace(minute=0, second=0, microsecond=0)
        
        return {
            "channel": channel,
            "daily_count": self._daily_counts.get(channel, {}).get(today, 0),
            "daily_limit": self.config.max_per_day,
            "hourly_count": self._hourly_counts.get(channel, {}).get(current_hour, 0),
            "hourly_limit": self.config.max_per_hour,
            "last_send": self._last_send.get(channel),
        }
    
    def reset_daily(self, channel: str) -> None:
        """Reset daily counts for a channel."""
        if channel in self._daily_counts:
            self._daily_counts[channel] = {}


# =============================================================================
# Message Tracker
# =============================================================================

class MessageTracker:
    """
    Tracks message status through the confirmation flow.
    
    Flow: prepared → pending_confirmation → sent/failed
    """
    
    def __init__(self):
        self._messages: dict[str, SendResult] = {}
    
    def track(self, result: SendResult) -> None:
        """Add a message to tracking."""
        self._messages[result.message_id] = result
    
    def get(self, message_id: str) -> Optional[SendResult]:
        """Get a tracked message."""
        return self._messages.get(message_id)
    
    def confirm_sent(self, message_id: str) -> bool:
        """Mark a message as sent."""
        msg = self._messages.get(message_id)
        if not msg:
            return False
        msg.status = "sent"
        return True
    
    def mark_failed(self, message_id: str, reason: str) -> bool:
        """Mark a message as failed."""
        msg = self._messages.get(message_id)
        if not msg:
            return False
        msg.status = "failed"
        msg.error = reason
        return True
    
    def get_pending(self) -> list[SendResult]:
        """Get all messages pending confirmation."""
        return [m for m in self._messages.values() if m.status == "pending_confirmation"]
    
    def get_by_channel(self, channel: str) -> list[SendResult]:
        """Get all messages for a channel."""
        return [m for m in self._messages.values() if m.channel == channel]


# =============================================================================
# WhatsApp Sender
# =============================================================================

class WhatsAppSender:
    """
    WhatsApp message sender.
    
    Generates wa.me links with pre-filled messages for manual sending.
    Tracks status with confirmation flow.
    
    Implements Requirements 3.1-3.6
    """
    
    def __init__(
        self,
        rate_limiter: Optional[RateLimiter] = None,
        tracker: Optional[MessageTracker] = None
    ):
        self.rate_limiter = rate_limiter or RateLimiter(
            RateLimitConfig(max_per_day=50, max_per_hour=15, cooldown_seconds=30)
        )
        self.tracker = tracker or MessageTracker()
    
    def prepare(self, phone: str, message: str, lead_id: str = "") -> SendResult:
        """
        Prepare a WhatsApp message.
        
        Args:
            phone: Phone number (will be normalized)
            message: Message text
            lead_id: Optional lead ID for tracking
            
        Returns:
            SendResult with wa.me link
        """
        # Check rate limit
        can_send, reason = self.rate_limiter.can_send("whatsapp")
        if not can_send:
            return SendResult(
                success=False,
                channel="whatsapp",
                status="rate_limited",
                error=reason
            )
        
        # Normalize phone number
        normalized = self._normalize_phone(phone)
        if not normalized:
            return SendResult(
                success=False,
                channel="whatsapp",
                error=f"Invalid phone number: {phone}"
            )
        
        # Generate link
        link = self.generate_link(normalized, message)
        message_id = f"wa_{uuid.uuid4().hex[:12]}"
        
        result = SendResult(
            success=True,
            channel="whatsapp",
            message_id=message_id,
            link=link,
            prepared_message=message,
            status="pending_confirmation"
        )
        
        # Track the message
        self.tracker.track(result)
        
        logger.info(f"Prepared WhatsApp message {message_id} for {normalized}")
        
        return result
    
    def generate_link(self, phone: str, message: str) -> str:
        """
        Generate a wa.me link with pre-filled message.
        
        Args:
            phone: Normalized phone number (digits only, with country code)
            message: Message to pre-fill
            
        Returns:
            wa.me URL
        """
        # Remove any non-digit characters
        phone_digits = re.sub(r'\D', '', phone)
        
        # URL encode the message
        encoded_message = quote(message)
        
        return f"https://wa.me/{phone_digits}?text={encoded_message}"
    
    def confirm_sent(self, message_id: str) -> bool:
        """
        Confirm that a message was sent.
        
        Args:
            message_id: Message ID to confirm
            
        Returns:
            True if confirmed successfully
        """
        if self.tracker.confirm_sent(message_id):
            self.rate_limiter.record_send("whatsapp")
            logger.info(f"Confirmed WhatsApp message sent: {message_id}")
            return True
        return False
    
    def mark_failed(self, message_id: str, reason: str) -> bool:
        """
        Mark a message as failed.
        
        Args:
            message_id: Message ID
            reason: Failure reason
            
        Returns:
            True if marked successfully
        """
        if self.tracker.mark_failed(message_id, reason):
            logger.warning(f"WhatsApp message failed: {message_id} - {reason}")
            return True
        return False
    
    def _normalize_phone(self, phone: str) -> Optional[str]:
        """
        Normalize phone number for WhatsApp.
        
        Handles Argentine phone numbers.
        """
        # Remove all non-digit characters
        digits = re.sub(r'\D', '', phone)
        
        # Handle Argentine numbers
        if digits.startswith('549'):
            # Already in correct format
            return digits
        elif digits.startswith('54'):
            # Add 9 for mobile
            return f"549{digits[2:]}"
        elif digits.startswith('9'):
            # Add country code
            return f"54{digits}"
        elif digits.startswith('11') or digits.startswith('15'):
            # Buenos Aires mobile
            if digits.startswith('15'):
                digits = '11' + digits[2:]
            return f"549{digits}"
        elif len(digits) == 10:
            # Assume Argentine mobile without country code
            return f"549{digits}"
        elif len(digits) >= 10:
            # Return as-is if it looks valid
            return digits
        
        return None
    
    def get_pending(self) -> list[SendResult]:
        """Get messages pending confirmation."""
        return self.tracker.get_pending()


# =============================================================================
# Instagram Sender
# =============================================================================

class InstagramSender:
    """
    Instagram DM sender.
    
    Generates profile links for manual DM sending.
    Prepares message for copy-paste.
    
    Implements Requirements 4.1-4.6
    """
    
    def __init__(
        self,
        rate_limiter: Optional[RateLimiter] = None,
        tracker: Optional[MessageTracker] = None
    ):
        self.rate_limiter = rate_limiter or RateLimiter(
            RateLimitConfig(max_per_day=30, max_per_hour=10, cooldown_seconds=60)
        )
        self.tracker = tracker or MessageTracker()
    
    def prepare(self, handle: str, message: str, lead_id: str = "") -> SendResult:
        """
        Prepare an Instagram DM.
        
        Args:
            handle: Instagram handle (without @)
            message: Message text
            lead_id: Optional lead ID for tracking
            
        Returns:
            SendResult with profile link and prepared message
        """
        # Check rate limit
        can_send, reason = self.rate_limiter.can_send("instagram")
        if not can_send:
            return SendResult(
                success=False,
                channel="instagram",
                status="rate_limited",
                error=reason
            )
        
        # Normalize handle
        normalized = self._normalize_handle(handle)
        if not normalized:
            return SendResult(
                success=False,
                channel="instagram",
                error=f"Invalid Instagram handle: {handle}"
            )
        
        # Generate link
        link = self.generate_link(normalized)
        message_id = f"ig_{uuid.uuid4().hex[:12]}"
        
        result = SendResult(
            success=True,
            channel="instagram",
            message_id=message_id,
            link=link,
            prepared_message=message,
            status="pending_confirmation"
        )
        
        # Track the message
        self.tracker.track(result)
        
        logger.info(f"Prepared Instagram DM {message_id} for @{normalized}")
        
        return result
    
    def generate_link(self, handle: str) -> str:
        """
        Generate Instagram profile link.
        
        Args:
            handle: Instagram handle (without @)
            
        Returns:
            Instagram profile URL
        """
        return f"https://instagram.com/{handle}"
    
    def confirm_sent(self, message_id: str) -> bool:
        """Confirm that a DM was sent."""
        if self.tracker.confirm_sent(message_id):
            self.rate_limiter.record_send("instagram")
            logger.info(f"Confirmed Instagram DM sent: {message_id}")
            return True
        return False
    
    def mark_failed(self, message_id: str, reason: str) -> bool:
        """Mark a DM as failed."""
        if self.tracker.mark_failed(message_id, reason):
            logger.warning(f"Instagram DM failed: {message_id} - {reason}")
            return True
        return False
    
    def _normalize_handle(self, handle: str) -> Optional[str]:
        """Normalize Instagram handle."""
        # Remove @ if present
        handle = handle.lstrip('@')
        
        # Remove URL if full URL provided
        if 'instagram.com/' in handle:
            handle = handle.split('instagram.com/')[-1]
            handle = handle.split('/')[0].split('?')[0]
        
        # Validate handle format
        if not handle or not re.match(r'^[a-zA-Z0-9._]+$', handle):
            return None
        
        return handle.lower()
    
    def get_pending(self) -> list[SendResult]:
        """Get DMs pending confirmation."""
        return self.tracker.get_pending()


# =============================================================================
# Email Sender
# =============================================================================

class EmailSender:
    """
    Email sender via SMTP.
    
    Implements Requirements 5.1-5.4
    """
    
    def __init__(
        self,
        smtp_config: Optional[SMTPConfig] = None,
        rate_limiter: Optional[RateLimiter] = None,
        tracker: Optional[MessageTracker] = None
    ):
        self.smtp_config = smtp_config or SMTPConfig()
        self.rate_limiter = rate_limiter or RateLimiter(
            RateLimitConfig(max_per_day=100, max_per_hour=20, cooldown_seconds=10)
        )
        self.tracker = tracker or MessageTracker()
        self._configured = bool(smtp_config and smtp_config.host)
    
    def configure_smtp(self, config: SMTPConfig) -> None:
        """Configure SMTP settings."""
        self.smtp_config = config
        self._configured = bool(config.host)
        logger.info(f"SMTP configured: {config.host}:{config.port}")
    
    def is_configured(self) -> bool:
        """Check if SMTP is configured."""
        return self._configured
    
    def prepare(self, to_email: str, subject: str, body: str, lead_id: str = "") -> SendResult:
        """
        Prepare an email (without sending).
        
        Args:
            to_email: Recipient email
            subject: Email subject
            body: Email body
            lead_id: Optional lead ID for tracking
            
        Returns:
            SendResult with prepared email
        """
        # Check rate limit
        can_send, reason = self.rate_limiter.can_send("email")
        if not can_send:
            return SendResult(
                success=False,
                channel="email",
                status="rate_limited",
                error=reason
            )
        
        # Validate email
        if not self._validate_email(to_email):
            return SendResult(
                success=False,
                channel="email",
                error=f"Invalid email address: {to_email}"
            )
        
        message_id = f"em_{uuid.uuid4().hex[:12]}"
        
        result = SendResult(
            success=True,
            channel="email",
            message_id=message_id,
            prepared_message=f"Subject: {subject}\n\n{body}",
            status="pending_confirmation"
        )
        
        self.tracker.track(result)
        logger.info(f"Prepared email {message_id} for {to_email}")
        
        return result
    
    def send(self, to_email: str, subject: str, body: str, lead_id: str = "") -> SendResult:
        """
        Send an email via SMTP.
        
        Args:
            to_email: Recipient email
            subject: Email subject
            body: Email body (plain text)
            lead_id: Optional lead ID for tracking
            
        Returns:
            SendResult with send status
        """
        # Check if configured
        if not self._configured:
            return SendResult(
                success=False,
                channel="email",
                error="SMTP not configured"
            )
        
        # Check rate limit
        can_send, reason = self.rate_limiter.can_send("email")
        if not can_send:
            return SendResult(
                success=False,
                channel="email",
                status="rate_limited",
                error=reason
            )
        
        # Validate email
        if not self._validate_email(to_email):
            return SendResult(
                success=False,
                channel="email",
                error=f"Invalid email address: {to_email}"
            )
        
        message_id = f"em_{uuid.uuid4().hex[:12]}"
        
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = f"{self.smtp_config.from_name} <{self.smtp_config.from_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain', 'utf-8'))
            
            # Send via SMTP
            with smtplib.SMTP(self.smtp_config.host, self.smtp_config.port) as server:
                if self.smtp_config.use_tls:
                    server.starttls()
                server.login(self.smtp_config.username, self.smtp_config.password)
                server.send_message(msg)
            
            # Record send
            self.rate_limiter.record_send("email")
            
            result = SendResult(
                success=True,
                channel="email",
                message_id=message_id,
                prepared_message=f"Subject: {subject}\n\n{body}",
                status="sent"
            )
            
            self.tracker.track(result)
            logger.info(f"Email sent: {message_id} to {to_email}")
            
            return result
            
        except Exception as e:
            logger.error(f"Email send failed: {e}")
            result = SendResult(
                success=False,
                channel="email",
                message_id=message_id,
                error=str(e),
                status="failed"
            )
            self.tracker.track(result)
            return result
    
    def _validate_email(self, email: str) -> bool:
        """Validate email format."""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    def get_pending(self) -> list[SendResult]:
        """Get emails pending (for manual send mode)."""
        return self.tracker.get_pending()


# =============================================================================
# Unified Sender Manager
# =============================================================================

class SenderManager:
    """
    Unified manager for all channel senders.
    
    Provides a single interface for sending messages across channels.
    """
    
    def __init__(self):
        # Shared rate limiter for global limits
        self.whatsapp = WhatsAppSender()
        self.instagram = InstagramSender()
        self.email = EmailSender()
        
        self._senders = {
            "whatsapp": self.whatsapp,
            "instagram": self.instagram,
            "email": self.email,
        }
    
    def prepare_message(
        self,
        channel: str,
        message: str,
        lead_id: str = "",
        **kwargs
    ) -> SendResult:
        """
        Prepare a message for any channel.
        
        Args:
            channel: Channel name (whatsapp, instagram, email)
            message: Message text
            lead_id: Lead ID for tracking
            **kwargs: Channel-specific args (phone, handle, to_email, subject)
            
        Returns:
            SendResult
        """
        if channel == "whatsapp":
            phone = kwargs.get("phone", "")
            return self.whatsapp.prepare(phone, message, lead_id)
        
        elif channel == "instagram":
            handle = kwargs.get("handle", "")
            return self.instagram.prepare(handle, message, lead_id)
        
        elif channel == "email":
            to_email = kwargs.get("to_email", "")
            subject = kwargs.get("subject", "")
            return self.email.prepare(to_email, subject, message, lead_id)
        
        else:
            return SendResult(
                success=False,
                channel=channel,
                error=f"Unknown channel: {channel}"
            )
    
    def confirm_sent(self, channel: str, message_id: str) -> bool:
        """Confirm a message was sent."""
        sender = self._senders.get(channel)
        if sender:
            return sender.confirm_sent(message_id)
        return False
    
    def mark_failed(self, channel: str, message_id: str, reason: str) -> bool:
        """Mark a message as failed."""
        sender = self._senders.get(channel)
        if sender:
            return sender.mark_failed(message_id, reason)
        return False
    
    def get_rate_stats(self) -> dict:
        """Get rate limit stats for all channels."""
        return {
            "whatsapp": self.whatsapp.rate_limiter.get_stats("whatsapp"),
            "instagram": self.instagram.rate_limiter.get_stats("instagram"),
            "email": self.email.rate_limiter.get_stats("email"),
        }
    
    def get_all_pending(self) -> list[SendResult]:
        """Get all pending messages across channels."""
        pending = []
        for sender in self._senders.values():
            pending.extend(sender.get_pending())
        return pending


# =============================================================================
# Quick Test
# =============================================================================

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    print("Testing Channel Senders...")
    
    # Test WhatsApp
    wa = WhatsAppSender()
    result = wa.prepare("11 5555-1234", "Hola! Te contacto de Forma Digital")
    print(f"\nWhatsApp result:")
    print(f"  Success: {result.success}")
    print(f"  Link: {result.link}")
    print(f"  Message ID: {result.message_id}")
    
    # Confirm
    wa.confirm_sent(result.message_id)
    
    # Test Instagram
    ig = InstagramSender()
    result = ig.prepare("@barberia_juan", "Hola! Vi tu perfil y me encantó")
    print(f"\nInstagram result:")
    print(f"  Success: {result.success}")
    print(f"  Link: {result.link}")
    print(f"  Message ID: {result.message_id}")
    
    # Test Email (prepare only, no SMTP)
    em = EmailSender()
    result = em.prepare("test@example.com", "Propuesta Forma Digital", "Hola...")
    print(f"\nEmail result:")
    print(f"  Success: {result.success}")
    print(f"  Message ID: {result.message_id}")
    print(f"  Configured: {em.is_configured()}")
    
    # Test SenderManager
    manager = SenderManager()
    print(f"\nRate stats: {manager.get_rate_stats()}")
    
    print("\n✅ Channel Senders test complete")
