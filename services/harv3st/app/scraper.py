import json
import time
import requests
import os
from playwright.sync_api import sync_playwright
from config import Config
from core.parser import extract_business_data

LOG_FILE = "scraper.log"

def log_message(msg):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{timestamp}] {msg}\n")
    print(msg)

def intercept_response(response):
    """
    Listens for Google Maps data responses and extracts business info.
    """
    # Filter for search results
    if not ("search" in response.url and "tbm=map" in response.url):
        return
    
    if response.status != 200:
        return

    try:
        text = response.text()
        log_message(f"📡 Intercepted response from {response.url[:50]}... (Size: {len(text)})")
        
        # Split by delimiter (Google may concatenate multiple JSONs)
        chunks = text.split('/*""*/')
        
        for chunk in chunks:
            chunk = chunk.strip()
            if not chunk: continue
            
            try:
                rsp_json = json.loads(chunk)
                raw_data = rsp_json.get('d', '')
                if not raw_data: continue
                
                if raw_data.startswith(")]}'"):
                    raw_data = raw_data.replace(")]}'", "")
                
                parsed_data = json.loads(raw_data)
                
                # Search for business list at confirmed path [64][0]
                data_list = None
                try:
                    candidate = parsed_data[64][0]
                    if isinstance(candidate, list) and len(candidate) > 1:
                        test_item = candidate[1]
                        if isinstance(test_item, list) and len(test_item) > 11 and isinstance(test_item[11], str):
                            data_list = candidate
                except (IndexError, TypeError):
                     # Fallback search if path changes
                    if isinstance(parsed_data, list):
                        for i in range(len(parsed_data) - 1, -1, -1):
                            node = parsed_data[i]
                            if isinstance(node, list) and len(node) > 0:
                                potential = node[0]
                                if isinstance(potential, list) and len(potential) > 1:
                                    test = potential[1]
                                    if isinstance(test, list) and len(test) > 11 and isinstance(test[11], str):
                                        data_list = potential
                                        break
                
                if data_list:
                    extracted_items = []
                    for raw_item in data_list:
                        if isinstance(raw_item, list) and len(raw_item) > 11:
                            clean_item = extract_business_data(raw_item)
                            if clean_item:
                                extracted_items.append(clean_item)
                    
                    if extracted_items:
                        log_message(f"🎯 Captured {len(extracted_items)} items.")
                        try:
                            # Send to Server API
                            r = requests.post(Config.API_URL, json=extracted_items)
                            log_message(f"✅ Transmitted to API: {r.status_code}")
                        except Exception as e:
                            log_message(f"⚠️ API Error: {e}")
                        
            except json.JSONDecodeError:
                continue
                
    except Exception as e:
        print(f"⚠️ Error processing response: {e}")

def run_scraper(query, headless=None):
    if headless is None:
        headless = Config.HEADLESS
        
    log_message(f"🏁 Starting scraper for: {query} (Headless: {headless})")
    try:
        with sync_playwright() as p:
            log_message("🚀 Launching Browser...")
            browser = p.chromium.launch(headless=headless)
            context = browser.new_context(
                viewport=Config.VIEWPORT,
                user_agent=Config.USER_AGENT
            )
            page = context.new_page()

            # Attach listener
            page.on("response", intercept_response)

            log_message(f"🔍 Searching Google Maps...")
            page.goto(f"https://www.google.com/maps/search/{query}")
            
            try:
                feed_selector = '[role="feed"]'
                page.wait_for_selector(feed_selector, timeout=5000)
                log_message("✅ Results found. Auto-scrolling...")
                
                # Scroll loop
                for i in range(20): # Limiting for debug
                    page.evaluate(f'''() => {{
                        const el = document.querySelector('{feed_selector}');
                        if(el) el.scrollBy(0, 1000);
                    }}''')
                    
                    time.sleep(2) 
                    
                    # Check for end of list
                    is_end = page.evaluate(f'''() => {{
                        const el = document.querySelector('{feed_selector}');
                        const last = el ? el.lastElementChild : null;
                        return last && last.getAttribute('style') && last.getAttribute('style').includes('height');
                    }}''')
                    
                    if is_end:
                        log_message("✅ End of results reached.")
                        break

            except Exception as e:
                log_message(f"ℹ️ Scroll stopped/finished: {e}")

            log_message("🛑 Scraper closing.")
            time.sleep(2)
            browser.close()
    except Exception as outer_e:
        log_message(f"❌ CRITICAL SCRAPER ERROR: {outer_e}")

if __name__ == "__main__":
    run_scraper("Restaurants in New York")
