"""
Outreach CLI Commands
=====================
CLI commands for the automated outreach system.

Usage:
    python cli_outreach.py queue              # Show today's queue
    python cli_outreach.py next               # Get next lead to contact
    python cli_outreach.py send <lead_id>     # Prepare message for lead
    python cli_outreach.py confirm <msg_id>   # Confirm message was sent
    python cli_outreach.py skip <lead_id>     # Skip lead for today
    python cli_outreach.py snooze <lead_id>   # Snooze lead
    
    python cli_outreach.py templates list     # List templates
    python cli_outreach.py templates render   # Render a template
    
    python cli_outreach.py sequences list     # List sequences
    python cli_outreach.py sequences start    # Start sequence for lead
    python cli_outreach.py sequences status   # Check sequence status
    
    python cli_outreach.py metrics daily      # Daily metrics
    python cli_outreach.py metrics weekly     # Weekly metrics
    python cli_outreach.py metrics export     # Export to CSV
"""

import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

# Force UTF-8 encoding for stdout/stderr (Windows fix for emojis)
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Ensure we can import from local modules
sys.path.insert(0, str(Path(__file__).parent))

from config import LOG_DIR
from skills.outreach import (
    OutreachQueueManager,
    QueueItemStatus,
    TemplateManager,
    SequenceManager,
    SenderManager,
    ContactHistoryTracker,
    MetricsDashboard,
    Period,
    CampaignManager,
    CampaignStatus,
    TargetCriteria,
)

# =============================================================================
# Logging Setup
# =============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stderr),
        logging.FileHandler(LOG_DIR / "outreach_cli.log", encoding='utf-8')
    ]
)
logger = logging.getLogger("OutreachCLI")


# =============================================================================
# Shared Instances
# =============================================================================

# Initialize managers (will be loaded on demand)
_queue_manager = None
_template_manager = None
_sequence_manager = None
_sender_manager = None
_history_tracker = None
_metrics_dashboard = None


def get_queue_manager() -> OutreachQueueManager:
    global _queue_manager
    if _queue_manager is None:
        _queue_manager = OutreachQueueManager()
    return _queue_manager


def get_template_manager() -> TemplateManager:
    global _template_manager
    if _template_manager is None:
        _template_manager = TemplateManager()
    return _template_manager


def get_sequence_manager() -> SequenceManager:
    global _sequence_manager
    if _sequence_manager is None:
        _sequence_manager = SequenceManager()
    return _sequence_manager


def get_sender_manager() -> SenderManager:
    global _sender_manager
    if _sender_manager is None:
        _sender_manager = SenderManager()
    return _sender_manager


def get_history_tracker() -> ContactHistoryTracker:
    global _history_tracker
    if _history_tracker is None:
        _history_tracker = ContactHistoryTracker()
    return _history_tracker


def get_metrics_dashboard() -> MetricsDashboard:
    global _metrics_dashboard
    if _metrics_dashboard is None:
        _metrics_dashboard = MetricsDashboard(get_history_tracker())
    return _metrics_dashboard


_campaign_manager = None

def get_campaign_manager() -> CampaignManager:
    global _campaign_manager
    if _campaign_manager is None:
        _campaign_manager = CampaignManager()
    return _campaign_manager


# =============================================================================
# Queue Commands
# =============================================================================

def cmd_queue_show(args):
    """Show today's outreach queue."""
    manager = get_queue_manager()
    
    # Get queue items
    items = manager.get_queue(status=QueueItemStatus.PENDING)
    stats = manager.get_stats()
    
    print("═" * 60)
    print("📋 OUTREACH QUEUE")
    print("═" * 60)
    print(f"📊 Stats: {stats['pending']} pending | {stats['processed_today']} processed today | Limit: {stats['daily_limit']}")
    print()
    
    if not items:
        print("   ✨ Queue is empty! No leads to contact.")
        print()
    else:
        print(f"{'#':<4} {'Lead':<25} {'Channel':<12} {'Priority':<10} {'Action':<15}")
        print("-" * 60)
        
        for i, item in enumerate(items[:20], 1):  # Show top 20
            channel_emoji = {"whatsapp": "💬", "instagram": "📸", "email": "📧"}.get(item.recommended_channel, "📨")
            action_str = item.action.value.replace("_", " ").title()
            
            print(f"{i:<4} {item.lead_name[:24]:<25} {channel_emoji} {item.recommended_channel:<10} {item.priority:<10} {action_str:<15}")
        
        if len(items) > 20:
            print(f"   ... and {len(items) - 20} more")
    
    print("═" * 60)
    print("💡 Commands: outreach next | outreach send <lead_id> | outreach skip <lead_id>")
    print()


