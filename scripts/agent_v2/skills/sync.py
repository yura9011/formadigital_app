"""
SyncSkill - Backend API Synchronization
========================================
Pushes enriched client data to the NestJS backend API.
"""

import logging
from typing import Optional
import requests

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import BACKEND_API_URL

logger = logging.getLogger(__name__)


class SyncSkill:
    """Syncs enriched leads to the backend database."""
    
    def __init__(self):
        self.api_url = BACKEND_API_URL
        self.batch_endpoint = f"{self.api_url}/clients/batch"
    
    def sync_batch(self, clients: list[dict]) -> dict:
        """
        Send a batch of clients to the backend for upsert.
        
        Args:
            clients: List of enriched client dicts
            
        Returns:
            Dict with: success, created_count, updated_count, errors
        """
        if not clients:
            return {"success": True, "message": "No clients to sync"}
        
        logger.info(f"📤 Syncing {len(clients)} clients to {self.batch_endpoint}")
        
        try:
            response = requests.post(
                self.batch_endpoint,
                json={"clients": clients},
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code in (200, 201):
                result = response.json()
                logger.info(f"✅ Sync complete: {result}")
                return {"success": True, **result}
            else:
                logger.error(f"❌ Sync failed: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "details": response.text[:500]
                }
                
        except requests.RequestException as e:
            logger.error(f"❌ Sync request failed: {e}")
            return {"success": False, "error": str(e)}
    
    def sync_single(self, client: dict) -> Optional[dict]:
        """Sync a single client. Returns the created/updated record."""
        result = self.sync_batch([client])
        return result if result.get("success") else None


# Quick test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    skill = SyncSkill()
    
    test_client = {
        "name": "Test Business",
        "address": "123 Test St",
        "phone": "+54 11 1234-5678",
        "tier": "HOT",
        "score": 85,
    }
    
    result = skill.sync_batch([test_client])
    print(result)
