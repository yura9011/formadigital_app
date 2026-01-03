"""
Metrics Dashboard Tests
=======================
Tests for the metrics dashboard.

**Validates: Requirements 8.1-8.4**
"""

import pytest
from datetime import date

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from skills.outreach.metrics import (
    MetricsDashboard,
    PipelineMetrics,
    ChannelMetrics,
    FunnelData,
    Period,
)
from skills.outreach.history import (
    ContactHistoryTracker,
    LeadStatus,
)


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def tracker_with_data():
    """Create a tracker with sample data."""
    tracker = ContactHistoryTracker()
    
    # Add leads with various statuses
    for i in range(10):
        tracker.set_lead_status(f"lead_{i}", LeadStatus.READY)
        tracker.log_outbound(f"lead_{i}", "whatsapp", f"Message {i}")
    
    # Some responses
    for i in range(4):
        tracker.log_inbound(f"lead_{i}", "whatsapp", "Response")
    
    # Some conversions
    tracker.transition_status("lead_0", LeadStatus.CONVERTED, "Converted")
    tracker.transition_status("lead_1", LeadStatus.CONVERTED, "Converted")
    
    # Some not interested
    tracker.transition_status("lead_5", LeadStatus.NOT_INTERESTED, "Not interested")
    
    return tracker


@pytest.fixture
def empty_tracker():
    """Create an empty tracker."""
    return ContactHistoryTracker()


# =============================================================================
# Pipeline Metrics Tests
# =============================================================================

class TestPipelineMetrics:
    """Tests for pipeline metrics."""
    
    def test_get_metrics_with_data(self, tracker_with_data):
        """Test getting metrics with data."""
        dashboard = MetricsDashboard(tracker_with_data)
        metrics = dashboard.get_pipeline_metrics()
        
        assert metrics.leads_processed == 10
        assert metrics.messages_sent == 10
        assert metrics.messages_received == 4
        assert metrics.response_rate == 0.4
    
    def test_get_metrics_empty(self, empty_tracker):
        """Test getting metrics with no data."""
        dashboard = MetricsDashboard(empty_tracker)
        metrics = dashboard.get_pipeline_metrics()
        
        assert metrics.leads_processed == 0
        assert metrics.messages_sent == 0
        assert metrics.response_rate == 0.0
    
    def test_metrics_to_dict(self, tracker_with_data):
        """Test converting metrics to dict."""
        dashboard = MetricsDashboard(tracker_with_data)
        metrics = dashboard.get_pipeline_metrics()
        
        d = metrics.to_dict()
        assert "leads_processed" in d
        assert "response_rate" in d
        assert isinstance(d["start_date"], str)
    
    def test_period_filtering(self, tracker_with_data):
        """Test period-based filtering."""
        dashboard = MetricsDashboard(tracker_with_data)
        
        # All time should have data
        all_time = dashboard.get_pipeline_metrics(Period.ALL_TIME)
        assert all_time.messages_sent > 0
        
        # Daily for today should have data (just added)
        daily = dashboard.get_pipeline_metrics(Period.DAILY)
        assert daily.messages_sent > 0


# =============================================================================
# Channel Metrics Tests
# =============================================================================

class TestChannelMetrics:
    """Tests for channel metrics."""
    
    def test_get_channel_metrics(self, tracker_with_data):
        """Test getting channel breakdown."""
        dashboard = MetricsDashboard(tracker_with_data)
        channel_metrics = dashboard.get_channel_metrics()
        
        assert "whatsapp" in channel_metrics
        assert "instagram" in channel_metrics
        assert "email" in channel_metrics
        
        # WhatsApp should have data
        wa = channel_metrics["whatsapp"]
        assert wa.messages_sent == 10
        assert wa.messages_received == 4
    
    def test_channel_metrics_to_dict(self, tracker_with_data):
        """Test converting channel metrics to dict."""
        dashboard = MetricsDashboard(tracker_with_data)
        channel_metrics = dashboard.get_channel_metrics()
        
        wa = channel_metrics["whatsapp"]
        d = wa.to_dict()
        
        assert d["channel"] == "whatsapp"
        assert "messages_sent" in d


# =============================================================================
# Funnel Tests
# =============================================================================

class TestFunnelData:
    """Tests for funnel visualization."""
    
    def test_get_funnel_data(self, tracker_with_data):
        """Test getting funnel data."""
        dashboard = MetricsDashboard(tracker_with_data)
        funnel = dashboard.get_funnel_data()
        
        assert funnel.total_leads == 10
        assert len(funnel.stages) == 4
        
        # First stage should be all leads
        assert funnel.stages[0].name == "Leads"
        assert funnel.stages[0].count == 10
        assert funnel.stages[0].percentage == 100.0
    
    def test_funnel_to_dict(self, tracker_with_data):
        """Test converting funnel to dict."""
        dashboard = MetricsDashboard(tracker_with_data)
        funnel = dashboard.get_funnel_data()
        
        d = funnel.to_dict()
        assert "total_leads" in d
        assert "stages" in d
        assert len(d["stages"]) == 4
    
    def test_funnel_empty(self, empty_tracker):
        """Test funnel with no data."""
        dashboard = MetricsDashboard(empty_tracker)
        funnel = dashboard.get_funnel_data()
        
        assert funnel.total_leads == 0
        for stage in funnel.stages:
            assert stage.count == 0


# =============================================================================
# Export Tests
# =============================================================================

class TestExport:
    """Tests for export functionality."""
    
    def test_export_csv(self, tracker_with_data):
        """Test CSV export."""
        dashboard = MetricsDashboard(tracker_with_data)
        csv_data = dashboard.export_to_csv()
        
        assert "Pipeline Metrics" in csv_data
        assert "Channel Breakdown" in csv_data
        assert "Conversion Funnel" in csv_data
        assert "whatsapp" in csv_data
    
    def test_print_summary(self, tracker_with_data):
        """Test text summary."""
        dashboard = MetricsDashboard(tracker_with_data)
        summary = dashboard.print_summary()
        
        assert "OUTREACH METRICS" in summary
        assert "Pipeline Overview" in summary
        assert "Por Canal" in summary
        assert "Funnel" in summary


# =============================================================================
# Daily Trend Tests
# =============================================================================

class TestDailyTrend:
    """Tests for daily trend."""
    
    def test_get_daily_trend(self, tracker_with_data):
        """Test getting daily trend."""
        dashboard = MetricsDashboard(tracker_with_data)
        trend = dashboard.get_daily_trend(days=7)
        
        assert len(trend) == 7
        assert "date" in trend[0]
        assert "messages_sent" in trend[0]
        
        # Today should have data
        today = date.today().isoformat()
        today_data = next((d for d in trend if d["date"] == today), None)
        assert today_data is not None
        assert today_data["messages_sent"] > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
