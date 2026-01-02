"""
Campaign Manager Module
Allows batch execution of multiple search queries sequentially.
"""
import time
import threading
import json
import os
from config import Config

# Campaign state file
CAMPAIGN_STATE_FILE = os.path.join("data", "campaign_state.json")

class CampaignManager:
    """
    Manages sequential execution of multiple scraping queries.
    """
    
    def __init__(self, scraper_func):
        """
        Args:
            scraper_func: The function to call for each query (e.g., run_scraper)
        """
        self.scraper_func = scraper_func
        self.queries = []
        self.current_index = 0
        self.is_running = False
        self.delay_seconds = 30
        self.results = []  # Track status per query
        self._thread = None
    
    def start(self, queries: list, delay_seconds: int = 30) -> bool:
        """
        Start a new campaign.
        
        Args:
            queries: List of search query strings
            delay_seconds: Delay between each query
            
        Returns:
            bool: True if started, False if already running
        """
        if self.is_running:
            return False
        
        self.queries = queries
        self.delay_seconds = delay_seconds
        self.current_index = 0
        self.is_running = True
        self.results = [{"query": q, "status": "pending"} for q in queries]
        
        # Save initial state
        self._save_state()
        
        # Start background thread
        self._thread = threading.Thread(target=self._run_campaign, daemon=True)
        self._thread.start()
        
        return True
    
    def _run_campaign(self):
        """Execute all queries sequentially."""
        for i, query in enumerate(self.queries):
            if not self.is_running:
                break
            
            self.current_index = i
            self.results[i]["status"] = "running"
            self._save_state()
            
            try:
                # Run the scraper
                self.scraper_func(query, headless=True)
                self.results[i]["status"] = "completed"
            except Exception as e:
                self.results[i]["status"] = f"error: {str(e)}"
            
            self._save_state()
            
            # Delay before next query (unless last)
            if i < len(self.queries) - 1 and self.is_running:
                time.sleep(self.delay_seconds)
        
        self.is_running = False
        self._save_state()
    
    def stop(self):
        """Stop the current campaign."""
        self.is_running = False
    
    def get_status(self) -> dict:
        """Get current campaign status."""
        return {
            "is_running": self.is_running,
            "total": len(self.queries),
            "current_index": self.current_index,
            "current_query": self.queries[self.current_index] if self.queries else None,
            "completed": sum(1 for r in self.results if r["status"] == "completed"),
            "results": self.results
        }
    
    def _save_state(self):
        """Persist campaign state to file."""
        try:
            os.makedirs(os.path.dirname(CAMPAIGN_STATE_FILE), exist_ok=True)
            with open(CAMPAIGN_STATE_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.get_status(), f, indent=2)
        except:
            pass
    
    @classmethod
    def load_state(cls) -> dict:
        """Load last campaign state from file."""
        try:
            if os.path.exists(CAMPAIGN_STATE_FILE):
                with open(CAMPAIGN_STATE_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except:
            pass
        return {"is_running": False, "total": 0, "results": []}


# Global campaign instance (will be initialized in server)
campaign_instance = None

def get_campaign_manager(scraper_func=None):
    """Get or create the global campaign manager."""
    global campaign_instance
    if campaign_instance is None and scraper_func is not None:
        campaign_instance = CampaignManager(scraper_func)
    return campaign_instance
