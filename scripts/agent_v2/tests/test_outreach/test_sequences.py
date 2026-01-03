"""
Sequence Manager Tests
======================
Property-based tests for sequence management.

**Property 2: Sequence Progression Correctness**
**Property 3: Channel Rotation Consistency**
**Validates: Requirements 2.1, 2.4, 2.6**
"""

import pytest
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from datetime import datetime, timedelta

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from skills.outreach.sequences import (
    SequenceManager,
    Sequence,
    SequenceStep,
    LeadSequenceState
)


# =============================================================================
# Strategies
# =============================================================================

@st.composite
def sequence_step_strategy(draw, position: int = 1):
    """Generate a sequence step."""
    return SequenceStep(
        position=position,
        channel=draw(st.sampled_from(["whatsapp", "instagram", "email"])),
        template_id=draw(st.text(min_size=1, max_size=20).filter(lambda x: x.strip())),
        delay_hours=draw(st.integers(min_value=0, max_value=336)),
        description=draw(st.text(min_size=0, max_size=50))
    )


@st.composite
def sequence_strategy(draw):
    """Generate a sequence with steps."""
    num_steps = draw(st.integers(min_value=1, max_value=10))
    steps = []
    for i in range(1, num_steps + 1):
        step = draw(sequence_step_strategy(position=i))
        steps.append(step)
    
    return Sequence(
        id=draw(st.text(min_size=1, max_size=20).filter(lambda x: x.strip() and x.isalnum())),
        name=draw(st.text(min_size=1, max_size=50).filter(lambda x: x.strip())),
        steps=steps,
        max_attempts=draw(st.integers(min_value=num_steps, max_value=15)),
        active=True
    )


@st.composite
def lead_id_strategy(draw):
    """Generate a lead ID."""
    return f"lead_{draw(st.integers(min_value=1, max_value=10000))}"


# =============================================================================
# Unit Tests
# =============================================================================

class TestSequenceStep:
    """Tests for SequenceStep."""
    
    def test_create_step(self):
        """Test creating a sequence step."""
        step = SequenceStep(
            position=1,
            channel="whatsapp",
            template_id="test_template",
            delay_hours=24
        )
        assert step.position == 1
        assert step.channel == "whatsapp"
        assert step.delay_hours == 24
    
    def test_step_to_dict(self):
        """Test converting step to dict."""
        step = SequenceStep(
            position=1,
            channel="whatsapp",
            template_id="test",
            delay_hours=24,
            description="Test step"
        )
        d = step.to_dict()
        assert d["position"] == 1
        assert d["channel"] == "whatsapp"
    
    def test_step_from_dict(self):
        """Test creating step from dict."""
        data = {
            "position": 2,
            "channel": "instagram",
            "template_id": "ig_template",
            "delay_hours": 48,
            "description": "IG step"
        }
        step = SequenceStep.from_dict(data)
        assert step.position == 2
        assert step.channel == "instagram"


class TestSequence:
    """Tests for Sequence."""
    
    def test_create_sequence(self):
        """Test creating a sequence."""
        steps = [
            SequenceStep(1, "whatsapp", "wa1", 0),
            SequenceStep(2, "instagram", "ig1", 48),
        ]
        seq = Sequence(
            id="test_seq",
            name="Test Sequence",
            steps=steps,
            max_attempts=10
        )
        assert seq.id == "test_seq"
        assert len(seq.steps) == 2
    
    def test_get_step(self):
        """Test getting step by position."""
        steps = [
            SequenceStep(1, "whatsapp", "wa1", 0),
            SequenceStep(2, "instagram", "ig1", 48),
        ]
        seq = Sequence(id="test", name="Test", steps=steps)
        
        step1 = seq.get_step(1)
        assert step1.channel == "whatsapp"
        
        step2 = seq.get_step(2)
        assert step2.channel == "instagram"
        
        step3 = seq.get_step(3)
        assert step3 is None
    
    def test_get_next_step(self):
        """Test getting next step."""
        steps = [
            SequenceStep(1, "whatsapp", "wa1", 0),
            SequenceStep(2, "instagram", "ig1", 48),
        ]
        seq = Sequence(id="test", name="Test", steps=steps)
        
        next_step = seq.get_next_step(1)
        assert next_step.position == 2
        
        no_next = seq.get_next_step(2)
        assert no_next is None
    
    def test_is_complete(self):
        """Test checking if sequence is complete."""
        steps = [
            SequenceStep(1, "whatsapp", "wa1", 0),
            SequenceStep(2, "instagram", "ig1", 48),
        ]
        seq = Sequence(id="test", name="Test", steps=steps, max_attempts=5)
        
        assert not seq.is_complete(1)
        assert not seq.is_complete(2)  # Position 2 is the last step, not complete yet
        assert seq.is_complete(3)  # Position 3 is past all steps
        assert seq.is_complete(6)  # Past max_attempts