def cmd_queue_next(args):
    """Get the next lead to contact."""
    manager = get_queue_manager()
    
    # Peek at next item (don't remove)
    item = manager.peek_next()
    
    if not item:
        print("✨ No leads in queue!")
        return
    
    channel_emoji = {"whatsapp": "💬", "instagram": "📸", "email": "📧"}.get(item.recommended_channel, "📨")
    
    print("═" * 60)
    print("📌 NEXT LEAD TO CONTACT")
    print("═" * 60)
    print(f"   Lead ID:    {item.lead_id}")
    print(f"   Name:       {item.lead_name}")
    print(f"   Channel:    {channel_emoji} {item.recommended_channel}")
    print(f"   Action:     {item.action.value}")
    print(f"   Priority:   {item.priority}")
    print(f"   Score:      {item.contactability_score}")
    
    if item.template_id:
        print(f"   Template:   {item.template_id}")
    
    if item.reason:
        print(f"   Reason:     {item.reason}")
    
    print("═" * 60)
    print(f"💡 Run: outreach send {item.lead_id}")
    print()


def cmd_queue_skip(args):
    """Skip a lead for today."""
    manager = get_queue_manager()
    
    lead_id = args.lead_id
    reason = args.reason or "Skipped via CLI"
    
    if manager.skip(lead_id, reason):
        print(f"✅ Skipped lead: {lead_id}")
        print(f"   Reason: {reason}")
    else:
        print(f"❌ Lead not found in queue: {lead_id}")


def cmd_queue_snooze(args):
    """Snooze a lead for later."""
    manager = get_queue_manager()
    
    lead_id = args.lead_id
    hours = args.hours or 24
    
    if manager.snooze(lead_id, hours):
        print(f"✅ Snoozed lead: {lead_id}")
        print(f"   Will reappear in {hours} hours")
    else:
        print(f"❌ Lead not found in queue: {lead_id}")


def cmd_queue_remove(args):
    """Remove a lead from queue."""
    manager = get_queue_manager()
    
    lead_id = args.lead_id
    reason = args.reason or "Removed via CLI"
    
    if manager.remove(lead_id, reason):
        print(f"✅ Removed lead: {lead_id}")
    else:
        print(f"❌ Lead not found in queue: {lead_id}")


# =============================================================================
# Send Commands
# =============================================================================

def cmd_send(args):
    """Prepare and show message for a lead."""
    lead_id = args.lead_id
    
    queue_manager = get_queue_manager()
    template_manager = get_template_manager()
    sender_manager = get_sender_manager()
    
    # Get queue item
    items = queue_manager.get_queue()
    item = next((i for i in items if i.lead_id == lead_id), None)
    
    if not item:
        print(f"❌ Lead not found in queue: {lead_id}")
        return
    
    # Get template
    template_id = item.template_id or f"{item.recommended_channel}_initial"
    template = template_manager.get(template_id)
    
    if not template:
        print(f"❌ Template not found: {template_id}")
        print("   Available templates:")
        for t in template_manager.list(channel=item.recommended_channel):
            print(f"      - {t.id}: {t.name}")
        return
    
    # Mock lead data for rendering (in real usage, load from DB)
    lead_data = {
        "name": item.lead_name,
        "location": "Buenos Aires",  # Would come from lead data
    }
    
    # Render template
    rendered = template_manager.render(template_id, lead_data)
    
    if not rendered.success:
        print(f"❌ Failed to render template: {rendered.error}")
        print(f"   Missing variables: {rendered.missing_variables}")
        return
    
    channel_emoji = {"whatsapp": "💬", "instagram": "📸", "email": "📧"}.get(item.recommended_channel, "📨")
    
    print("═" * 60)
    print(f"{channel_emoji} MESSAGE PREPARED")
    print("═" * 60)
    print(f"   Lead:     {item.lead_name}")
    print(f"   Channel:  {item.recommended_channel}")
    print(f"   Template: {template_id}")
    print()
    print("📝 Message:")
    print("-" * 60)
    print(rendered.body)
    print("-" * 60)
    
    # Prepare send result based on channel
    if item.recommended_channel == "whatsapp":
        # Would need phone from lead data
        print()
        print("💡 To send via WhatsApp:")
        print("   1. Copy the message above")
        print("   2. Open WhatsApp link (would be generated with phone)")
        print(f"   3. Run: outreach confirm <message_id>")
    
    elif item.recommended_channel == "instagram":
        print()
        print("💡 To send via Instagram:")
        print("   1. Copy the message above")
        print("   2. Open Instagram profile (would be generated with handle)")
        print(f"   3. Run: outreach confirm <message_id>")
    
    elif item.recommended_channel == "email":
        if rendered.subject:
            print(f"   Subject: {rendered.subject}")
        print()
        print("💡 Email would be sent automatically if SMTP configured")
    
    print("═" * 60)


