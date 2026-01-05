"""
Prospecting Tool - Búsqueda de clientes potenciales (Deep Discovery & Enrichment)
===============================================================================
Ejecutar en tu Windows local con: python prospecting_local.py

Características:
- Búsqueda en Google Maps con navegador real
- Extracción profunda (scroll en ficha)
- NAVEGACIÓN WEB: Visita el sitio web del negocio para extraer Email e Instagram
- Reporte HTML visual mejorado
"""

import asyncio
import re
import json
import pandas as pd
from datetime import datetime
from pathlib import Path
import os
import sys
import logging
from datetime import datetime
from pathlib import Path

# ============================================
# CONFIGURACIÓN DE LOGGING (PRIMERO)
# ============================================

LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)
timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
log_file = LOG_DIR / f"prospecting_{timestamp}.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Intentar importar módulo de IA
try:
    import llm_extractor 
    logger.info("✅ Módulo de IA (llm_extractor) importado correctamente.")
except Exception as e:
    logger.error(f"❌ Error importando módulo de IA: {e}")
    # Definir un dummy para que no rompa el código más abajo si se llama
    class DummyLLM:
        def extract_details_with_llm(self, *args, **kwargs): return None
    llm_extractor = DummyLLM()

# Intentar importar Playwright
try:
    from playwright.async_api import async_playwright
except ImportError:
    print("❌ Playwright no instalado. Ejecutando instalación...")
    import subprocess
    subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=True)
    from playwright.async_api import async_playwright


# ============================================
# CONFIGURACIÓN DE BÚSQUEDA
# ============================================

SEARCH_TASKS = [
    {"keyword": "kiosco", "location": "Liniers, Buenos Aires"},
]

CONFIG = {
    "max_results_per_search": 5,
    "headless": False,       
    "slow_mo": 500,          
    "deep_scroll": True,     
    "enrich_data": True,     # NUEVO: Visitar webs para sacar emails/redes
    "web_timeout": 15000,    # Timeout para visitar webs (15s)
}

OUTPUT_DIR = Path("prospecting_results")


# ============================================
# FUNCIONES DE ENRIQUECIMIENTO (NUEVO)
# ============================================

async def enrich_lead_data(browser_context, business):
    """
    Visita el sitio web del negocio (si tiene) en una pestaña nueva
    y extrae emails y redes sociales.
    """
    website = business.get("website")
    
    # Inicializar campos extra
    business["email"] = None
    business["instagram"] = None
    business["facebook"] = None
    business["linkedin"] = None
    business["enrichment_status"] = "skipped"

    if not website or "google.com" in website:
        return business

    logger.info(f"🌐 Enriqueciendo: Visitando {website}...")
    page = await browser_context.new_page()
    
    try:
        # Navegar con timeout estricto para no colgar el proceso
        await page.goto(website, timeout=CONFIG["web_timeout"], wait_until="domcontentloaded")
        business["enrichment_status"] = "visited"
        
        # 1. Extraer Emails (Regex en todo el body)
        # Buscamos 'mailto:' hrefs primero (más confiable)
        try:
            # Corregido: Playwright no tiene 'all_attributes', usamos iteracion
            mailto_elements = await page.locator('a[href^="mailto:"]').all()
            mailto_links = []
            for el in mailto_elements:
                href = await el.get_attribute("href")
                if href: mailto_links.append(href)
                
            emails = [link.replace("mailto:", "").split("?")[0] for link in mailto_links]
            
            # Si no hay mailto, buscar texto crudo
            if not emails:
                content = await page.content()
                # Regex simple para emails
                found = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', content)
                # Filtrar extensiones de imagen falsos positivos (.png, .jpg)
                valid_emails = [e for e in found if not e.endswith(('png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'))]
                emails = list(set(valid_emails)) # Deduplicar
            
            if emails:
                business["email"] = emails[0] # Tomar el primero
                logger.info(f"   📧 Email encontrado: {business['email']}")
        except Exception as e:
            logger.warning(f"   ⚠️ Error buscando emails: {e}")

        # 2. Extraer Redes Sociales
        try:
            # Instagram
            ig_el = page.locator('a[href*="instagram.com"]')
            if await ig_el.count() > 0:
                business["instagram"] = await ig_el.first.get_attribute("href")
                
            # Facebook
            fb_el = page.locator('a[href*="facebook.com"]')
            if await fb_el.count() > 0:
                business["facebook"] = await fb_el.first.get_attribute("href")
                
            # LinkedIn
            li_el = page.locator('a[href*="linkedin.com"]')
            if await li_el.count() > 0:
                business["linkedin"] = await li_el.first.get_attribute("href")
                
            if business.get("instagram"): logger.info(f"   📸 IG: {business['instagram']}")
            
        except Exception as e:
            logger.warning(f"   ⚠️ Error buscando redes: {e}")
            
    except Exception as e:
        logger.error(f"   ❌ Falló visita web ({website}): {e}")
        business["enrichment_status"] = "failed"
        
    finally:
        await page.close() # CERRAR PESTAÑA SIEMPRE
        
    return business