class TestSequenceManager:
    """Tests for SequenceManager."""
    
    def test_create_manager(self):
        """Test creating a sequence manager."""
        manager = SequenceManager.__new__(SequenceManager)
        manager.sequences = {}
        manager.lead_states = {}
        manager.sequences_dir = Path(".")
        
        assert manager.sequences == {}
    
    def test_start_sequence(self):
        """Test starting a sequence for a lead."""
        manager = SequenceManager.__new__(SequenceManager)
        manager.sequences = {}
        manager.lead_states = {}
        manager.sequences_dir = Path(".")
        
        steps = [SequenceStep(1, "whatsapp", "wa1", 0)]
        seq = Sequence(id="test_seq", name="Test", steps=steps)
        manager.sequences["test_seq"] = seq
        
        state = manager.start_sequence("lead_123", "test_seq")
        
        assert state.lead_id == "lead_123"
        assert state.sequence_id == "test_seq"
        assert state.current_position == 0
        assert state.status == "active"
    
    def test_advance_sequence(self):
        """Test advancing through a sequence."""
        manager = SequenceManager.__new__(SequenceManager)
        manager.sequences = {}
        manager.lead_states = {}
        manager.sequences_dir = Path(".")
        
        steps = [
            SequenceStep(1, "whatsapp", "wa1", 0),
            SequenceStep(2, "instagram", "ig1", 48),
            SequenceStep(3, "email", "em1", 72),
        ]
        seq = Sequence(id="test_seq", name="Test", steps=steps)
        manager.sequences["test_seq"] = seq
        
        manager.start_sequence("lead_123", "test_seq")
        
        # First advance
        step1 = manager.advance("lead_123")
        assert step1.position == 1
        assert step1.channel == "whatsapp"
        
        state = manager.get_lead_state("lead_123")
        assert state.current_position == 1
        
        # Second advance
        step2 = manager.advance("lead_123")
        assert step2.position == 2
        assert step2.channel == "instagram"
        
        # Third advance
        step3 = manager.advance("lead_123")
        assert step3.position == 3
        assert step3.channel == "email"
        
        # Fourth advance - should return None (sequence exhausted)
        step4 = manager.advance("lead_123")
        assert step4 is None
        
        state = manager.get_lead_state("lead_123")
        assert state.status in ["completed", "exhausted"]
    
    def test_pause_resume(self):
        """Test pausing and resuming a sequence."""
        manager = SequenceManager.__new__(SequenceManager)
        manager.sequences = {}
        manager.lead_states = {}
        manager.sequences_dir = Path(".")
        
        steps = [SequenceStep(1, "whatsapp", "wa1", 0)]
        seq = Sequence(id="test_seq", name="Test", steps=steps)
        manager.sequences["test_seq"] = seq
        
        manager.start_sequence("lead_123", "test_seq")
        
        # Pause
        manager.pause("lead_123", "Testing")
        state = manager.get_lead_state("lead_123")
        assert state.status == "paused"
        assert state.pause_reason == "Testing"
        
        # Resume
        manager.resume("lead_123")
        state = manager.get_lead_state("lead_123")
        assert state.status == "active"
        assert state.pause_reason is None
    
    def test_mark_responded(self):
        """Test marking a lead as responded."""
        manager = SequenceManager.__new__(SequenceManager)
        manager.sequences = {}
        manager.lead_states = {}
        manager.sequences_dir = Path(".")
        
        steps = [SequenceStep(1, "whatsapp", "wa1", 0)]
        seq = Sequence(id="test_seq", name="Test", steps=steps)
        manager.sequences["test_seq"] = seq
        
        manager.start_sequence("lead_123", "test_seq")
        manager.mark_responded("lead_123")
        
        state = manager.get_lead_state("lead_123")
        assert state.status == "responded"
    
    def test_channel_rotation(self):
        """Test channel rotation."""
        manager = SequenceManager.__new__(SequenceManager)
        manager.sequences = {}
        manager.lead_states = {}
        manager.sequences_dir = Path(".")
        
        assert manager.get_next_channel("whatsapp") == "instagram"
        assert manager.get_next_channel("instagram") == "email"
        assert manager.get_next_channel("email") == "whatsapp"