def cmd_confirm(args):
    """Confirm a message was sent."""
    message_id = args.message_id
    sender_manager = get_sender_manager()
    
    # Try to confirm on all channels
    confirmed = False
    for channel in ["whatsapp", "instagram", "email"]:
        if sender_manager.confirm_sent(channel, message_id):
            confirmed = True
            print(f"✅ Confirmed message sent: {message_id}")
            print(f"   Channel: {channel}")
            break
    
    if not confirmed:
        print(f"❌ Message not found: {message_id}")
        print("   Make sure you're using the correct message ID")


# =============================================================================
# Template Commands
# =============================================================================

def cmd_templates_list(args):
    """List available templates."""
    manager = get_template_manager()
    
    channel = args.channel
    templates = manager.list(channel=channel)
    
    print("═" * 60)
    print("📝 MESSAGE TEMPLATES")
    print("═" * 60)
    
    if not templates:
        print("   No templates found.")
        if channel:
            print(f"   (filtered by channel: {channel})")
    else:
        # Group by channel
        by_channel = {}
        for t in templates:
            if t.channel not in by_channel:
                by_channel[t.channel] = []
            by_channel[t.channel].append(t)
        
        for ch, ch_templates in by_channel.items():
            emoji = {"whatsapp": "💬", "instagram": "📸", "email": "📧"}.get(ch, "📨")
            print(f"\n{emoji} {ch.upper()}")
            print("-" * 40)
            
            for t in ch_templates:
                print(f"   {t.id}")
                print(f"      Name: {t.name}")
                print(f"      Category: {t.category}")
                print(f"      Variables: {', '.join(t.variables) or 'none'}")
    
    print()
    print("═" * 60)
    print("💡 Run: outreach templates render <template_id> <lead_id>")


def cmd_templates_render(args):
    """Render a template with lead data."""
    manager = get_template_manager()
    
    template_id = args.template_id
    
    # Mock lead data (in real usage, load from DB)
    lead_data = {
        "name": args.business_name or "Test Business",
        "location": args.location or "Buenos Aires",
        "phone": args.phone or "",
        "instagram_handle": args.instagram or "",
    }
    
    result = manager.render(template_id, lead_data)
    
    if result.success:
        print("═" * 60)
        print("📝 RENDERED TEMPLATE")
        print("═" * 60)
        print(f"   Template: {template_id}")
        print(f"   Channel:  {result.channel}")
        
        if result.subject:
            print(f"   Subject:  {result.subject}")
        
        print()
        print("📄 Body:")
        print("-" * 60)
        print(result.body)
        print("-" * 60)
    else:
        print(f"❌ Failed to render: {result.error}")
        if result.missing_variables:
            print(f"   Missing: {', '.join(result.missing_variables)}")


# =============================================================================
# Sequence Commands
# =============================================================================

def cmd_sequences_list(args):
    """List available sequences."""
    manager = get_sequence_manager()
    
    sequences = manager.list_sequences()
    
    print("═" * 60)
    print("🔄 OUTREACH SEQUENCES")
    print("═" * 60)
    
    if not sequences:
        print("   No sequences found.")
    else:
        for seq in sequences:
            status = "✅ Active" if seq.active else "⏸️ Inactive"
            print(f"\n   {seq.id}")
            print(f"      Name: {seq.name}")
            print(f"      Status: {status}")
            print(f"      Steps: {len(seq.steps)}")
            print(f"      Max attempts: {seq.max_attempts}")
            
            if args.verbose:
                print("      Steps:")
                for step in seq.steps:
                    emoji = {"whatsapp": "💬", "instagram": "📸", "email": "📧"}.get(step.channel, "📨")
                    print(f"         {step.position}. {emoji} {step.channel} - {step.template_id} (wait {step.delay_hours}h)")
    
    print()
    print("═" * 60)


def cmd_sequences_start(args):
    """Start a sequence for a lead."""
    manager = get_sequence_manager()
    
    lead_id = args.lead_id
    sequence_id = args.sequence_id or "default_sequence"
    
    try:
        state = manager.start_sequence(lead_id, sequence_id)
        print(f"✅ Started sequence for lead: {lead_id}")
        print(f"   Sequence: {sequence_id}")
        print(f"   Next touch: {state.next_touch_at}")
    except ValueError as e:
        print(f"❌ Error: {e}")