# ============================================
# FUNCIONES DE SCRAPING
# ============================================

async def run_search_workflow():
    """Ejecutar todas las tareas de búsqueda configuradas"""
    
    all_businesses = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=CONFIG["headless"],
            slow_mo=CONFIG["slow_mo"],
            args=["--start-maximized"]
        )
        
        context = await browser.new_context(
            viewport={"width": 1600, "height": 900},
            locale="es-AR",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        page = await context.new_page()
        
        for task in SEARCH_TASKS:
            keyword = task["keyword"]
            location = task["location"]
            print(f"🔎 (SCRIPT) Buscando: '{keyword}' en '{location}'")
            logger.info(f"🔎 Iniciando: '{keyword}' en '{location}'")
            
            try:
                search_query = f"{keyword} en {location}"
                url = f"https://www.google.com/maps/search/{search_query.replace(' ', '+')}"
                
                await page.goto(url, wait_until="domcontentloaded")
                
                # Manejo de "No results" o carga lenta
                try:
                    await page.wait_for_selector('[role="feed"]', timeout=8000)
                except:
                    logger.warning("⚠️ No cargó el feed. Reintentando...")
                    await page.reload()
                    await page.wait_for_selector('[role="feed"]', timeout=10000)

                # Scroll inicial para cargar items
                results_selector = '[role="feed"] > div > div > a'
                feed = page.locator('[role="feed"]')
                for _ in range(2):
                    await feed.evaluate("el => el.scrollTop = el.scrollHeight")
                    await asyncio.sleep(1)

                results = await page.locator(results_selector).all()
                count = min(len(results), CONFIG["max_results_per_search"])
                logger.info(f"📋 Encontrados {len(results)}. Procesando {count}...")
                
                for i in range(count):
                    try:
                        # Re-query para evitar stale elements
                        results = await page.locator(results_selector).all()
                        if i >= len(results): break
                        
                        result = results[i]
                        
                        # Obtener nombre esperado del item de la lista (para verificar cambio)
                        try:
                            expected_name = await result.get_attribute("aria-label")
                            if expected_name: expected_name = expected_name.replace("Visitar ", "")
                        except: expected_name = None

                        print(f"👉 (SCRIPT) Click en resultado {i+1}/{count}")
                        logger.info(f"👉 Click en resultado {i+1}/{count}")
                        await result.click() 
                        
                        # Esperar a que el panel cambie/cargue
                        # Buscamos el H1 del título (DUwDvf es clase común de título en Maps)
                        try:
                            await page.wait_for_selector('h1.DUwDvf', timeout=5000)
                        except:
                            await page.wait_for_selector('div[role="main"] h1', timeout=5000)
                            
                        await asyncio.sleep(1) # Estabilizar
                        
                        if CONFIG["deep_scroll"]:
                            await scroll_detail_panel(page)
                        
                        # Extraer datos básicos
                        business = await extract_business_details(page)
                        business["keyword"] = keyword
                        business["location"] = location
                        
                        # Validación de nombre (evitar "Resultados")
                        if business["name"] == "Resultados" or not business["name"]:
                            logger.warning(f"⚠️ Nombre inválido '{business['name']}'. Intentando fallback...")
                            # Fallback: Usar aria-label del resultado de la lista
                            if expected_name: 
                                business["name"] = expected_name
                                logger.info(f"   ↪️ Usando nombre de lista: {expected_name}")
                        
                        if business["name"] and business["name"] != "Resultados":
                            # Evitar duplicados exactos en esta corrida
                            if not any(b['name'] == business['name'] for b in all_businesses):
                                logger.info(f"📍 Lead: {business['name']}")
                                
                                # --- ENRIQUECIMIENTO ---
                                if CONFIG["enrich_data"] and business.get("website"):
                                    business = await enrich_lead_data(context, business)
                                
                                all_businesses.append(business)
                            else:
                                logger.warning(f"⚠️ Duplicado detectado: {business['name']}")
                        else:
                            logger.warning("❌ No se pudo extraer nombre válido")
                        
                    except Exception as e:
                        logger.error(f"❌ Error en item {i+1}: {e}")
                        continue
                        
            except Exception as e:
                logger.error(f"❌ Error crítico en task: {e}")
        
        await browser.close()
        
    return all_businesses


async def scroll_detail_panel(page):
    try:
        main_panel = page.locator('div[role="main"]')
        for _ in range(3):
            await main_panel.evaluate("el => el.scrollTop += 500")
            await asyncio.sleep(0.3)
    except: pass


async def extract_business_details(page) -> dict:
    b = {
        "name": "N/A", "rating": 0.0, "reviews": 0, "type": "N/A",
        "address": "N/A", "phone": None, "website": None,
        "price_tier": None, "services": []
    }
    
    # Usamos .last porque Google Maps suele apilar el panel de detalle sobre la lista (que también es role="main")
    # Si hay conflicto, el último suele ser el panel activo/detalle.
    main = page.locator('div[role="main"]').last
    
    # 1. Extracción Clásica (Rápida y Base)
    try:
        # Nombre (H1)
        if await main.locator('h1.DUwDvf').count() > 0:
            b["name"] = await main.locator('h1.DUwDvf').first.inner_text()
        elif await main.locator('h1').count() > 0:
            b["name"] = await main.locator('h1').first.inner_text()
            
        # Rating y Reviews
        rating_el = main.locator('div[role="img"][aria-label*="estrella"]').first
        if await rating_el.count() > 0:
            val = await rating_el.get_attribute("aria-label")
            match = re.search(r'([\d,\.]+)', val)
            if match: b["rating"] = float(match.group(1).replace(",", "."))
            
        reviews_el = main.locator('button[aria-label*="reseña"]').first
        if await reviews_el.count() > 0:
            val = await reviews_el.get_attribute("aria-label")
            match = re.search(r'([\d\.]+)', val.replace(".","").replace(",",""))
            if match: b["reviews"] = int(match.group(1))

        # Dirección
        addr_btn = main.locator('button[data-item-id="address"]').first
        if await addr_btn.count() > 0:
            raw_addr = await addr_btn.get_attribute("aria-label")
            b["address"] = raw_addr.replace("Dirección: ", "").strip()

        # Web
        web_btn = main.locator('a[data-item-id="authority"]').first
        if await web_btn.count() > 0:
            b["website"] = await web_btn.get_attribute("href")

        # Teléfono
        phone_btn = main.locator('button[data-item-id^="phone:"]').first
        if await phone_btn.count() > 0:
            raw_phone = await phone_btn.get_attribute("aria-label")
            b["phone"] = raw_phone.replace("Teléfono: ", "").strip()
            
    except Exception as e:
        logger.error(f"Error en extracción clásica: {e}")

    # 2. Extracción Inteligente (LLM Local) - SOLO SI ES NECESARIO
    # Optimizacion: Si ya tenemos Nombre y Telefono, nos ahorramos los 60-90s de inferencia
    critical_data_missing = (
        not b["name"] or 
        b["name"] == "Resultados" or 
        not b["phone"]
    )

    if critical_data_missing:
        try:
            # Obtenemos todo el texto visible del panel
            full_text = await main.inner_text()
            
            # MENS AJE VISIBLE PARA EL USUARIO
            print(f"   🤖 AGENTE: Datos incompletos detectados. Invocando Llama 3.2...")
            
            # Llamada al LLM (síncrona por ahora, el módulo usa requests)
            loop = asyncio.get_event_loop()
            llm_data = await loop.run_in_executor(None, llm_extractor.extract_details_with_llm, full_text)
            
            if llm_data:
                logger.info("   🤖 LLM Data extraída con éxito")
                print("      ✅ IA Extrajo datos.")
                
                # Merge inteligente: Priorizamos LLM para campos difíciles, Base para campos técnicos (hrefs)
                
                # Nombre: Si el scraper falló o dio "Resultados", confiamos en LLM
                if (not b["name"] or b["name"] == "Resultados") and llm_data.get("name"):
                     b["name"] = llm_data["name"]
                     print(f"      ↪️ Nombre corregido por IA: {b['name']}")
                     
                # Precio: Confiamos 100% en LLM
                if llm_data.get("price_tier"):
                    b["price_tier"] = llm_data["price_tier"]
                    print(f"      💰 Precio detectado por IA: {b['price_tier']}")
                    
                # Rating/Reviews: Si faltan, llenamos con LLM
                if not b["rating"] and llm_data.get("rating"): b["rating"] = llm_data["rating"]
                if not b["reviews"] and llm_data.get("reviews"): b["reviews"] = llm_data["reviews"]
                
                # Phone: Si falta, llenamos
                if not b["phone"] and llm_data.get("phone"): b["phone"] = llm_data["phone"]

        except Exception as e:
            logger.warning(f"⚠️ Salteando extracción LLM (Ollama no disponible o error): {e}")
            print(f"   ⚠️ IA Skipped: {e}")
    else:
        print("   ⚡ Datos completos encontrados por selectores. Saltando IA para velocidad.")
        
    return b


# ============================================
# ANÁLISIS Y REPORTE
# ============================================

def analyze_prospect(b: dict) -> dict:
    score = 50
    gaps = []
    
    # Análisis Web
    if not b["website"]:
        score += 25
        gaps.append("Sin Sitio Web")
    elif b.get("enrichment_status") == "failed":
        gaps.append("Web Caída o Inaccesible")
        score += 10
    
    # Análisis Redes (si fue enriquecido)
    if b.get("website"):
        if not b.get("instagram") and not b.get("facebook"):
            gaps.append("Sin Redes Sociales Visibles")
            score += 10
            
    # Análisis Reputación
    if b["reviews"] < 10:
        score += 15
        gaps.append("Reviews Críticos (<10)")
    elif b["reviews"] < 50:
        score += 5
        gaps.append("Reviews Bajos (<50)")
        
    if b["rating"] > 0 and b["rating"] < 4.0:
        score += 15
        gaps.append("Rating Bajo (<4.0)")
    
    # Análisis Teléfono (Gap explícito visto en capturas)
    if not b["phone"]:
        score += 5
        gaps.append("Sin Teléfono (Pérdida de reservas)")

    # Tier
    if score >= 75: tier = "HOT"
    elif score >= 60: tier = "WARM"
    else: tier = "COLD"
    
    return {**b, "score": score, "tier": tier, "gaps": gaps}


def generate_html_report(results: list, output_dir: Path):
    if not results: return
    
    timestamp = datetime.now().strftime("%d/%m/%Y %H:%M")
    
    hot_count = sum(1 for r in results if r['tier'] == 'HOT')
    warm_count = sum(1 for r in results if r['tier'] == 'WARM')
    cold_count = sum(1 for r in results if r['tier'] == 'COLD')
    
    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Prospecting Report - {timestamp}</title>
        <style>
            :root {{ --primary: #2563eb; --hot: #ef4444; --warm: #f59e0b; --cold: #3b82f6; --bg: #f1f5f9; }}
            body {{ font-family: system-ui, sans-serif; background: var(--bg); margin: 0; padding: 20px; }}
            .stats {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }}
            .card {{ background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }}
            .stat-num {{ font-size: 1.8em; font-weight: bold; }}
            .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }}
            
            .prospect-card {{ background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-top: 4px solid transparent; }}
            .prospect-card.HOT {{ border-top-color: var(--hot); }}
            .prospect-card.WARM {{ border-top-color: var(--warm); }}
            .prospect-card.COLD {{ border-top-color: var(--cold); }}
            
            .p-header {{ padding: 15px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }}
            .p-name {{ margin: 0; font-size: 1.1em; }}
            .p-body {{ padding: 15px; font-size: 0.9em; }}
            .contact-info {{ background: #f8fafc; padding: 8px; border-radius: 4px; margin: 10px 0; font-family: monospace; font-size: 0.9em; word-break: break-all; }}
            .gaps {{ color: #be123c; margin-top: 10px; font-size: 0.85em; }}
            .actions {{ padding: 12px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; }}
            .btn {{ flex: 1; padding: 6px; text-align: center; text-decoration: none; border-radius: 4px; font-size: 0.85em; background: #e2e8f0; color: #333; }}
            .btn-blue {{ background: #eff6ff; color: var(--primary); }}
            .price-tag {{ font-size:0.8em; background:#ecfccb; padding:2px 6px; border-radius:4px; color:#365314; font-weight:bold; }}
        </style>
    </head>
    <body>
        <h1>🎯 Reporte de Prospectos</h1>
        <div class="stats">
            <div class="card"><div class="stat-num">{len(results)}</div><div>Total</div></div>
            <div class="card"><div class="stat-num" style="color:var(--hot)">{hot_count}</div><div>HOT 🔥</div></div>
            <div class="card"><div class="stat-num" style="color:var(--warm)">{warm_count}</div><div>WARM 🟡</div></div>
            <div class="card"><div class="stat-num" style="color:var(--cold)">{cold_count}</div><div>COLD 🔵</div></div>
        </div>
        <div class="grid">
    """
    
    for r in results:
        gaps_html = "<br>".join([f"• {g}" for g in r['gaps']]) or "Sin gaps"
        
        email_Display = f"📧 {r['email']}" if r.get('email') else '<span style="color:#ccc">Sin Email</span>'
        ig_Display = f'<a href="{r["instagram"]}">📸 Instagram</a>' if r.get('instagram') else ''
        fb_Display = f'<a href="{r["facebook"]}">f Facebook</a>' if r.get('facebook') else ''
        price_display = f'<span class="price-tag">{r["price_tier"]}</span>' if r.get('price_tier') else ''
        
        html += f"""
        <div class="prospect-card {r['tier']}">
            <div class="p-header">
                <div>
                    <h3 class="p-name">{r['name']}</h3>
                    {price_display}
                </div>
                <b>{r['tier']}</b>
            </div>
            <div class="p-body">
                <div>📍 {r['address']}</div>
                <div>⭐ {r['rating']} ({r['reviews']} reviews)</div>
                <div class="contact-info">
                    {email_Display}<br>
                    {r['phone'] or 'Sin Teléfono'}<br>
                    {ig_Display} {fb_Display}
                </div>
                <div class="gaps">
                    <b>Oportunidades:</b><br>{gaps_html}
                </div>
            </div>
            <div class="actions">
                <a href="{r['website']}" target="_blank" class="btn btn-blue">🌐 Web</a>
                <a href="https://www.google.com/maps/search/?api=1&query={r['name']} {r['address']}" target="_blank" class="btn">📍 Mapa</a>
            </div>
        </div>
        """
        
    html += "</div></body></html>"
    
    filename = output_dir / f"report_{datetime.now().strftime('%Y%m%d_%H%M')}.html"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(html)
    logger.info(f"✨ Reporte generado: {filename}")


async def main():
    logger.info("="*50)
    logger.info("🚀 INICIANDO DEEP DISCOVERY CON ENRIQUECIMIENTO WEB")
    logger.info("="*50)
    
    try:
        raw_leads = await run_search_workflow()
        
        if not raw_leads:
            logger.warning("❌ No se encontraron leads.")
            return

        print("\n🧠 Analizando y clasificando leads...")
        analyzed_leads = [analyze_prospect(l) for l in raw_leads]
        analyzed_leads.sort(key=lambda x: x['score'], reverse=True)
        
        OUTPUT_DIR.mkdir(exist_ok=True)
        
        # Save JSON Full Data
        json_path = OUTPUT_DIR / "leads_full_data.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(analyzed_leads, f, ensure_ascii=False, indent=2)

        # Save CSV
        df = pd.DataFrame(analyzed_leads)
        df.to_csv(OUTPUT_DIR / "leads_data.csv", index=False, encoding="utf-8-sig")
        
        # Save HTML
        generate_html_report(analyzed_leads, OUTPUT_DIR)
        
        logger.info("="*50)
        logger.info("✅ PROCESO FINALIZADO")
        logger.info(f"📂 Ver resultados en: {OUTPUT_DIR.absolute()}")
        
    except Exception as e:
        logger.critical(f"❌ Error fatal en main: {e}", exc_info=True)

if __name__ == "__main__":
    import warnings
    if sys.platform == 'win32':
        # Silenciar warning de deprecación de WindowsProactorEventLoopPolicy
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    asyncio.run(main())
