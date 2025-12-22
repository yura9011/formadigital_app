"""
LLMSkill - Multi-Provider LLM with Fallback Chain
=================================================
Tries providers in order: Gemini → OpenRouter → HuggingFace → Ollama
Returns structured JSON for business analysis.
"""

import json
import logging
from typing import Optional
from abc import ABC, abstractmethod

import requests
import google.generativeai as genai

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import (
    LLM_PROVIDER_PRIORITY,
    GEMINI_API_KEY, GEMINI_MODEL,
    OPENROUTER_API_KEY, OPENROUTER_MODEL,
    HUGGINGFACE_API_KEY, HUGGINGFACE_MODEL,
    OLLAMA_BASE_URL, OLLAMA_MODEL,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Provider Implementations
# =============================================================================

class LLMProvider(ABC):
    """Abstract base for LLM providers."""
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if this provider is configured and available."""
        pass
    
    @abstractmethod
    def generate(self, prompt: str) -> Optional[str]:
        """Generate text from prompt. Returns None on failure."""
        pass


class GeminiProvider(LLMProvider):
    """Google Gemini API with internal model fallback."""
    
    def __init__(self):
        self.api_key = GEMINI_API_KEY
        # Priority list of models to try
        self.models = [
            GEMINI_MODEL,                   # User default (e.g. gemini-2.5-flash)
            "gemini-2.5-flash-lite",        # Backup 1: Fast/New
            "gemini-2.0-flash",             # Backup 2: Stable previous gen
            "gemini-2.0-flash-lite",        # Backup 3: Fast previous gen
            "gemini-flash-latest"           # Backup 4: Generic alias
        ]
        
        if self.api_key:
            genai.configure(api_key=self.api_key)
        
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def generate(self, prompt: str) -> Optional[str]:
        for model_name in self.models:
            try:
                # Deduplicate if GEMINI_MODEL is same as one of the hardcoded backups
                # or naturally iterating
                logger.info(f"   ✨ Gemini: Trying model '{model_name}'...")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                return response.text
            except Exception as e:
                logger.warning(f"   ⚠️ Gemini model '{model_name}' failed: {e}")
                # Continue to next model in list
                continue
                
        logger.error("❌ All Gemini models failed.")
        return None


class OpenRouterProvider(LLMProvider):
    """OpenRouter API (via OpenAI SDK)."""
    
    def __init__(self):
        from openai import OpenAI
        self.api_key = OPENROUTER_API_KEY
        self.model = OPENROUTER_MODEL
        
        if self.api_key:
            self.client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=self.api_key,
            )
        else:
            self.client = None
    
    def is_available(self) -> bool:
        return bool(self.api_key and self.client)
    
    def generate(self, prompt: str) -> Optional[str]:
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                extra_headers={
                    "HTTP-Referer": "https://forma-digital.app",
                    "X-Title": "Forma Digital Agent",
                }
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.warning(f"OpenRouter failed: {e}")
            return None


class HuggingFaceProvider(LLMProvider):
    """HuggingFace Serverless Inference (OpenAI-compatible)."""
    
    def __init__(self):
        from openai import OpenAI
        self.api_key = HUGGINGFACE_API_KEY
        self.model = HUGGINGFACE_MODEL
        
        if self.api_key:
            self.client = OpenAI(
                base_url="https://api-inference.huggingface.co/v1/",
                api_key=self.api_key,
            )
        else:
            self.client = None
    
    def is_available(self) -> bool:
        return bool(self.api_key and self.client)
    
    def generate(self, prompt: str) -> Optional[str]:
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.warning(f"HuggingFace failed: {e}")
            return None


class OllamaProvider(LLMProvider):
    """Local Ollama instance."""
    
    def __init__(self):
        self.base_url = OLLAMA_BASE_URL
        self.model = OLLAMA_MODEL
    
    def is_available(self) -> bool:
        try:
            requests.get(self.base_url, timeout=2)
            return True
        except:
            return False
    
    def generate(self, prompt: str) -> Optional[str]:
        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                },
                timeout=120
            )
            response.raise_for_status()
            return response.json().get("response", "")
        except Exception as e:
            logger.warning(f"Ollama failed: {e}")
            return None


# =============================================================================
# Main Skill
# =============================================================================

PROVIDERS = {
    "gemini": GeminiProvider,
    "openrouter": OpenRouterProvider,
    "huggingface": HuggingFaceProvider,
    "ollama": OllamaProvider,
}


class LLMSkill:
    """
    Multi-provider LLM skill with automatic fallback.
    Tries each provider in priority order until one succeeds.
    """
    
    def __init__(self):
        self.providers = []
        for name in LLM_PROVIDER_PRIORITY:
            if name in PROVIDERS:
                provider = PROVIDERS[name]()
                if provider.is_available():
                    self.providers.append((name, provider))
                    logger.info(f"✅ LLM Provider available: {name}")
                else:
                    logger.debug(f"⏭️ LLM Provider not configured: {name}")
        
        if not self.providers:
            logger.warning("⚠️ No LLM providers available!")
    
    def analyze_business(self, raw_text: str, business_name: str) -> dict:
        """
        Analyze scraped website content to extract insights.
        
        Returns:
            Dict with: summary, gaps, tier, score
        """
        prompt = self._build_analysis_prompt(raw_text, business_name)
        
        for name, provider in self.providers:
            logger.info(f"🤖 Trying {name}...")
            result = provider.generate(prompt)
            
            if result:
                parsed = self._parse_response(result)
                if parsed:
                    parsed["llm_provider"] = name
                    logger.info(f"✅ Analysis complete via {name}")
                    return parsed
        
        logger.error("❌ All LLM providers failed")
        return self._default_analysis()
    
    def _build_analysis_prompt(self, raw_text: str, business_name: str) -> str:
        return f"""Analyze this business website content and return a JSON object.

Business Name: {business_name}
Website Content:
{raw_text[:2500]}

Return ONLY valid JSON with these exact keys:
{{
    "summary": "2-3 sentence business description",
    "gaps": ["list of marketing/digital gaps like 'No social media', 'Outdated website', etc."],
    "tier": "HOT or WARM or COLD based on digital presence quality",
    "score": 0-100 opportunity score (higher = more opportunity to help)
}}

Rules for scoring:
- No website or broken = HOT (80-100)
- Basic website, no social = WARM (50-80)
- Good presence = COLD (0-50)

Return ONLY the JSON, no explanation."""

    def _parse_response(self, response: str) -> Optional[dict]:
        """Try to parse LLM response as JSON."""
        try:
            # Clean up common issues
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
            
            # Find JSON object
            start = response.find("{")
            end = response.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(response[start:end])
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse LLM response: {e}")
        return None
    
    def _default_analysis(self) -> dict:
        return {
            "summary": "Analysis unavailable",
            "gaps": ["Unable to analyze"],
            "tier": "WARM",
            "score": 50,
            "llm_provider": None,
        }

    def audit_business(self, business_data: dict, competitors: list[dict]) -> dict:
        """
        Perform a strategic Blue Ocean audit of the business.
        """
        prompt = self._build_audit_prompt(business_data, competitors)
        
        for name, provider in self.providers:
            logger.info(f"🤖 Auditing via {name}...")
            result = provider.generate(prompt)
            
            if result:
                parsed = self._parse_response(result)
                if parsed:
                    parsed["llm_provider"] = name
                    logger.info(f"✅ Audit complete via {name}")
                    return parsed
                    
        logger.error("❌ All LLM providers failed audit")
        return self._default_audit()

    def _build_audit_prompt(self, business: dict, competitors: list[dict]) -> str:
        # Prepare competitor context (names and categories only to save tokens)
        comps_str = ", ".join([f"{c.get('name')} ({c.get('rating', 0)}⭐)" for c in competitors[:5]])
        
        return f"""
ROLE: You are an elite Business Intelligence & Market Strategist (@strategy-agent). 
Your goal is to find "Blue Ocean" opportunities for the client by analyzing their digital presence vs competitors.

CLIENT: {business.get('name')}
ADDRESS: {business.get('address')}
CATEGORY: {business.get('category')}
RATING: {business.get('rating')} ({business.get('reviewCount')} reviews)
WEBSITE: {business.get('website') or 'None'}
PHONE: {business.get('phone') or 'None'}

COMPETITORS: {comps_str}

TASK: Perform a deep strategic audit.
1. Calculate OPPORTUNITY SCORE (0-100) based on:
   - Economic Magnitude: Potential revenue increase if fixed.
   - User Pain: Current friction (bad reviews, no info).
   - Market Saturation: Is the niche crowded? (Blue Ocean = High Score).
   
2. Generate structured insights.

RETURN JSON ONLY:
{{
    "completenessScore": <int 0-100>,
    "executiveSummary": "<Strategic summary focusing on differentiation>",
    "basicChecklist": [
        {{ "item": "Has Website", "status": "ok|missing|warning", "note": "..." }},
        {{ "item": "Verified GMB", "status": "ok|missing|warning", "note": "..." }},
        {{ "item": "Social Presence", "status": "ok|missing|warning", "note": "..." }}
    ],
    "swotAnalysis": {{
        "strengths": ["..."],
        "weaknesses": ["..."],
        "opportunities": ["..."],
        "threats": ["..."]
    }},
    "gapAnalysis": {{
        "reviewGap": "Analysis of review volume/quality vs competitors",
        "ratingGap": "Rating comparison",
        "contentGap": "What content is missing vs market leaders?"
    }},
    "seoInsights": {{
        "topLocalKeywords": [
            {{ "keyword": "...", "volumeEstimate": "High|Medium|Low", "competition": "Low|Medium|High", "userIntent": "..." }}
        ],
        "hyperLocalTips": ["Specific tips for this location..."]
    }},
    "phasedActionPlan": {{
        "immediate": ["Week 1 actions..."],
        "shortTerm": ["Month 1 actions..."],
        "longTerm": ["Quarter 1 strategy..."]
    }}
}}
"""

    def _default_audit(self) -> dict:
        return {
            "completenessScore": 0,
            "executiveSummary": "Audit failed due to AI provider error.",
            "basicChecklist": [],
            "swotAnalysis": {"strengths": [], "weaknesses": [], "opportunities": [], "threats": []},
            "llm_provider": None
        }


# Quick test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    skill = LLMSkill()
    result = skill.analyze_business(
        "Welcome to Joe's Pizza. We serve authentic Italian pizza since 1985.",
        "Joe's Pizza"
    )
    print(json.dumps(result, indent=2))
