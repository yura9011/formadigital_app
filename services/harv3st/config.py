import os

class Config:
    SERVER_PORT = 5050
    SERVER_HOST = "localhost"
    API_URL = f"http://{SERVER_HOST}:{SERVER_PORT}/api/collect"
    DATA_FILE = os.path.join("data", "leads.json")
    
    # Scraper Settings
    VIEWPORT = {'width': 1280, 'height': 800}
    USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    HEADLESS = False # Set to True for production background run
    TIMEOUT_MS = 3000
