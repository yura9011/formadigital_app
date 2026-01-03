"""
Metrics Dashboard
=================
Calculates and displays outreach metrics.

Implements Requirements 8.1-8.4:
- Pipeline metrics (leads processed, messages sent, etc.)
- Period-based aggregations (daily, weekly, monthly)
- Channel breakdown
- Funnel visualization data
"""

import csv
import logging
from dataclasses import dataclass, field
from datetime import datetime, date, timedelta
from enum import Enum
from io import StringIO
from typing import Optional

from .history import ContactHistoryTracker, ContactDirection, LeadStatus

logger = logging.getLogger(__name__)


# =============================================================================
# Enums
# =============================================================================

class Period(str, Enum):
    """Time period for aggregations."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    ALL_TIME = "all_time"


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class PipelineMetrics:
    """
    Overall pipeline metrics.
    """
    period: str
    start_date: date
    end_date: date
    
    # Volume metrics
    leads_processed: int = 0
    messages_sent: int = 0
    messages_received: int = 0
    
    # Rate metrics
    response_rate: float = 0.0
    conversion_rate: float = 0.0
    
    # Status counts
    leads_contacted: int = 0
    leads_responded: int = 0
    leads_converted: int = 0
    leads_not_interested: int = 0
    
    # Channel breakdown
    whatsapp_sent: int = 0
    instagram_sent: int = 0
    email_sent: int = 0
    
    def to_dict(self) -> dict:
        return {
            "period": self.period,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "leads_processed": self.leads_processed,
            "messages_sent": self.messages_sent,
            "messages_received": self.messages_received,
            "response_rate": round(self.response_rate, 4),
            "conversion_rate": round(self.conversion_rate, 4),
            "leads_contacted": self.leads_contacted,
            "leads_responded": self.leads_responded,
            "leads_converted": self.leads_converted,
            "leads_not_interested": self.leads_not_interested,
            "whatsapp_sent": self.whatsapp_sent,
            "instagram_sent": self.instagram_sent,
            "email_sent": self.email_sent,
        }


@dataclass
class ChannelMetrics:
    """
    Metrics for a specific channel.
    """
    channel: str
    messages_sent: int = 0
    messages_received: int = 0
    response_rate: float = 0.0
    avg_response_time_hours: Optional[float] = None
    
    def to_dict(self) -> dict:
        return {
            "channel": self.channel,
            "messages_sent": self.messages_sent,
            "messages_received": self.messages_received,
            "response_rate": round(self.response_rate, 4),
            "avg_response_time_hours": self.avg_response_time_hours,
        }


@dataclass
class FunnelStage:
    """
    A stage in the conversion funnel.
    """
    name: str
    count: int
    percentage: float = 0.0
    
    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "count": self.count,
            "percentage": round(self.percentage, 2),
        }


@dataclass
class FunnelData:
    """
    Complete funnel visualization data.
    """
    stages: list[FunnelStage] = field(default_factory=list)
    total_leads: int = 0
    
    def to_dict(self) -> dict:
        return {
            "total_leads": self.total_leads,
            "stages": [s.to_dict() for s in self.stages],
        }


# =============================================================================
# Metrics Dashboard
# =============================================================================

class MetricsDashboard:
    """
    Calculates and displays outreach metrics.
    
    Features:
    - Calculate metrics for different periods
    - Channel breakdown
    - Funnel visualization
    - Export to CSV
    """
    
    def __init__(self, history_tracker: ContactHistoryTracker):
        self.history = history_tracker
    
    def get_pipeline_metrics(
        self,
        period: Period = Period.ALL_TIME,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> PipelineMetrics:
        """
        Get pipeline metrics for a period.
        
        Args:
            period: Time period
            start_date: Custom start date (for DAILY/custom)
            end_date: Custom end date
            
        Returns:
            PipelineMetrics
        """
        # Calculate date range
        today = date.today()
        
        if period == Period.DAILY:
            start = start_date or today
            end = end_date or today
        elif period == Period.WEEKLY:
            start = today - timedelta(days=7)
            end = today
        elif period == Period.MONTHLY:
            start = today - timedelta(days=30)
            end = today
        else:  # ALL_TIME
            start = date(2020, 1, 1)  # Far past
            end = today
        
        # Get all contacts in range
        all_entries = list(self.history._entries.values())
        entries_in_range = [
            e for e in all_entries
            if start <= e.timestamp.date() <= end
        ]
        
        # Calculate metrics
        outbound = [e for e in entries_in_range if e.direction == ContactDirection.OUTBOUND]
        inbound = [e for e in entries_in_range if e.direction == ContactDirection.INBOUND]
        
        # Channel breakdown
        whatsapp = [e for e in outbound if e.channel == "whatsapp"]
        instagram = [e for e in outbound if e.channel == "instagram"]
        email = [e for e in outbound if e.channel == "email"]
        
        # Status counts
        status_counts = {}
        for status in self.history._lead_statuses.values():
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # Calculate rates
        response_rate = len(inbound) / len(outbound) if outbound else 0.0
        
        contacted = status_counts.get(LeadStatus.CONTACTED, 0)
        responded = status_counts.get(LeadStatus.RESPONDED, 0)
        converted = status_counts.get(LeadStatus.CONVERTED, 0)
        
        conversion_rate = converted / contacted if contacted > 0 else 0.0
        
        return PipelineMetrics(
            period=period.value,
            start_date=start,
            end_date=end,
            leads_processed=len(self.history._lead_statuses),
            messages_sent=len(outbound),
            messages_received=len(inbound),
            response_rate=response_rate,
            conversion_rate=conversion_rate,
            leads_contacted=contacted + responded + converted,
            leads_responded=responded + converted,
            leads_converted=converted,
            leads_not_interested=status_counts.get(LeadStatus.NOT_INTERESTED, 0),
            whatsapp_sent=len(whatsapp),
            instagram_sent=len(instagram),
            email_sent=len(email),
        )
    
    def get_channel_metrics(self) -> dict[str, ChannelMetrics]:
        """
        Get metrics broken down by channel.
        
        Returns:
            Dict of channel -> ChannelMetrics
        """
        channels = ["whatsapp", "instagram", "email"]
        result = {}
        
        for channel in channels:
            all_entries = list(self.history._entries.values())
            channel_entries = [e for e in all_entries if e.channel == channel]
            
            outbound = [e for e in channel_entries if e.direction == ContactDirection.OUTBOUND]
            inbound = [e for e in channel_entries if e.direction == ContactDirection.INBOUND]
            
            response_rate = len(inbound) / len(outbound) if outbound else 0.0
            
            result[channel] = ChannelMetrics(
                channel=channel,
                messages_sent=len(outbound),
                messages_received=len(inbound),
                response_rate=response_rate,
            )
        
        return result
    
    def get_funnel_data(self) -> FunnelData:
        """
        Get funnel visualization data.
        
        Returns:
            FunnelData with stages
        """
        status_counts = {}
        for status in self.history._lead_statuses.values():
            status_counts[status] = status_counts.get(status, 0) + 1
        
        total = len(self.history._lead_statuses)
        
        # Define funnel stages
        stages = [
            ("Leads", total),
            ("Contactados", 
             status_counts.get(LeadStatus.CONTACTED, 0) +
             status_counts.get(LeadStatus.RESPONDED, 0) +
             status_counts.get(LeadStatus.CONVERTED, 0) +
             status_counts.get(LeadStatus.NOT_INTERESTED, 0)),
            ("Respondieron", 
             status_counts.get(LeadStatus.RESPONDED, 0) +
             status_counts.get(LeadStatus.CONVERTED, 0)),
            ("Convertidos", status_counts.get(LeadStatus.CONVERTED, 0)),
        ]
        
        funnel_stages = []
        for name, count in stages:
            percentage = (count / total * 100) if total > 0 else 0
            funnel_stages.append(FunnelStage(
                name=name,
                count=count,
                percentage=percentage
            ))
        
        return FunnelData(
            stages=funnel_stages,
            total_leads=total
        )
    
    def get_daily_trend(self, days: int = 7) -> list[dict]:
        """
        Get daily metrics trend.
        
        Args:
            days: Number of days to include
            
        Returns:
            List of daily metrics dicts
        """
        trend = []
        today = date.today()
        
        for i in range(days - 1, -1, -1):
            day = today - timedelta(days=i)
            metrics = self.get_pipeline_metrics(
                Period.DAILY,
                start_date=day,
                end_date=day
            )
            trend.append({
                "date": day.isoformat(),
                "messages_sent": metrics.messages_sent,
                "messages_received": metrics.messages_received,
                "response_rate": metrics.response_rate,
            })
        
        return trend
    
    def export_to_csv(self, period: Period = Period.ALL_TIME) -> str:
        """
        Export metrics to CSV format.
        
        Args:
            period: Time period
            
        Returns:
            CSV string
        """
        metrics = self.get_pipeline_metrics(period)
        channel_metrics = self.get_channel_metrics()
        funnel = self.get_funnel_data()
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Pipeline metrics
        writer.writerow(["Pipeline Metrics"])
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Period", metrics.period])
        writer.writerow(["Start Date", metrics.start_date])
        writer.writerow(["End Date", metrics.end_date])
        writer.writerow(["Leads Processed", metrics.leads_processed])
        writer.writerow(["Messages Sent", metrics.messages_sent])
        writer.writerow(["Messages Received", metrics.messages_received])
        writer.writerow(["Response Rate", f"{metrics.response_rate:.2%}"])
        writer.writerow(["Conversion Rate", f"{metrics.conversion_rate:.2%}"])
        writer.writerow([])
        
        # Channel breakdown
        writer.writerow(["Channel Breakdown"])
        writer.writerow(["Channel", "Sent", "Received", "Response Rate"])
        for channel, cm in channel_metrics.items():
            writer.writerow([
                channel,
                cm.messages_sent,
                cm.messages_received,
                f"{cm.response_rate:.2%}"
            ])
        writer.writerow([])
        
        # Funnel
        writer.writerow(["Conversion Funnel"])
        writer.writerow(["Stage", "Count", "Percentage"])
        for stage in funnel.stages:
            writer.writerow([stage.name, stage.count, f"{stage.percentage:.1f}%"])
        
        return output.getvalue()
    
    def print_summary(self) -> str:
        """
        Generate a text summary of metrics.
        
        Returns:
            Formatted summary string
        """
        metrics = self.get_pipeline_metrics()
        channel_metrics = self.get_channel_metrics()
        funnel = self.get_funnel_data()
        
        lines = [
            "═" * 50,
            "📊 OUTREACH METRICS SUMMARY",
            "═" * 50,
            "",
            f"📈 Pipeline Overview ({metrics.period})",
            f"   Leads procesados: {metrics.leads_processed}",
            f"   Mensajes enviados: {metrics.messages_sent}",
            f"   Respuestas recibidas: {metrics.messages_received}",
            f"   Tasa de respuesta: {metrics.response_rate:.1%}",
            f"   Tasa de conversión: {metrics.conversion_rate:.1%}",
            "",
            "📱 Por Canal:",
        ]
        
        for channel, cm in channel_metrics.items():
            emoji = {"whatsapp": "💬", "instagram": "📸", "email": "📧"}.get(channel, "📨")
            lines.append(f"   {emoji} {channel.capitalize()}: {cm.messages_sent} enviados, {cm.response_rate:.1%} respuesta")
        
        lines.extend([
            "",
            "🔄 Funnel de Conversión:",
        ])
        
        for stage in funnel.stages:
            bar_length = int(stage.percentage / 5)
            bar = "█" * bar_length + "░" * (20 - bar_length)
            lines.append(f"   {stage.name}: {stage.count} ({stage.percentage:.1f}%) {bar}")
        
        lines.append("═" * 50)
        
        return "\n".join(lines)


# =============================================================================
# Quick Test
# =============================================================================

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    print("Testing MetricsDashboard...")
    
    # Create tracker with sample data
    tracker = ContactHistoryTracker()
    
    # Add some sample contacts
    for i in range(10):
        tracker.set_lead_status(f"lead_{i}", LeadStatus.READY)
        tracker.log_outbound(f"lead_{i}", "whatsapp", f"Message {i}")
    
    # Some responses
    for i in range(4):
        tracker.log_inbound(f"lead_{i}", "whatsapp", "Interested!")
    
    # Some conversions
    tracker.transition_status("lead_0", LeadStatus.CONVERTED, "Signed up")
    tracker.transition_status("lead_1", LeadStatus.CONVERTED, "Signed up")
    
    # Create dashboard
    dashboard = MetricsDashboard(tracker)
    
    # Print summary
    print(dashboard.print_summary())
    
    # Get funnel
    funnel = dashboard.get_funnel_data()
    print(f"\nFunnel data: {funnel.to_dict()}")
    
    # Export CSV
    csv_data = dashboard.export_to_csv()
    print(f"\nCSV export preview:\n{csv_data[:500]}...")
    
    print("\n✅ MetricsDashboard test complete")
