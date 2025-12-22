
import asyncio
import re
import logging
from playwright.async_api import async_playwright
# Importamos el cliente LLM compartido
from utils import llm_client

logger = logging.getLogger(__name__)

async def run_search(keyword, location, max_results, headless=True):
    """
    Ejecuta la búsqueda en Google Maps y devuelve una lista de diccionarios (Leads).
    """
    leads = []
    
    async with async_playwright() as p:
        # Lanzamos browser
        browser = await p.chromium.launch(headless=headless, args=["--start-maximized"])
        context = await browser.new_context(viewport={"width": 1600, "height": 900}, locale="es-AR")
        page = await context.new_page()
        
        try:
            print(f"🔎 (SCOUT) Buscando '{keyword}' en '{location}'...")
            await page.goto(f"https://www.google.com/maps/search/{keyword} en {location}", wait_until="domcontentloaded")
            
            # Esperar feed
            try:
                await page.wait_for_selector('[role="feed"]', timeout=10000)
            except:
                logger.warning("⚠️ Timeout esperando lista de resultados.")
                return []

            # Scroll inicial
            await page.locator('[role="feed"]').evaluate("el => el.scrollTop = el.scrollHeight")
            await asyncio.sleep(2)
            
            # Obtener resultados
            results = await page.locator('[role="feed"] > div > div > a').all()
            count = min(len(results), max_results)
            print(f"📋 (SCOUT) Encontrados {len(results)}. Procesando top {count}...")
            
            for i in range(count):
                try:
                    # Re-query para evitar stale
                    results = await page.locator('[role="feed"] > div > div > a').all()
                    if i >= len(results): break
                    
                    result_item = results[i]
                    print(f"👉 (SCOUT) Visitando resultado {i+1}...")
                    await result_item.click()
                    
                    # Esperar panel de detalle
                    # Usamos .last porque el panel de detalle se apila al final
                    try:
                        await page.wait_for_selector('div[role="main"]', timeout=8000)
                    except: pass
                    
                    # Pequeña pausa para carga dinámica
                    await asyncio.sleep(1.5)
                    
                    # --- EXTRACCIÓN ---
                    lead_data = await extract_details(page)
                    
                    if lead_data:
                        # Enriquecimiento básico (Web links)
                        # Nota: El 'Deep Social Audit' se hará en otro módulo
                        leads.append(lead_data)
                        print(f"   📍 Lead Capturado: {lead_data['name']}")
                    
                except Exception as e:
                    logger.error(f"❌ Error procesando item {i}: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"❌ Error crítico en búsqueda: {e}")
        finally:
            await browser.close()
            
    return leads

async def extract_details(page):
    """Extrae datos del panel de detalle actual usando Selectores + IA Fallback."""
    main = page.locator('div[role="main"]').last
    b = {"name": None, "phone": None, "address": None, "website": None, "reviews": 0, "rating": 0.0}
    
    try:
        # 1. Selectores Rápidos
        if await main.locator('h1.DUwDvf').count() > 0:
            b["name"] = await main.locator('h1.DUwDvf').first.inner_text()
        elif await main.locator('h1').count() > 0:
            b["name"] = await main.locator('h1').first.inner_text()
            
        btn_addr = main.locator('button[data-item-id="address"]')
        if await btn_addr.count() > 0:
             b["address"] = (await btn_addr.first.get_attribute("aria-label") or "").replace("Dirección: ", "")
             
        btn_phone = main.locator('button[data-item-id^="phone:"]')
        if await btn_phone.count() > 0:
             b["phone"] = (await btn_phone.first.get_attribute("aria-label") or "").replace("Teléfono: ", "")
             
        link_web = main.locator('a[data-item-id="authority"]')
        if await link_web.count() > 0:
             b["website"] = await link_web.first.get_attribute("href")

        # 2. Smart Fallback (IA)
        # Si falta nombre o teléfono, llamamos al LLM
        if not b["name"] or b["name"] == "Resultados" or not b["phone"]:
            print("   🤖 (SCOUT) Datos incompletos. Consultando a Llama 3.2...")
            text = await main.inner_text()
            
            prompt = """
            Extract valid business info from this Google Maps text in JSON:
            {{ "name": "Business Name", "phone": "Phone or null", "address": "Address or null" }}
            Context:
            {context}
            """
            # Ejecutar en thread pool para no bloquear
            llm_result = await asyncio.to_thread(llm_client.extract_from_text, prompt, text)
            
            if llm_result:
                if not b["name"] or b["name"] == "Resultados": b["name"] = llm_result.get("name")
                if not b["phone"]: b["phone"] = llm_result.get("phone")
                print(f"      ✅ IA recuperó: {b['name']} / {b['phone']}")

    except Exception as e:
        logger.error(f"Error extracción scout: {e}")
        return None
        
    return b
