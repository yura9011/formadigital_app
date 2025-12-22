
import asyncio
import re
import logging
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

async def visit_and_extract(url):
    """
    Visita un sitio web y extrae emails y links a redes sociales.
    """
    data = {"emails": [], "instagram": None, "facebook": None, "linkedin": None}
    
    if not url: return data

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        try:
            print(f"   🌐 (ENRICH) Visitando {url}...")
            # Timeout corto de 15s para no trabar
            await page.goto(url, wait_until="domcontentloaded", timeout=15000)
            
            # --- EMAIL ---
            # 1. Mailto links
            mailto_links = await page.locator('a[href^="mailto:"]').all()
            for el in mailto_links:
                href = await el.get_attribute("href")
                if href:
                    clean_email = href.replace("mailto:", "").split("?")[0]
                    if "@" in clean_email: data["emails"].append(clean_email)
            
            # 2. Regex en texto visible (fallback)
            if not data["emails"]:
                text = await page.inner_text("body")
                emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
                data["emails"] = list(set(emails)) # Unicos

            # --- SOCIAL ---
            # Instagram
            ig_el = page.locator('a[href*="instagram.com"]')
            if await ig_el.count() > 0:
                data["instagram"] = await ig_el.first.get_attribute("href")

            # Facebook
            fb_el = page.locator('a[href*="facebook.com"]')
            if await fb_el.count() > 0:
                data["facebook"] = await fb_el.first.get_attribute("href")
                
            # LinkedIn
            li_el = page.locator('a[href*="linkedin.com"]')
            if await li_el.count() > 0:
                data["linkedin"] = await li_el.first.get_attribute("href")
                
            if data["emails"]: print(f"      📧 Emails encontrados: {data['emails']}")
            if data["instagram"]: print(f"      📸 IG: {data['instagram']}")

        except Exception as e:
            logger.warning(f"   ⚠️ Error visitando web {url}: {e}")
        finally:
            await browser.close()
            
    return data
