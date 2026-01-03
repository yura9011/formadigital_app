"""
Outreach Module
===============
Automated outreach system for lead contact management.

Components:
- TemplateManager: Message template management
- SequenceManager: Follow-up sequence management
- SenderManager: Channel-specific message sending
- OutreachQueueManager: Daily queue with prioritization
- ContactHistoryTracker: Contact history and metrics
"""

from .templates import (
    TemplateManager,
    MessageTemplate,
    ValidationResult,
)

from .sequences import (
    SequenceManager,
    Sequence,
    SequenceStep,
    LeadSequenceState,
)

from .senders import (
    SenderManager,
    WhatsAppSender,
    InstagramSender,
    EmailSender,
    SendResult,
    RateLimiter,
    RateLimitConfig,
    SMTPConfig,
)

from .queue import (
    OutreachQueueManager,
    QueueItem,
    QueueConfig,
    QueueAction,
    QueueItemStatus,
    PriorityCalculator,
)

from .history import (
    ContactHistoryTracker,
    ContactEntry,
    ContactDirection,
    ContactStatus,
    LeadStatus,
    LeadMetrics,
    StatusTransition,
    VALID_TRANSITIONS,
)

from .metrics import (
    MetricsDashboard,
    PipelineMetrics,
    ChannelMetrics,
    FunnelData,
    FunnelStage,
    Period,
)

from .integration import (
    PipelineIntegrator,
    IntegrationConfig,
    LeadSyncResult,
    create_integrated_pipeline,
)

from .campaigns import (
    CampaignManager,
    Campaign,
    CampaignStatus,
    TargetCriteria,
    CampaignMetrics,
    LeadCampaignAssignment,
)

from .faq_responses import (
    FAQManager,
    FAQResponse,
    FAQCategory,
    FAQSuggestion,
)


__all__ = [
    # Templates
    "TemplateManager",
    "MessageTemplate",
    "ValidationResult",
    # Sequences
    "SequenceManager",
    "Sequence",
    "SequenceStep",
    "LeadSequenceState",
    # Senders
    "SenderManager",
    "WhatsAppSender",
    "InstagramSender",
    "EmailSender",
    "SendResult",
    "RateLimiter",
    "RateLimitConfig",
    "SMTPConfig",
    # Queue
    "OutreachQueueManager",
    "QueueItem",
    "QueueConfig",
    "QueueAction",
    "QueueItemStatus",
    "PriorityCalculator",
    # History
    "ContactHistoryTracker",
    "ContactEntry",
    "ContactDirection",
    "ContactStatus",
    "LeadStatus",
    "LeadMetrics",
    "StatusTransition",
    "VALID_TRANSITIONS",
    # Metrics
    "MetricsDashboard",
    "PipelineMetrics",
    "ChannelMetrics",
    "FunnelData",
    "FunnelStage",
    "Period",
    # Integration
    "PipelineIntegrator",
    "IntegrationConfig",
    "LeadSyncResult",
    "create_integrated_pipeline",
    # Campaigns
    "CampaignManager",
    "Campaign",
    "CampaignStatus",
    "TargetCriteria",
    "CampaignMetrics",
    "LeadCampaignAssignment",
    # FAQ Responses
    "FAQManager",
    "FAQResponse",
    "FAQCategory",
    "FAQSuggestion",
]