# =============================================================================
# Property Tests
# =============================================================================

class TestPropertySequenceProgression:
    """
    Property 2: Sequence Progression Correctness
    
    For any lead in a sequence, the sequence position must always be 
    less than or equal to max_attempts, and advancing the sequence 
    must increment position by exactly 1.
    
    **Validates: Requirements 2.1, 2.6**
    """
    
    @given(sequence_strategy(), lead_id_strategy())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_position_never_exceeds_max(self, sequence, lead_id):
        """
        Property: Position never exceeds max_attempts.
        
        **Feature: automated-outreach, Property 2: Sequence Progression Correctness**
        **Validates: Requirements 2.1, 2.6**
        """
        manager = SequenceManager.__new__(SequenceManager)
        manager.sequences = {}
        manager.lead_states = {}
        manager.sequences_dir = Path(".")
        manager.sequences[sequence.id] = sequence
        
        # Start sequence
        manager.start_sequence(lead_id, sequence.id)
        
        # Advance through entire sequence
        for _ in range(sequence.max_attempts + 5):  # Try to go beyond max
            manager.advance(lead_id)
            state = manager.get_lead_state(lead_id)
            
            # Position should never exceed max_attempts
            assert state.current_position <= sequence.max_attempts
    
    @given(sequence_strategy(), lead_id_strategy())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_advance_increments_by_one(self, sequence, lead_id):
        """
        Property: Each advance increments position by exactly 1.
        
        **Feature: automated-outreach, Property 2: Sequence Progression Correctness**
        **Validates: Requirements 2.1, 2.6**
        """
        manager = SequenceManager.__new__(SequenceManager)
        manager.sequences = {}
        manager.lead_states = {}
        manager.sequences_dir = Path(".")
        manager.sequences[sequence.id] = sequence
        
        manager.start_sequence(lead_id, sequence.id)
        
        prev_position = 0
        for _ in range(len(sequence.steps)):
            step = manager.advance(lead_id)
            if step is None:
                break
            
            state = manager.get_lead_state(lead_id)
            # Position should increment by exactly 1
            assert state.current_position == prev_position + 1
            prev_position = state.current_position
    
    @given(sequence_strategy(), lead_id_strategy())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_sequence_terminates(self, sequence, lead_id):
        """
        Property: Sequence eventually terminates (exhausted or completed).
        
        **Feature: automated-outreach, Property 2: Sequence Progression Correctness**
        **Validates: Requirements 2.1**
        """
        manager = SequenceManager.__new__(SequenceManager)
        manager.sequences = {}
        manager.lead_states = {}
        manager.sequences_dir = Path(".")
        manager.sequences[sequence.id] = sequence
        
        manager.start_sequence(lead_id, sequence.id)
        
        # Advance until sequence ends
        for _ in range(sequence.max_attempts + 5):
            step = manager.advance(lead_id)
            if step is None:
                break
        
        state = manager.get_lead_state(lead_id)
        # Should be in a terminal state
        assert state.status in ["completed", "exhausted"]


