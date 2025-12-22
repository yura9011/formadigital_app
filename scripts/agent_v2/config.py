"""
Agent V2 Configuration
======================
Centralized configuration for API keys and provider settings.
Uses environment variables with fallback defaults.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from agent_v2 directory
ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(ENV_PATH)


# =============================================================================
# API Keys
# =============================================================================

SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# Backend API (for syncing results) - NestJS runs on 3000, no /api prefix
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:3000/gmb")


# =============================================================================
# LLM Provider Priority
# =============================================================================
# Order of preference for LLM calls. Will try each until one succeeds.

LLM_PROVIDER_PRIORITY = [
    "gemini",        # Google Gemini (free tier)
    "openrouter",    # OpenRouter (paid, many models)
    "huggingface",   # HuggingFace Inference API
    "ollama",        # Local Ollama (offline fallback)
]


# =============================================================================
# Model Configuration
# =============================================================================

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "xiaomi/mimo-v2-flash:free")
HUGGINGFACE_MODEL = os.getenv("HUGGINGFACE_MODEL", "google/gemma-2-2b-it")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")


# =============================================================================
# Search Configuration
# =============================================================================

SEARCH_CONFIG = {
    "max_results": int(os.getenv("MAX_RESULTS", "10")),
    "default_location": os.getenv("DEFAULT_LOCATION", "Buenos Aires, Argentina"),
    "language": os.getenv("SEARCH_LANGUAGE", "es"),
}


# =============================================================================
# Scraping Configuration
# =============================================================================

SCRAPING_CONFIG = {
    "timeout_ms": int(os.getenv("SCRAPE_TIMEOUT_MS", "15000")),
    "headless": os.getenv("HEADLESS", "true").lower() == "true",
}


# =============================================================================
# Logging
# =============================================================================

LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
