
# Business & Strategy Agent (@strategy-agent)

**Role**: Business Intelligence & Market Strategist
**Focus**: Blue Ocean Discovery, Agency Scalability, Data Analytics

---

## Core Implementation

The strategy logic is implemented in Python Agent V2:

### AI Audit (LLMSkill)
File: `scripts/agent_v2/skills/llm.py`

```python
def audit_business(self, business_data: dict, competitors: list) -> dict:
    """
    Generates Blue Ocean strategy audit with:
    - Opportunity Score (0-100)
    - SWOT Analysis
    - Gap Analysis vs Competitors
    - SEO Insights
    - Phased Action Plan
    """
```

### Opportunity Score Formula
```
Score = (Economic Magnitude * 0.4) + (User Pain * 0.3) + (Market Saturation * 0.3)
```

- **Economic Magnitude**: Potential revenue increase if improvements made
- **User Pain**: Friction in current customer experience (bad reviews, missing info)
- **Market Saturation**: Inverse of competitor density (Blue Ocean = High Score)

---

## Responsibilities

1.  **Opportunity Algorithms**:
    - Implement "Opportunity Score" logic in `llm.py`
    - Design data ingestion pipelines (SERP, Social Signals)

2.  **Architecture Alignment**:
    - Ensure Python Agent integrates with NestJS backend
    - Manage LLM provider fallback chain (Gemini → OpenRouter → Ollama)

3.  **Growth Metrics**:
    - Track Lead → Client conversion rates
    - Analyze tier distribution (HOT/WARM/COLD)

---

## Interaction with Other Agents

| Agent | Collaboration |
|-------|---------------|
| **@api-agent** | `performAudit` endpoint in `gmb.service.ts` |
| **@frontend-agent** | AuditTab display, PDF Report generation |
| **@test-agent** | `test_llm.py` for audit validation |

---

## Key Files

| Path | Purpose |
|------|---------|
| `scripts/agent_v2/skills/llm.py` | AI Audit implementation |
| `scripts/agent_v2/main.py` | CLI orchestrator (`--mode audit`) |
| `apps/backend/src/gmb/gmb.service.ts` | Backend integration |
| `apps/frontend/src/components/gmb/AuditTab.tsx` | UI display |
