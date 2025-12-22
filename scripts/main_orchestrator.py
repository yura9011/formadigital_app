
import asyncio
import logging
import sys
import io
from pathlib import Path
from datetime import datetime
import json

# Force UTF-8 for Windows Console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', line_buffering=True)

# Setup de paths para importar módulos internos
sys.path.append(str(Path(__file__).parent))

# Importar Skills
from skills import search_maps
from skills import enrich_website
from skills import audit_social
# from skills import writer        <-- Próximamente

# Configurar Logging
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)
timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    handlers=[logging.FileHandler(LOG_DIR / f"agency_{timestamp}.log", encoding='utf-8'), logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

async def process_lead_concurrently(lead, location, semaphore):
    """
    Procesa un lead individualmente (Enriquecer + Auditar) controlando la concurrencia.
    """
    async with semaphore:
        try:
            # 1. ENRICH (Web)
            if lead.get('website'):
                enrich_data = await enrich_website.visit_and_extract(lead['website'])
                if enrich_data:
                    lead.update(enrich_data)
            else:
                lead['enrichment'] = "No Website"

            # 2. AUDIT (Social - Google)
            if lead.get('name'):
                 audit_result = await audit_social.audit_instagram_via_google(lead['name'], location)
                 lead.update(audit_result)
            
            logger.info(f"✅ Lead Procesado: {lead.get('name')}")
            
        except Exception as e:
            logger.error(f"❌ Error procesando lead {lead.get('name')}: {e}")

async def run_agency(keyword, location, max_leads):
    logger.info("🏢 AGENCIA LOCAL INICIADA (Modo Turbo ⚡)")
    logger.info("========================================")
    
    # FASE 1: SCOUT (Buscador) - Este paso es secuencial por naturaleza de Maps
    logger.info(f"🕵️  SCOUT: Iniciando búsqueda de '{keyword}' en '{location}'...")
    leads = await search_maps.run_search(keyword, location, max_leads)
    
    if not leads:
        logger.warning("❌ No se encontraron leads.")
        return

    logger.info(f"✅ SCOUT: Encontró {len(leads)} candidatos. Iniciando procesamiento PARALELO...")
    
    # FASE 2 & 3: ENRICH + ANALYST (Paralelo)
    # Usamos un semáforo para no explotar la PC (3 Tareas simultáneas)
    sem = asyncio.Semaphore(3) 
    
    tasks = [process_lead_concurrently(lead, location, sem) for lead in leads]
    await asyncio.gather(*tasks)

    # FASE 4: WRITER (Redactor) - Placeholder
    logger.info("✍️  WRITER: (Pasando a Fase 4 - Implementación Pendiente)")
    
    # GUARDAR RESULTADOS
    output_file = Path("prospecting_results") / f"leads_{timestamp}.json"
    output_file.parent.mkdir(exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(leads, f, indent=2, ensure_ascii=False)
        
    logger.info(f"💾 Resultados guardados en: {output_file}")
    logger.info("🎉 Misión Cumplida.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    print("\n--- CONFIGURACIÓN DE LA MISIÓN ---")
    in_keyword = input("📍 Categoría (ej. barberia): ").strip() or "barberia"
    in_location = input("🌎 Zona (ej. Palermo, Buenos Aires): ").strip() or "Palermo, Buenos Aires"
    in_max = input("🔢 Cantidad de Leads (ej. 15): ").strip()
    
    max_leads = int(in_max) if in_max.isdigit() else 15
    
    asyncio.run(run_agency(in_keyword, in_location, max_leads))