def cmd_sequences_pause(args):
    """Pause a sequence for a lead."""
    manager = get_sequence_manager()
    
    lead_id = args.lead_id
    reason = args.reason or "Paused via CLI"
    
    manager.pause(lead_id, reason)
    print(f"✅ Paused sequence for lead: {lead_id}")


def cmd_sequences_resume(args):
    """Resume a paused sequence."""
    manager = get_sequence_manager()
    
    lead_id = args.lead_id
    
    manager.resume(lead_id)
    print(f"✅ Resumed sequence for lead: {lead_id}")


def cmd_sequences_status(args):
    """Check sequence status for a lead."""
    manager = get_sequence_manager()
    
    lead_id = args.lead_id
    state = manager.get_lead_state(lead_id)
    
    if not state:
        print(f"❌ No sequence found for lead: {lead_id}")
        return
    
    sequence = manager.get_sequence(state.sequence_id)
    
    print("═" * 60)
    print("🔄 SEQUENCE STATUS")
    print("═" * 60)
    print(f"   Lead ID:    {state.lead_id}")
    print(f"   Sequence:   {state.sequence_id}")
    print(f"   Position:   {state.current_position}/{sequence.max_attempts if sequence else '?'}")
    print(f"   Status:     {state.status}")
    print(f"   Started:    {state.started_at}")
    
    if state.last_touch_at:
        print(f"   Last touch: {state.last_touch_at}")
    
    if state.next_touch_at:
        print(f"   Next touch: {state.next_touch_at}")
    
    if state.pause_reason:
        print(f"   Pause reason: {state.pause_reason}")
    
    print("═" * 60)


# =============================================================================
# Metrics Commands
# =============================================================================

def cmd_metrics_daily(args):
    """Show daily metrics."""
    dashboard = get_metrics_dashboard()
    metrics = dashboard.get_pipeline_metrics(Period.DAILY)
    
    _print_metrics(metrics, "DAILY")


def cmd_metrics_weekly(args):
    """Show weekly metrics."""
    dashboard = get_metrics_dashboard()
    metrics = dashboard.get_pipeline_metrics(Period.WEEKLY)
    
    _print_metrics(metrics, "WEEKLY")


def cmd_metrics_summary(args):
    """Show full metrics summary."""
    dashboard = get_metrics_dashboard()
    print(dashboard.print_summary())


def cmd_metrics_export(args):
    """Export metrics to CSV."""
    dashboard = get_metrics_dashboard()
    
    period = Period.ALL_TIME
    if args.period == "daily":
        period = Period.DAILY
    elif args.period == "weekly":
        period = Period.WEEKLY
    elif args.period == "monthly":
        period = Period.MONTHLY
    
    csv_data = dashboard.export_to_csv(period)
    
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(csv_data)
        print(f"✅ Exported to: {output_path}")
    else:
        print(csv_data)


def _print_metrics(metrics, period_name: str):
    """Helper to print metrics."""
    print("═" * 60)
    print(f"📊 {period_name} METRICS")
    print("═" * 60)
    print(f"   Period: {metrics.start_date} to {metrics.end_date}")
    print()
    print("   📈 Volume:")
    print(f"      Leads processed:    {metrics.leads_processed}")
    print(f"      Messages sent:      {metrics.messages_sent}")
    print(f"      Responses received: {metrics.messages_received}")
    print()
    print("   📉 Rates:")
    print(f"      Response rate:   {metrics.response_rate:.1%}")
    print(f"      Conversion rate: {metrics.conversion_rate:.1%}")
    print()
    print("   📱 By Channel:")
    print(f"      💬 WhatsApp:  {metrics.whatsapp_sent}")
    print(f"      📸 Instagram: {metrics.instagram_sent}")
    print(f"      📧 Email:     {metrics.email_sent}")
    print("═" * 60)


# =============================================================================
# Campaign Commands
# =============================================================================