class TestPropertyChannelRotation:
    """
    Property 3: Channel Rotation Consistency
    
    For any sequence with channel rotation enabled, consecutive touches 
    must use different channels in the defined order.
    
    **Validates: Requirements 2.4**
    """
    
    def test_rotation_is_cyclic(self):
        """
        Property: Channel rotation is cyclic (returns to start).
        
        **Feature: automated-outreach, Property 3: Channel Rotation Consistency**
        **Validates: Requirements 2.4**
        """
        manager = SequenceManager.__new__(SequenceManager)
        manager.sequences = {}
        manager.lead_states = {}
        manager.sequences_dir = Path(".")
        
        # Start from each channel and verify we return to it
        for start_channel in ["whatsapp", "instagram", "email"]:
            current = start_channel
            for _ in range(3):  # One full cycle
                current = manager.get_next_channel(current)
            assert current == start_channel
    
    @given(st.sampled_from(["whatsapp", "instagram", "email"]))
    @settings(max_examples=100)
    def test_next_channel_is_different(self, channel):
        """
        Property: Next channel is always different from current.
        
        **Feature: automated-outreach, Property 3: Channel Rotation Consistency**
        **Validates: Requirements 2.4**
        """
        manager = SequenceManager.__new__(SequenceManager)
        manager.sequences = {}
        manager.lead_states = {}
        manager.sequences_dir = Path(".")
        
        next_channel = manager.get_next_channel(channel)
        assert next_channel != channel
    
    @given(st.sampled_from(["whatsapp", "instagram", "email"]))
    @settings(max_examples=100)
    def test_rotation_order_is_consistent(self, start_channel):
        """
        Property: Rotation order is always whatsapp → instagram → email → whatsapp.
        
        **Feature: automated-outreach, Property 3: Channel Rotation Consistency**
        **Validates: Requirements 2.4**
        """
        manager = SequenceManager.__new__(SequenceManager)
        manager.sequences = {}
        manager.lead_states = {}
        manager.sequences_dir = Path(".")
        
        expected_order = ["whatsapp", "instagram", "email"]
        
        # Find starting index
        start_idx = expected_order.index(start_channel)
        
        # Verify next channel follows expected order
        next_channel = manager.get_next_channel(start_channel)
        expected_next_idx = (start_idx + 1) % len(expected_order)
        assert next_channel == expected_order[expected_next_idx]


# =============================================================================
# Integration Tests
# =============================================================================

class TestSequenceManagerIntegration:
    """Integration tests with actual sequence files."""
    
    def test_load_default_sequences(self):
        """Test loading sequences from default directory."""
        manager = SequenceManager()
        
        # Should have loaded at least the default sequence
        assert len(manager.sequences) > 0
    
    def test_default_sequence_structure(self):
        """Test the default sequence has correct structure."""
        manager = SequenceManager()
        
        default_seq = manager.get_sequence("default_sequence")
        if default_seq:
            assert default_seq.max_attempts == 10
            assert len(default_seq.steps) == 10
            
            # First step should be WhatsApp
            first_step = default_seq.get_step(1)
            assert first_step.channel == "whatsapp"
    
    def test_get_due_followups(self):
        """Test getting due follow-ups."""
        manager = SequenceManager.__new__(SequenceManager)
        manager.sequences = {}
        manager.lead_states = {}
        manager.sequences_dir = Path(".")
        
        steps = [
            SequenceStep(1, "whatsapp", "wa1", 0),
            SequenceStep(2, "instagram", "ig1", 1),  # 1 hour delay
        ]
        seq = Sequence(id="test_seq", name="Test", steps=steps)
        manager.sequences["test_seq"] = seq
        
        # Start sequence and advance
        manager.start_sequence("lead_1", "test_seq")
        manager.advance("lead_1")
        
        # Set next_touch_at to past
        state = manager.get_lead_state("lead_1")
        state.next_touch_at = datetime.now() - timedelta(hours=1)
        
        # Should be due
        due = manager.get_due_followups()
        assert len(due) == 1
        assert due[0].lead_id == "lead_1"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
