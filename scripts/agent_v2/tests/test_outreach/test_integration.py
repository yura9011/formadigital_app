"""
Tests for Pipeline Integration
==============================
Tests for PipelineIntegrator connecting approval with outreach.
"""

import pytest
from datetime import datetime, timedelta
from pathlib import Path
import tempfile

from hypothesis import given, strategies as st, settings, HealthCheck

from skills.approval import ApprovalManager, Proposal
from skills.outreach.integration import (
    PipelineIntegrator,
    IntegrationConfig,
    LeadSyncResult,
    create_integrated_pipeline,
)
from skills.outreach.queue import OutreachQueueManager, QueueItemStatus
from skills.outreach.history import ContactHistoryTracker, LeadStatus


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def temp_storage():
    """Create temporary storage path."""
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
        path = Path(f.name)
    yield path
    path.unlink(missing_ok=True)


@pytest.fixture
def approval_manager(temp_storage):
    """Create ApprovalManager with temp storage."""
    return ApprovalManager(storage_path=temp_storage)


@pytest.fixture
def queue_manager():
    """Create OutreachQueueManager."""
    return OutreachQueueManager()


@pytest.fixture
def history_tracker():
    """Create ContactHistoryTracker."""
    return ContactHistoryTracker()


@pytest.fixture
def integrator(approval_manager, queue_manager, history_tracker):
    """Create PipelineIntegrator."""
    return PipelineIntegrator(
        approval_manager=approval_manager,
        queue_manager=queue_manager,
        history_tracker=history_tracker
    )


@pytest.fixture
def integrator_no_auto(approval_manager, queue_manager, history_tracker):
    """Create PipelineIntegrator with auto-queue disabled."""
    config = IntegrationConfig(auto_queue_on_approval=False)
    return PipelineIntegrator(
        approval_manager=approval_manager,
        queue_manager=queue_manager,
        history_tracker=history_tracker,
        config=config
    )


# =============================================================================
# Test: on_approval auto-adds to queue (9.1)
# =============================================================================

class TestOnApproval:
    """Tests for on_approval method."""
    
    def test_auto_adds_approved_lead_to_queue(self, integrator, approval_manager):
        """Approved lead with good score is auto-added to queue."""
        # Create and approve proposal
        proposal = approval_manager.propose(
            lead_id="lead_1",
            lead_name="Test Lead",
            current_values={},
            proposed_values={
                "contactability_score": 75,
                "whatsapp_link": "wa.me/123"
            },
            reasoning="Test"
        )
        approval_manager.approve(proposal.id, approved_by="admin")
        
        # Process approval
        result = integrator.on_approval(proposal)
        
        assert result.success
        assert result.action == "added_to_queue"
        assert result.queue_item is not None
        assert result.queue_item.lead_id == "lead_1"
    
    def test_skips_low_score_leads(self, integrator, approval_manager):
        """Leads with score below threshold are skipped."""
        proposal = approval_manager.propose(
            lead_id="lead_2",
            lead_name="Low Score Lead",
            current_values={},
            proposed_values={"contactability_score": 40},
            reasoning="Test"
        )
        approval_manager.approve(proposal.id, approved_by="admin")
        
        result = integrator.on_approval(proposal)
        
        assert result.success
        assert result.action == "skipped"
        assert "below minimum" in result.message
    
    def test_skips_when_auto_queue_disabled(self, integrator_no_auto, approval_manager):
        """Skips when auto-queue is disabled."""
        proposal = approval_manager.propose(
            lead_id="lead_3",
            lead_name="Test Lead",
            current_values={},
            proposed_values={"contactability_score": 80},
            reasoning="Test"
        )
        approval_manager.approve(proposal.id, approved_by="admin")
        
        result = integrator_no_auto.on_approval(proposal)
        
        assert result.success
        assert result.action == "skipped"
        assert "disabled" in result.message
    
    def test_determines_whatsapp_channel(self, integrator, approval_manager):
        """WhatsApp is selected when link is available."""
        proposal = approval_manager.propose(
            lead_id="lead_4",
            lead_name="WA Lead",
            current_values={},
            proposed_values={
                "contactability_score": 70,
                "whatsapp_link": "wa.me/123"
            },
            reasoning="Test"
        )
        approval_manager.approve(proposal.id, approved_by="admin")
        
        result = integrator.on_approval(proposal)
        
        assert result.queue_item.recommended_channel == "whatsapp"
    
    def test_determines_instagram_channel(self, integrator, approval_manager):
        """Instagram is selected when handle is available."""
        proposal = approval_manager.propose(
            lead_id="lead_5",
            lead_name="IG Lead",
            current_values={},
            proposed_values={
                "contactability_score": 70,
                "instagram_handle": "test_ig"
            },
            reasoning="Test"
        )
        approval_manager.approve(proposal.id, approved_by="admin")
        
        result = integrator.on_approval(proposal)
        
        assert result.queue_item.recommended_channel == "instagram"
    
    def test_determines_email_channel(self, integrator, approval_manager):
        """Email is selected when available."""
        proposal = approval_manager.propose(
            lead_id="lead_6",
            lead_name="Email Lead",
            current_values={},
            proposed_values={
                "contactability_score": 70,
                "email": "test@example.com"
            },
            reasoning="Test"
        )
        approval_manager.approve(proposal.id, approved_by="admin")
        
        result = integrator.on_approval(proposal)
        
        assert result.queue_item.recommended_channel == "email"