def cmd_campaigns_list(args):
    """List all campaigns."""
    manager = get_campaign_manager()
    
    active_only = args.active
    campaigns = manager.list_campaigns(active_only=active_only)
    
    print("═" * 60)
    print("🎯 CAMPAIGNS")
    print("═" * 60)
    
    if not campaigns:
        print("   No campaigns found.")
        if active_only:
            print("   (filtered by active only)")
    else:
        for c in campaigns:
            status_emoji = {
                "active": "✅",
                "paused": "⏸️",
                "draft": "📝",
                "completed": "🏁",
            }.get(c.status.value, "❓")
            
            print(f"\n   {status_emoji} {c.name} ({c.id})")
            print(f"      Status: {c.status.value}")
            print(f"      Sequence: {c.sequence_id}")
            
            # Show criteria
            criteria = c.target_criteria
            if criteria.locations:
                print(f"      Locations: {', '.join(criteria.locations)}")
            if criteria.business_types:
                print(f"      Business types: {', '.join(criteria.business_types)}")
            print(f"      Score range: {criteria.min_score}-{criteria.max_score}")
            print(f"      Channels required: {', '.join(criteria.channels_required)}")
            
            # Show metrics
            m = c.metrics
            print(f"      📊 Metrics: {m.leads_assigned} assigned | {m.leads_contacted} contacted | {m.leads_responded} responded | {m.leads_converted} converted")
            if m.response_rate > 0:
                print(f"         Response rate: {m.response_rate:.1%} | Conversion rate: {m.conversion_rate:.1%}")
    
    print()
    print("═" * 60)
    print("💡 Commands: campaigns create | campaigns activate <id> | campaigns metrics <id>")


def cmd_campaigns_create(args):
    """Create a new campaign."""
    manager = get_campaign_manager()
    
    # Build target criteria
    criteria = TargetCriteria(
        locations=args.locations.split(",") if args.locations else None,
        business_types=args.business_types.split(",") if args.business_types else None,
        min_score=args.min_score,
        max_score=args.max_score,
        channels_required=args.channels.split(",") if args.channels else ["whatsapp"],
    )
    
    # Build templates dict
    templates = {}
    if args.whatsapp_template:
        templates["whatsapp"] = args.whatsapp_template
    if args.instagram_template:
        templates["instagram"] = args.instagram_template
    if args.email_template:
        templates["email"] = args.email_template
    
    campaign = manager.create_campaign(
        name=args.name,
        description=args.description or "",
        target_criteria=criteria,
        sequence_id=args.sequence or "default_sequence",
        templates=templates or None,
    )
    
    print(f"✅ Created campaign: {campaign.name}")
    print(f"   ID: {campaign.id}")
    print(f"   Status: {campaign.status.value}")
    print()
    print(f"💡 Run: campaigns activate {campaign.id}")


def cmd_campaigns_show(args):
    """Show campaign details."""
    manager = get_campaign_manager()
    
    campaign = manager.get_campaign(args.campaign_id)
    
    if not campaign:
        print(f"❌ Campaign not found: {args.campaign_id}")
        return
    
    status_emoji = {
        "active": "✅",
        "paused": "⏸️",
        "draft": "📝",
        "completed": "🏁",
    }.get(campaign.status.value, "❓")
    
    print("═" * 60)
    print(f"🎯 CAMPAIGN: {campaign.name}")
    print("═" * 60)
    print(f"   ID:          {campaign.id}")
    print(f"   Status:      {status_emoji} {campaign.status.value}")
    print(f"   Description: {campaign.description or '(none)'}")
    print(f"   Sequence:    {campaign.sequence_id}")
    print(f"   Created:     {campaign.created_at}")
    print(f"   Updated:     {campaign.updated_at}")
    print()
    
    # Target criteria
    print("   🎯 Target Criteria:")
    c = campaign.target_criteria
    print(f"      Locations:      {', '.join(c.locations) if c.locations else 'Any'}")
    print(f"      Business types: {', '.join(c.business_types) if c.business_types else 'Any'}")
    print(f"      Score range:    {c.min_score}-{c.max_score}")
    print(f"      Channels:       {', '.join(c.channels_required)}")
    print()
    
    # Templates
    print("   📝 Templates:")
    if campaign.templates:
        for channel, template_id in campaign.templates.items():
            emoji = {"whatsapp": "💬", "instagram": "📸", "email": "📧"}.get(channel, "📨")
            print(f"      {emoji} {channel}: {template_id}")
    else:
        print("      (using defaults)")
    print()
    
    # Metrics
    m = campaign.metrics
    print("   📊 Metrics:")
    print(f"      Leads assigned:  {m.leads_assigned}")
    print(f"      Leads contacted: {m.leads_contacted}")
    print(f"      Leads responded: {m.leads_responded}")
    print(f"      Leads converted: {m.leads_converted}")
    print(f"      Messages sent:   {m.messages_sent}")
    if m.leads_contacted > 0:
        print(f"      Response rate:   {m.response_rate:.1%}")
    if m.leads_responded > 0:
        print(f"      Conversion rate: {m.conversion_rate:.1%}")
    
    print("═" * 60)


def cmd_campaigns_activate(args):
    """Activate a campaign."""
    manager = get_campaign_manager()
    
    campaign = manager.activate_campaign(args.campaign_id)
    
    if campaign:
        print(f"✅ Activated campaign: {campaign.name}")
    else:
        print(f"❌ Campaign not found: {args.campaign_id}")


