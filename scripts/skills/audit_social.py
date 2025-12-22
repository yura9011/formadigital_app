
import asyncio
import logging
from playwright.async_api import async_playwright
# Usamos el cliente LLM compartido
from utils import llm_client

logger = logging.getLogger(__name__)

async def audit_instagram_via_google(business_name: str, location: str):
    """
    Audita la actividad de Instagram indirectamente buscando en Google.
    Evita bloqueos y necesidad de login.
    """
    audit_data = {
        "ig_activity_status": "Unknown", 
        "last_evidence": None,
        "follower_count_estimate": None
    }
    
    # Usamos el formato que le funcionó al usuario (sin site:)
    query = f'"{business_name}" {location} instagram'
    logger.info(f"🕵️ (AUDIT) Buscando pistas (DuckDuckGo): '{query}'")

    async with async_playwright() as p:
        # Añadimos flags para evitar detección de bot básica + User Agent robusto
        browser = await p.chromium.launch(
            headless=False,
            args=["--start-maximized", "--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        try:
            await page.goto(f"https://duckduckgo.com/?q={query}&ia=web")
            
            # Esperamos a que cargue algo relevante (Class 'results' o id 'links')
            try:
                await page.wait_for_selector('.react-results--main, #links, #r1-0', timeout=8000)
            except:
                logger.warning("⚠️ Selector específico no hallado, intentando leer toda la página...")

            # Extraemos todo el texto visible del cuerpo para asegurar no perder el snippet
            results_text = await page.locator('body').inner_text()
            
            # --- ANÁLISIS CON LLM ---
            prompt = """
            Analyze these Search results for an Instagram profile.
            Look for two things:
            1. Activity: Are there dates indicating recent posts? (e.g., "5 days ago", "Dec 2024").
            2. Influence: Is there a follower count mentioning in the snippet? (e.g., "5K followers").

            Return JSON:
            {{
                "activity_status": "Active" | "Dormant" | "Unknown",
                "evidence": "Found post from 2 days ago...",
                "followers": "500" | "Unknown"
            }}
            
            Context (Search Results):
            {context}
            """
            
            analysis = await asyncio.to_thread(llm_client.extract_from_text, prompt, results_text)
            
            if analysis:
                audit_data["ig_activity_status"] = analysis.get("activity_status", "Unknown")
                audit_data["last_evidence"] = analysis.get("evidence", "No meaningful dates found")
                audit_data["follower_count_estimate"] = analysis.get("followers", "Unknown")
                
            logger.info(f"   📊 Veredicto Auditoría: {audit_data['ig_activity_status']} ({audit_data['last_evidence']})")

        except Exception as e:
            if "Target page, context or browser has been closed" in str(e):
                logger.warning(f"⚠️ El navegador se cerró inesperadamente. Saltando este lead.")
            elif "Timeout" in str(e):
                 logger.warning(f"⚠️ Timeout buscando en DDG. Posible bloqueo o sin resultados.")
            else:
                logger.error(f"❌ Error en Auditoría DDG: {e}")
        finally:
            await browser.close()
            
    return audit_data
