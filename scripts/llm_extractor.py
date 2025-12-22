
import requests
import json
import logging
import re

logger = logging.getLogger(__name__)

# URL por defecto de Ollama local
OLLAMA_API_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.2" # O "llama3.1" si el usuario prefiere

def verify_ollama_connection():
    """Verifica si Ollama está corriendo y el modelo está disponible."""
    try:
        # Check simple connection
        requests.get("http://localhost:11434", timeout=2)
        
        # Check model availability
        tags_res = requests.get("http://localhost:11434/api/tags", timeout=2)
        if tags_res.status_code == 200:
            models = [m['name'] for m in tags_res.json().get('models', [])]
            # Match flexible (e.g. 'llama3.2:latest' matches 'llama3.2')
            if any(MODEL_NAME in m for m in models):
                logger.info(f"✅ Ollama conectado. Modelo encontrado: {MODEL_NAME}")
                return True
            else:
                logger.warning(f"⚠️ Ollama conectado pero no se ve el modelo '{MODEL_NAME}'. Modelos disponibles: {models}")
                return True # Retornamos True igual para intentar usarlo (quizás lo baja on-demand)
        return False
    except Exception as e:
        logger.error(f"❌ No se pudo conectar a Ollama local: {e}")
        return False

def extract_details_with_llm(text_content: str) -> dict:
    """
    Envía el texto crudo de la ficha de Maps a Ollama para extraer datos estructurados.
    """
    
    # Prompt optimizado para extracción robusta
    prompt = f"""
    Act as a Data Extraction Agent. Analyze the following raw text from a Business Profile on Google Maps.
    Extract the following fields in strict JSON format:
    - name: Business name (Clean text, ignore 'Resultados', 'Volver', etc.)
    - price_tier: Look for price indicators like "Más de $ 20.000", "$$", etc. or null.
    - phone: The phone number if present.
    - rating: The numeric rating (e.g. 4.5).
    - reviews: The number of reviews (e.g. 1400).
    - address: The full address.
    - gaps: A list of missing critical info (e.g. ["No Phone", "No Website"]).

    Raw Text:
    {text_content[:2000]}  # Limitamos caracteres para velocidad

    Return ONLY the JSON object. No markdown, no explanations.
    """

    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "format": "json", # Force JSON mode (feature of Llama 3)
        "temperature": 0.1 # Muy determinista
    }

    print(f"      🔵 (OLLAMA) Enviando {len(text_content)} caracteres al modelo {MODEL_NAME}...")
    try:
        # Aumentamos timeout a 120s (2 min) para hardware modesto
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=120)
        response.raise_for_status()
        
        result_json = response.json()
        content = result_json.get("response", "")
        print(f"      🟢 (OLLAMA) Respuesta recibida: {content[:100]}...") # Mostrar inicio de respuesta
        
        # Limpieza por si el modelo es verboso (aunque format:json ayuda mucho)
        try:
            data = json.loads(content)
            return data
        except json.JSONDecodeError:
            # Fallback: buscar el primer bloque { ... }
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            else:
                logger.warning(f"⚠️ Ollama retornó texto no JSON: {content[:50]}...")
                return None

    except Exception as e:
        logger.error(f"❌ Error llamando a Ollama LLM: {e}")
        return None