def cmd_campaigns_pause(args):
    """Pause a campaign."""
    manager = get_campaign_manager()
    
    campaign = manager.pause_campaign(args.campaign_id)
    
    if campaign:
        print(f"⏸️ Paused campaign: {campaign.name}")
    else:
        print(f"❌ Campaign not found: {args.campaign_id}")


def cmd_campaigns_delete(args):
    """Delete a campaign."""
    manager = get_campaign_manager()
    
    if manager.delete_campaign(args.campaign_id):
        print(f"✅ Deleted campaign: {args.campaign_id}")
    else:
        print(f"❌ Cannot delete campaign: {args.campaign_id}")
        print("   (default campaign cannot be deleted)")


def cmd_campaigns_metrics(args):
    """Show campaign metrics."""
    manager = get_campaign_manager()
    
    if args.campaign_id:
        # Single campaign
        metrics = manager.get_campaign_metrics(args.campaign_id)
        campaign = manager.get_campaign(args.campaign_id)
        
        if not metrics or not campaign:
            print(f"❌ Campaign not found: {args.campaign_id}")
            return
        
        print("═" * 60)
        print(f"📊 METRICS: {campaign.name}")
        print("═" * 60)
        print(f"   Leads assigned:  {metrics.leads_assigned}")
        print(f"   Leads contacted: {metrics.leads_contacted}")
        print(f"   Leads responded: {metrics.leads_responded}")
        print(f"   Leads converted: {metrics.leads_converted}")
        print(f"   Messages sent:   {metrics.messages_sent}")
        print()
        print(f"   Response rate:   {metrics.response_rate:.1%}")
        print(f"   Conversion rate: {metrics.conversion_rate:.1%}")
        print("═" * 60)
    else:
        # All campaigns
        all_metrics = manager.get_all_metrics()
        
        print("═" * 60)
        print("📊 ALL CAMPAIGN METRICS")
        print("═" * 60)
        
        total_assigned = 0
        total_contacted = 0
        total_responded = 0
        total_converted = 0
        
        for campaign_id, metrics in all_metrics.items():
            campaign = manager.get_campaign(campaign_id)
            name = campaign.name if campaign else campaign_id
            
            print(f"\n   {name}:")
            print(f"      {metrics.leads_assigned} assigned → {metrics.leads_contacted} contacted → {metrics.leads_responded} responded → {metrics.leads_converted} converted")
            
            total_assigned += metrics.leads_assigned
            total_contacted += metrics.leads_contacted
            total_responded += metrics.leads_responded
            total_converted += metrics.leads_converted
        
        print()
        print("-" * 60)
        print(f"   TOTAL: {total_assigned} assigned → {total_contacted} contacted → {total_responded} responded → {total_converted} converted")
        print("═" * 60)


# =============================================================================
# Argument Parser
# =============================================================================