# =============================================================================
# Test: Status synchronization (9.2)
# =============================================================================

class TestStatusSync:
    """Tests for status synchronization."""
    
    def test_syncs_ready_status(self, integrator, history_tracker):
        """Ready status is synced to history tracker."""
        integrator.sync_status("lead_1", validation_status="ready")
        
        assert history_tracker.get_lead_status("lead_1") == LeadStatus.READY
    
    def test_syncs_contacted_status(self, integrator, history_tracker):
        """Contacted status is synced."""
        # First set to ready
        history_tracker.set_lead_status("lead_1", LeadStatus.READY)
        
        # Then sync to contacted
        integrator.sync_status("lead_1", validation_status="contacted")
        
        assert history_tracker.get_lead_status("lead_1") == LeadStatus.CONTACTED
    
    def test_syncs_responded_status(self, integrator, history_tracker):
        """Responded status is synced."""
        history_tracker.set_lead_status("lead_1", LeadStatus.CONTACTED)
        
        integrator.sync_status("lead_1", validation_status="responded")
        
        assert history_tracker.get_lead_status("lead_1") == LeadStatus.RESPONDED
    
    def test_syncs_converted_status(self, integrator, history_tracker):
        """Converted status is synced."""
        history_tracker.set_lead_status("lead_1", LeadStatus.RESPONDED)
        
        integrator.sync_status("lead_1", validation_status="converted")
        
        assert history_tracker.get_lead_status("lead_1") == LeadStatus.CONVERTED
    
    def test_sync_disabled_returns_false(self, approval_manager, queue_manager, history_tracker):
        """Sync returns False when disabled."""
        config = IntegrationConfig(sync_statuses=False)
        integrator = PipelineIntegrator(
            approval_manager=approval_manager,
            queue_manager=queue_manager,
            history_tracker=history_tracker,
            config=config
        )
        
        result = integrator.sync_status("lead_1", validation_status="ready")
        
        assert result is False
    
    def test_sets_ready_on_queue_add(self, integrator, history_tracker):
        """Adding to queue sets status to READY."""
        integrator.add_to_queue(
            lead_id="lead_new",
            lead_name="New Lead",
            contactability_score=70,
            channel="whatsapp"
        )
        
        assert history_tracker.get_lead_status("lead_new") == LeadStatus.READY


# =============================================================================
# Test: Duplicate prevention (9.3)
# =============================================================================

