import os

class Config:
    SERVER_PORT = int(os.getenv("HARV3ST_PORT", "5050"))
    SERVER_HOST = os.getenv("HARV3ST_HOST", "127.0.0.1")
    API_URL = f"http://{SERVER_HOST}:{SERVER_PORT}/api/collect"
    DATA_FILE = os.path.join("data", "leads.json")
    
    # Scraper Settings
    VIEWPORT = {'width': 1280, 'height': 800}
    USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    HEADLESS = os.getenv("HARV3ST_HEADLESS", "true").lower() == "true"
    TIMEOUT_MS = 3000
