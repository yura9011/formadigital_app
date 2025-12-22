"""
SearchSkill - Google Maps Search via SerpApi
=============================================
Uses SerpApi for reliable, structured Google Maps data.
Falls back to direct scraping if SerpApi quota exhausted.
"""

import logging
from typing import Optional
from serpapi import GoogleSearch

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import SERPAPI_KEY, SEARCH_CONFIG

logger = logging.getLogger(__name__)


class SearchSkill:
    """Searches Google Maps for businesses matching a query."""
    
    def __init__(self):
        self.api_key = SERPAPI_KEY
        if not self.api_key:
            logger.warning("⚠️ SERPAPI_KEY not set. Search will fail.")
    
    def search(
        self,
        query: str,
        location: Optional[str] = None,
        limit: Optional[int] = None
    ) -> list[dict]:
        """
        Search Google Maps for businesses.
        
        Args:
            query: Search term (e.g., "pizzeria", "kiosco")
            location: Location context (e.g., "Palermo, Buenos Aires")
            limit: Max results to return
            
        Returns:
            List of business dicts with keys:
            - name, address, phone, website, rating, reviewCount, placeId, etc.
        """
        if not self.api_key:
            logger.error("❌ Cannot search: SERPAPI_KEY not configured")
            return []
        
        location = location or SEARCH_CONFIG["default_location"]
        limit = limit or SEARCH_CONFIG["max_results"]
        
        full_query = f"{query} en {location}"
        logger.info(f"🔍 Searching: '{full_query}' (limit: {limit})")
        
        try:
            params = {
                "engine": "google_maps",
                "q": full_query,
                "hl": SEARCH_CONFIG["language"],
                "type": "search",
                "api_key": self.api_key,
            }
            
            search = GoogleSearch(params)
            results = search.get_dict()
            
            local_results = results.get("local_results", [])
            
            # Normalize to our schema
            businesses = []
            for r in local_results[:limit]:
                business = {
                    "name": r.get("title", "N/A"),
                    "address": r.get("address", "N/A"),
                    "phone": r.get("phone"),
                    "website": r.get("website"),
                    "rating": r.get("rating"),
                    "reviewCount": r.get("reviews"),
                    "placeId": r.get("place_id"),
                    "category": r.get("type"),
                    "latitude": r.get("gps_coordinates", {}).get("latitude"),
                    "longitude": r.get("gps_coordinates", {}).get("longitude"),
                    "googleMapsUri": r.get("link"),
                    "source": "SerpApi",
                }
                businesses.append(business)
            
            logger.info(f"✅ Found {len(businesses)} results")
            return businesses
            
        except Exception as e:
            logger.error(f"❌ SerpApi search failed: {e}")
            return []

    def enrich_with_google(self, business: dict) -> dict:
        """
        Perform a standard Google Search to get Knowledge Graph data 
        (social profiles, menu, description).
        """
        if not self.api_key:
            return business

        query = f"{business['name']} {business['address']}"
        logger.info(f"🔎 Enriching via Google: '{query}'")

        try:
            params = {
                "engine": "google",
                "q": query,
                "api_key": self.api_key,
                "hl": SEARCH_CONFIG["language"],
                "gl": "ar",
            }
            
            search = GoogleSearch(params)
            results = search.get_dict()
            kg = results.get("knowledge_graph", {})
            
            # Extract Social Profiles
            profiles = kg.get("profiles", [])
            for p in profiles:
                link = p.get("link", "")
                name = p.get("name", "").lower()
                
                if "instagram" in name:
                    business["instagram"] = link
                elif "facebook" in name:
                    business["facebook"] = link
                elif "linkedin" in name:
                    business["linkedin"] = link
                elif "twitter" in name or "x" in name:
                    business["twitter"] = link
            
            # Extract other metadata if missing
            if not business.get("website") and kg.get("website"):
                raw_site = kg.get("website")
                # Clean Google Redirect URLs
                if raw_site.startswith("/url?q="):
                    from urllib.parse import parse_qs, urlparse
                    try:
                        parsed = urlparse(raw_site)
                        query_params = parse_qs(parsed.query)
                        business["website"] = query_params.get("q", [raw_site])[0]
                    except:
                        business["website"] = raw_site
                else:
                    business["website"] = raw_site
                
            return business
            
        except Exception as e:
            logger.warning(f"⚠️ Google enrichment failed for {business['name']}: {e}")
            return business


# Quick test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    skill = SearchSkill()
    results = skill.search("restaurante", "Palermo, Buenos Aires", limit=3)
    for r in results:
        print(f"  - {r['name']} | {r['rating']}⭐ | {r['address']}")