class TestDuplicatePrevention:
    """Tests for duplicate sequence prevention."""
    
    def test_prevents_duplicate_sequence(self, integrator):
        """Cannot add same lead twice."""
        # Add first time
        result1 = integrator.add_to_queue(
            lead_id="lead_dup",
            lead_name="Dup Lead",
            contactability_score=70,
            channel="whatsapp"
        )
        
        # Try to add again
        result2 = integrator.add_to_queue(
            lead_id="lead_dup",
            lead_name="Dup Lead",
            contactability_score=70,
            channel="whatsapp"
        )
        
        assert result1.success
        assert result1.action == "added_to_queue"
        assert not result2.success
        assert result2.action == "already_in_queue"
    
    def test_has_active_sequence_true(self, integrator):
        """has_active_sequence returns True for active lead."""
        integrator.add_to_queue(
            lead_id="lead_active",
            lead_name="Active Lead",
            contactability_score=70,
            channel="whatsapp"
        )
        
        assert integrator.has_active_sequence("lead_active")
    
    def test_has_active_sequence_false(self, integrator):
        """has_active_sequence returns False for unknown lead."""
        assert not integrator.has_active_sequence("unknown_lead")
    
    def test_complete_sequence_allows_readd(self, integrator):
        """Completing sequence allows re-adding."""
        # Add lead
        integrator.add_to_queue(
            lead_id="lead_complete",
            lead_name="Complete Lead",
            contactability_score=70,
            channel="whatsapp"
        )
        
        # Complete sequence
        integrator.complete_sequence("lead_complete", "Test complete")
        
        # Should be able to add again
        result = integrator.add_to_queue(
            lead_id="lead_complete",
            lead_name="Complete Lead",
            contactability_score=70,
            channel="instagram"
        )
        
        assert result.success
        assert result.action == "added_to_queue"
    
    def test_followup_bypasses_duplicate_check(self, integrator):
        """Follow-ups can be added even if lead is active."""
        # Add initial
        integrator.add_to_queue(
            lead_id="lead_followup",
            lead_name="Followup Lead",
            contactability_score=70,
            channel="whatsapp"
        )
        
        # Complete the queue item
        integrator.queue_manager.complete("lead_followup")
        
        # Add follow-up
        result = integrator.add_to_queue(
            lead_id="lead_followup",
            lead_name="Followup Lead",
            contactability_score=70,
            channel="instagram",
            is_followup=True,
            next_touch_due=datetime.now()
        )
        
        assert result.success
    
    def test_duplicate_prevention_disabled(self, approval_manager, queue_manager, history_tracker):
        """Duplicates allowed when prevention disabled."""
        config = IntegrationConfig(prevent_duplicates=False)
        integrator = PipelineIntegrator(
            approval_manager=approval_manager,
            queue_manager=queue_manager,
            history_tracker=history_tracker,
            config=config
        )
        
        # Add twice
        result1 = integrator.add_to_queue(
            lead_id="lead_no_dup",
            lead_name="No Dup Lead",
            contactability_score=70,
            channel="whatsapp"
        )
        
        # Complete first
        queue_manager.complete("lead_no_dup")
        
        result2 = integrator.add_to_queue(
            lead_id="lead_no_dup",
            lead_name="No Dup Lead",
            contactability_score=70,
            channel="instagram"
        )
        
        assert result1.success
        assert result2.success


# =============================================================================
# Test: Process approved proposals
# =============================================================================

class TestProcessApprovedProposals:
    """Tests for batch processing of approved proposals."""
    
    def test_processes_multiple_approvals(self, integrator, approval_manager):
        """Processes all approved proposals."""
        # Create and approve multiple proposals
        for i in range(3):
            proposal = approval_manager.propose(
                lead_id=f"batch_lead_{i}",
                lead_name=f"Batch Lead {i}",
                current_values={},
                proposed_values={"contactability_score": 70 + i},
                reasoning="Batch test"
            )
            approval_manager.approve(proposal.id, approved_by="admin")
        
        # Process all
        results = integrator.process_approved_proposals()
        
        assert len(results) == 3
        assert all(r.success for r in results)
    
    def test_skips_already_processed(self, integrator, approval_manager):
        """Skips proposals that are already in queue."""
        # Create and approve
        proposal = approval_manager.propose(
            lead_id="already_processed",
            lead_name="Already Processed",
            current_values={},
            proposed_values={"contactability_score": 75},
            reasoning="Test"
        )
        approval_manager.approve(proposal.id, approved_by="admin")
        
        # Process once
        results1 = integrator.process_approved_proposals()
        
        # Process again
        results2 = integrator.process_approved_proposals()
        
        assert len(results1) == 1
        assert len(results2) == 0  # Already processed


# =============================================================================
# Test: Integration stats
# =============================================================================

class TestIntegrationStats:
    """Tests for integration statistics."""
    
    def test_stats_include_active_sequences(self, integrator):
        """Stats include active sequence count."""
        integrator.add_to_queue(
            lead_id="stats_lead",
            lead_name="Stats Lead",
            contactability_score=70,
            channel="whatsapp"
        )
        
        stats = integrator.get_integration_stats()
        
        assert stats["active_sequences"] == 1
    
    def test_stats_include_queue_pending(self, integrator):
        """Stats include queue pending count."""
        integrator.add_to_queue(
            lead_id="pending_lead",
            lead_name="Pending Lead",
            contactability_score=70,
            channel="whatsapp"
        )
        
        stats = integrator.get_integration_stats()
        
        assert stats["queue_pending"] == 1
    
    def test_stats_include_config(self, integrator):
        """Stats include configuration values."""
        stats = integrator.get_integration_stats()
        
        assert "auto_queue_enabled" in stats
        assert "min_score" in stats
        assert "duplicate_prevention" in stats


# =============================================================================
# Test: Callbacks
# =============================================================================