def create_parser() -> argparse.ArgumentParser:
    """Create the argument parser with all subcommands."""
    parser = argparse.ArgumentParser(
        description="Outreach CLI - Manage automated outreach campaigns",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cli_outreach.py queue                    Show today's queue
  python cli_outreach.py next                     Get next lead to contact
  python cli_outreach.py send lead_123            Prepare message for lead
  python cli_outreach.py confirm wa_abc123        Confirm message sent
  python cli_outreach.py templates list           List all templates
  python cli_outreach.py sequences list -v        List sequences with details
  python cli_outreach.py metrics daily            Show daily metrics
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # -------------------------------------------------------------------------
    # Queue commands
    # -------------------------------------------------------------------------
    
    # queue (show)
    queue_parser = subparsers.add_parser("queue", help="Show today's outreach queue")
    queue_parser.set_defaults(func=cmd_queue_show)
    
    # next
    next_parser = subparsers.add_parser("next", help="Get next lead to contact")
    next_parser.set_defaults(func=cmd_queue_next)
    
    # skip
    skip_parser = subparsers.add_parser("skip", help="Skip a lead for today")
    skip_parser.add_argument("lead_id", help="Lead ID to skip")
    skip_parser.add_argument("--reason", "-r", help="Reason for skipping")
    skip_parser.set_defaults(func=cmd_queue_skip)
    
    # snooze
    snooze_parser = subparsers.add_parser("snooze", help="Snooze a lead for later")
    snooze_parser.add_argument("lead_id", help="Lead ID to snooze")
    snooze_parser.add_argument("--hours", type=int, default=24, help="Hours to snooze (default: 24)")
    snooze_parser.set_defaults(func=cmd_queue_snooze)
    
    # remove
    remove_parser = subparsers.add_parser("remove", help="Remove a lead from queue")
    remove_parser.add_argument("lead_id", help="Lead ID to remove")
    remove_parser.add_argument("--reason", "-r", help="Reason for removal")
    remove_parser.set_defaults(func=cmd_queue_remove)
    
    # -------------------------------------------------------------------------
    # Send commands
    # -------------------------------------------------------------------------
    
    # send
    send_parser = subparsers.add_parser("send", help="Prepare message for a lead")
    send_parser.add_argument("lead_id", help="Lead ID to send message to")
    send_parser.add_argument("--template", "-t", help="Template ID to use")
    send_parser.set_defaults(func=cmd_send)
    
    # confirm
    confirm_parser = subparsers.add_parser("confirm", help="Confirm a message was sent")
    confirm_parser.add_argument("message_id", help="Message ID to confirm")
    confirm_parser.set_defaults(func=cmd_confirm)
    
    # -------------------------------------------------------------------------
    # Template commands
    # -------------------------------------------------------------------------
    
    templates_parser = subparsers.add_parser("templates", help="Manage message templates")
    templates_sub = templates_parser.add_subparsers(dest="templates_command")
    
    # templates list
    tpl_list = templates_sub.add_parser("list", help="List available templates")
    tpl_list.add_argument("--channel", "-c", choices=["whatsapp", "instagram", "email"], help="Filter by channel")
    tpl_list.set_defaults(func=cmd_templates_list)
    
    # templates render
    tpl_render = templates_sub.add_parser("render", help="Render a template")
    tpl_render.add_argument("template_id", help="Template ID to render")
    tpl_render.add_argument("--business-name", "-n", help="Business name for rendering")
    tpl_render.add_argument("--location", "-l", help="Location for rendering")
    tpl_render.add_argument("--phone", "-p", help="Phone for rendering")
    tpl_render.add_argument("--instagram", "-i", help="Instagram handle for rendering")
    tpl_render.set_defaults(func=cmd_templates_render)
    
    # -------------------------------------------------------------------------
    # Sequence commands
    # -------------------------------------------------------------------------
    
    sequences_parser = subparsers.add_parser("sequences", help="Manage outreach sequences")
    sequences_sub = sequences_parser.add_subparsers(dest="sequences_command")
    
    # sequences list
    seq_list = sequences_sub.add_parser("list", help="List available sequences")
    seq_list.add_argument("--verbose", "-v", action="store_true", help="Show detailed steps")
    seq_list.set_defaults(func=cmd_sequences_list)
    
    # sequences start
    seq_start = sequences_sub.add_parser("start", help="Start a sequence for a lead")
    seq_start.add_argument("lead_id", help="Lead ID")
    seq_start.add_argument("--sequence", "-s", dest="sequence_id", help="Sequence ID (default: default_sequence)")
    seq_start.set_defaults(func=cmd_sequences_start)
    
    # sequences pause
    seq_pause = sequences_sub.add_parser("pause", help="Pause a sequence")
    seq_pause.add_argument("lead_id", help="Lead ID")
    seq_pause.add_argument("--reason", "-r", help="Reason for pausing")
    seq_pause.set_defaults(func=cmd_sequences_pause)
    
    # sequences resume
    seq_resume = sequences_sub.add_parser("resume", help="Resume a paused sequence")
    seq_resume.add_argument("lead_id", help="Lead ID")
    seq_resume.set_defaults(func=cmd_sequences_resume)
    
    # sequences status
    seq_status = sequences_sub.add_parser("status", help="Check sequence status")
    seq_status.add_argument("lead_id", help="Lead ID")
    seq_status.set_defaults(func=cmd_sequences_status)
    
    # -------------------------------------------------------------------------
    # Metrics commands
    # -------------------------------------------------------------------------
    
    metrics_parser = subparsers.add_parser("metrics", help="View outreach metrics")
    metrics_sub = metrics_parser.add_subparsers(dest="metrics_command")
    
    # metrics daily
    met_daily = metrics_sub.add_parser("daily", help="Show daily metrics")
    met_daily.set_defaults(func=cmd_metrics_daily)
    
    # metrics weekly
    met_weekly = metrics_sub.add_parser("weekly", help="Show weekly metrics")
    met_weekly.set_defaults(func=cmd_metrics_weekly)
    
    # metrics summary
    met_summary = metrics_sub.add_parser("summary", help="Show full metrics summary")
    met_summary.set_defaults(func=cmd_metrics_summary)
    
    # metrics export
    met_export = metrics_sub.add_parser("export", help="Export metrics to CSV")
    met_export.add_argument("--period", "-p", choices=["daily", "weekly", "monthly", "all"], default="all", help="Period to export")
    met_export.add_argument("--output", "-o", help="Output file path")
    met_export.set_defaults(func=cmd_metrics_export)
    
    # -------------------------------------------------------------------------
    # Campaign commands
    # -------------------------------------------------------------------------
    
    campaigns_parser = subparsers.add_parser("campaigns", help="Manage outreach campaigns")
    campaigns_sub = campaigns_parser.add_subparsers(dest="campaigns_command")
    
    # campaigns list
    camp_list = campaigns_sub.add_parser("list", help="List all campaigns")
    camp_list.add_argument("--active", "-a", action="store_true", help="Show only active campaigns")
    camp_list.set_defaults(func=cmd_campaigns_list)
    
    # campaigns create
    camp_create = campaigns_sub.add_parser("create", help="Create a new campaign")
    camp_create.add_argument("name", help="Campaign name")
    camp_create.add_argument("--description", "-d", help="Campaign description")
    camp_create.add_argument("--locations", "-l", help="Target locations (comma-separated)")
    camp_create.add_argument("--business-types", "-b", help="Target business types (comma-separated)")
    camp_create.add_argument("--min-score", type=int, default=60, help="Minimum contactability score (default: 60)")
    camp_create.add_argument("--max-score", type=int, default=100, help="Maximum contactability score (default: 100)")
    camp_create.add_argument("--channels", "-c", help="Required channels (comma-separated, default: whatsapp)")
    camp_create.add_argument("--sequence", "-s", help="Sequence ID to use (default: default_sequence)")
    camp_create.add_argument("--whatsapp-template", help="WhatsApp template ID")
    camp_create.add_argument("--instagram-template", help="Instagram template ID")
    camp_create.add_argument("--email-template", help="Email template ID")
    camp_create.set_defaults(func=cmd_campaigns_create)
    
    # campaigns show
    camp_show = campaigns_sub.add_parser("show", help="Show campaign details")
    camp_show.add_argument("campaign_id", help="Campaign ID")
    camp_show.set_defaults(func=cmd_campaigns_show)
    
    # campaigns activate
    camp_activate = campaigns_sub.add_parser("activate", help="Activate a campaign")
    camp_activate.add_argument("campaign_id", help="Campaign ID")
    camp_activate.set_defaults(func=cmd_campaigns_activate)
    
    # campaigns pause
    camp_pause = campaigns_sub.add_parser("pause", help="Pause a campaign")
    camp_pause.add_argument("campaign_id", help="Campaign ID")
    camp_pause.set_defaults(func=cmd_campaigns_pause)
    
    # campaigns delete
    camp_delete = campaigns_sub.add_parser("delete", help="Delete a campaign")
    camp_delete.add_argument("campaign_id", help="Campaign ID")
    camp_delete.set_defaults(func=cmd_campaigns_delete)
    
    # campaigns metrics
    camp_metrics = campaigns_sub.add_parser("metrics", help="Show campaign metrics")
    camp_metrics.add_argument("campaign_id", nargs="?", help="Campaign ID (optional, shows all if omitted)")
    camp_metrics.set_defaults(func=cmd_campaigns_metrics)
    
    return parser


# =============================================================================
# Main Entry Point
# =============================================================================

def main():
    """Main entry point for the CLI."""
    parser = create_parser()
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 0
    
    # Handle subcommands that need their own subparser
    if args.command == "templates" and not hasattr(args, 'func'):
        # Show templates help
        print("Usage: cli_outreach.py templates {list,render}")
        print("Run 'cli_outreach.py templates -h' for help")
        return 0
    
    if args.command == "sequences" and not hasattr(args, 'func'):
        print("Usage: cli_outreach.py sequences {list,start,pause,resume,status}")
        print("Run 'cli_outreach.py sequences -h' for help")
        return 0
    
    if args.command == "metrics" and not hasattr(args, 'func'):
        print("Usage: cli_outreach.py metrics {daily,weekly,summary,export}")
        print("Run 'cli_outreach.py metrics -h' for help")
        return 0
    
    if args.command == "campaigns" and not hasattr(args, 'func'):
        print("Usage: cli_outreach.py campaigns {list,create,show,activate,pause,delete,metrics}")
        print("Run 'cli_outreach.py campaigns -h' for help")
        return 0
    
    # Execute the command
    if hasattr(args, 'func'):
        try:
            args.func(args)
            return 0
        except Exception as e:
            logger.error(f"Command failed: {e}")
            print(f"❌ Error: {e}")
            return 1
    else:
        parser.print_help()
        return 0


if __name__ == "__main__":
    sys.exit(main())
