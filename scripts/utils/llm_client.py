
import requests
import json
import logging
import re
import asyncio

logger = logging.getLogger(__name__)

# URL por defecto de Ollama local
OLLAMA_API_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.2" 

def extract_from_text(prompt_template: str, text_context: str) -> dict:
    """
    Función genérica para extraer JSON usando Ollama.
    """
    full_prompt = prompt_template.format(context=text_context[:4000]) # Limit context

    payload = {
        "model": MODEL_NAME,
        "prompt": full_prompt,
        "stream": False,
        "format": "json", 
        "temperature": 0.1
    }

    try:
        # Timeout generoso para local LLM
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=120)
        response.raise_for_status()
        
        result_json = response.json()
        content = result_json.get("response", "")
        
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Fallback simple
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return None

    except Exception as e:
        logger.error(f"❌ Error LLM: {e}")
        return None

def generate_text(system_prompt: str, user_prompt: str) -> str:
    """
    Función para generar texto libre (emails, propuestas).
    """
    final_prompt = f"{system_prompt}\n\nTask: {user_prompt}"
    
    payload = {
        "model": MODEL_NAME,
        "prompt": final_prompt,
        "stream": False,
        "temperature": 0.7 
    }

    try:
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=120)
        response.raise_for_status()
        return response.json().get("response", "").strip()
    except Exception as e:
        logger.error(f"❌ Error LLM Gen: {e}")
        return ""