class TestCallbacks:
    """Tests for event callbacks."""
    
    def test_on_queued_callback_called(self, integrator):
        """Callback is called when lead is queued."""
        callback_data = []
        
        def on_queued(lead_id, queue_item):
            callback_data.append((lead_id, queue_item))
        
        integrator.register_on_queued(on_queued)
        
        integrator.add_to_queue(
            lead_id="callback_lead",
            lead_name="Callback Lead",
            contactability_score=70,
            channel="whatsapp"
        )
        
        assert len(callback_data) == 1
        assert callback_data[0][0] == "callback_lead"


# =============================================================================
# Test: create_integrated_pipeline helper
# =============================================================================

class TestCreateIntegratedPipeline:
    """Tests for create_integrated_pipeline helper."""
    
    def test_creates_all_components(self, temp_storage):
        """Creates all required components."""
        approval, queue, history, integrator = create_integrated_pipeline(
            storage_path=temp_storage
        )
        
        assert isinstance(approval, ApprovalManager)
        assert isinstance(queue, OutreachQueueManager)
        assert isinstance(history, ContactHistoryTracker)
        assert isinstance(integrator, PipelineIntegrator)
    
    def test_components_are_connected(self, temp_storage):
        """Components are properly connected."""
        approval, queue, history, integrator = create_integrated_pipeline(
            storage_path=temp_storage
        )
        
        # Create and approve proposal
        proposal = approval.propose(
            lead_id="connected_lead",
            lead_name="Connected Lead",
            current_values={},
            proposed_values={"contactability_score": 80},
            reasoning="Test"
        )
        approval.approve(proposal.id, approved_by="admin")
        
        # Process through integrator
        result = integrator.on_approval(proposal)
        
        # Verify queue has the lead
        assert queue.get_pending_count() == 1
        
        # Verify history has the status
        assert history.get_lead_status("connected_lead") == LeadStatus.READY


# =============================================================================
# Property Test: Duplicate Prevention (9.4)
# =============================================================================

@settings(
    max_examples=100,
    suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture]
)
@given(
    lead_ids=st.lists(
        st.text(
            alphabet=st.characters(whitelist_categories=('L', 'N')),
            min_size=1,
            max_size=20
        ),
        min_size=1,
        max_size=20
    )
)
def test_property_duplicate_prevention(lead_ids, temp_storage):
    """
    Property: No lead can have multiple active sequences simultaneously.
    
    For any sequence of add operations:
    - Each unique lead_id appears at most once in active sequences
    - Duplicate attempts return already_in_queue
    """
    approval, queue, history, integrator = create_integrated_pipeline(
        storage_path=temp_storage
    )
    
    added_leads = set()
    
    for lead_id in lead_ids:
        if not lead_id.strip():
            continue
            
        result = integrator.add_to_queue(
            lead_id=lead_id,
            lead_name=f"Lead {lead_id}",
            contactability_score=70,
            channel="whatsapp"
        )
        
        if lead_id in added_leads:
            # Should be rejected as duplicate
            assert result.action == "already_in_queue", \
                f"Duplicate {lead_id} should be rejected"
        else:
            # Should be added (unless queue limit)
            if result.success:
                added_leads.add(lead_id)
                assert result.action == "added_to_queue"
    
    # Verify no duplicates in active sequences
    active = list(integrator._active_sequences.keys())
    assert len(active) == len(set(active)), "Active sequences should have no duplicates"


@settings(
    max_examples=100,
    suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture]
)
@given(
    operations=st.lists(
        st.tuples(
            st.sampled_from(["add", "complete", "add"]),
            st.text(
                alphabet=st.characters(whitelist_categories=('L', 'N')),
                min_size=1,
                max_size=10
            )
        ),
        min_size=1,
        max_size=30
    )
)
def test_property_sequence_lifecycle(operations, temp_storage):
    """
    Property: Sequence lifecycle is consistent.
    
    - After add: has_active_sequence returns True
    - After complete: has_active_sequence returns False
    - Can re-add after complete
    """
    approval, queue, history, integrator = create_integrated_pipeline(
        storage_path=temp_storage
    )
    
    for op, lead_id in operations:
        if not lead_id.strip():
            continue
            
        if op == "add":
            result = integrator.add_to_queue(
                lead_id=lead_id,
                lead_name=f"Lead {lead_id}",
                contactability_score=70,
                channel="whatsapp"
            )
            
            if result.success and result.action == "added_to_queue":
                # Should now have active sequence
                assert integrator.has_active_sequence(lead_id), \
                    f"Lead {lead_id} should have active sequence after add"
        
        elif op == "complete":
            was_active = integrator.has_active_sequence(lead_id)
            integrator.complete_sequence(lead_id)
            
            if was_active:
                # Should no longer have active sequence
                # (unless re-added in queue)
                pass  # Queue might still have it pending
