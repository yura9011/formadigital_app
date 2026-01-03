"""
Agent V2 - Main Orchestrator
=============================
Entry point for the local analysis agent.
Can be run standalone or invoked as subprocess from the backend.

Usage:
    python main.py --query "restaurante" --location "Palermo, Buenos Aires" --limit 5
    python main.py --dry-run --query "test"
"""

import argparse
import asyncio
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

from config import LOG_DIR
# Force UTF-8 encoding for stdout/stderr (Windows fix for emojis)
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Ensure we can import from local modules
sys.path.insert(0, str(Path(__file__).parent))

from config import SEARCH_CONFIG, SCRAPING_CONFIG, LOG_DIR, BACKEND_API_URL
from skills.search import SearchSkill
from skills.scraper import ScraperSkill
from skills.llm import LLMSkill
from skills.sync import SyncSkill
from skills.validator import LeadValidator
from models import Lead


# =============================================================================
# Logging Setup
# =============================================================================

# Configure Logging
# We use stderr for logs so stdout is kept clean for JSON output
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stderr),  # Logs to stderr
        logging.FileHandler(LOG_DIR / "agent.log", encoding='utf-8')
    ]
)
logger = logging.getLogger("AnalysisAgent")


# =============================================================================
# Orchestrator
# =============================================================================

class AnalysisOrchestrator:
    """
    Orchestrates the full analysis workflow:
    1. Search (SerpApi) → List of businesses
    2. Scrape + Analyze (parallel) → Enriched data
    3. Validate (optional) → Contactability scoring
    4. Sync → Backend database
    """
    
    def __init__(self, dry_run: bool = False, validate: bool = False):
        self.dry_run = dry_run
        self.validate = validate
        self.search = SearchSkill()
        self.scraper = ScraperSkill()
        self.llm = LLMSkill()
        self.sync = SyncSkill()
        self.validator = LeadValidator() if validate else None
        self.logger = logging.getLogger(__name__)
    
    def run(self, query: str, location: str, limit: int = 10) -> dict:
        """
        Execute the full analysis pipeline.
        
        Returns:
            Dict with: success, clients, stats
        """
        self.logger.info("=" * 50)
        self.logger.info(f"🚀 Starting Analysis: '{query}' in '{location}'")
        self.logger.info("=" * 50)
        
        # Step 1: Search
        businesses = self.search.search(query, location, limit)
        if not businesses:
            return {"success": False, "error": "No results found", "clients": []}
        
        # Step 2: Enrich each business (parallel)
        enriched = self._enrich_parallel(businesses)
        
        # Step 3: Validate (optional)
        if self.validate and self.validator:
            self.logger.info("🔍 Running validation...")
            enriched = self._validate_leads(enriched)
        
        # Step 4: Sync to backend (unless dry run)
        if self.dry_run:
            self.logger.info("🔸 DRY RUN - Skipping sync")
            sync_result = {"success": True, "message": "Dry run - not synced"}
        else:
            sync_result = self.sync.sync_batch(enriched)
        
        # Stats
        tiers = {"HOT": 0, "WARM": 0, "COLD": 0}
        for c in enriched:
            tier = c.get("tier", "WARM")
            if tier in tiers:
                tiers[tier] += 1
        
        result = {
            "success": True,
            "clients": enriched,
            "stats": {
                "total": len(enriched),
                "tiers": tiers,
                "synced": sync_result.get("success", False),
            }
        }
        
        self.logger.info("=" * 50)
        self.logger.info(f"✅ Complete: {len(enriched)} leads enriched")
        self.logger.info(f"   🔥 HOT: {tiers['HOT']} | 🟡 WARM: {tiers['WARM']} | 🔵 COLD: {tiers['COLD']}")
        self.logger.info("=" * 50)
        
        return result
    
    def _enrich_parallel(self, businesses: list[dict], max_workers: int = 3) -> list[dict]:
        """Enrich businesses in parallel for speed."""
        
        def enrich_one(business: dict) -> dict:
            # 1. Enrich with Google Knowledge Graph (Socials, Menu, better Website)
            business = self.search.enrich_with_google(business)
            
            name = business.get("name", "Unknown")
            website = business.get("website")
            
            # Scrape website if available
            if website:
                scrape_result = self.scraper.scrape(website)
                business.update({
                    "email": scrape_result.get("email"),
                    "instagram": scrape_result.get("instagram"),
                    "facebook": scrape_result.get("facebook"),
                    "linkedin": scrape_result.get("linkedin"),
                })
                raw_text = scrape_result.get("raw_text", "")
            else:
                raw_text = ""
            
            # LLM Analysis
            if raw_text or not website:
                analysis = self.llm.analyze_business(
                    raw_text or f"Business: {name}. No website available.",
                    name
                )
                business.update({
                    "summary": analysis.get("summary"),
                    "gaps": analysis.get("gaps"),
                    "tier": analysis.get("tier"),
                    "score": analysis.get("score"),
                })
            else:
                # Default for businesses with broken websites
                business.update({
                    "tier": "HOT",
                    "score": 85,
                    "gaps": ["Website unavailable"],
                })
            
            business["enrichedAt"] = datetime.now().isoformat()
            business["type"] = "LEAD"
            
            return business
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            results = list(executor.map(enrich_one, businesses))
        
        return results
    
    def _validate_leads(self, businesses: list[dict]) -> list[dict]:
        """Validate leads and add contactability scores."""
        validated = []
        
        for business in businesses:
            # Convert to Lead model
            lead = Lead.from_serpapi(business)
            
            # Copy over enriched fields
            lead.email = business.get("email")
            lead.instagram_handle = business.get("instagram")
            
            # Run validation
            result = self.validator.validate_lead(lead)
            
            if result.success:
                # Merge validation results back into business dict
                business.update({
                    "phone_status": result.lead.phone_status,
                    "phone_type": result.lead.phone_type,
                    "normalized_phone": result.lead.normalized_phone,
                    "whatsapp_link": result.lead.whatsapp_link,
                    "instagram_status": result.lead.instagram_status,
                    "instagram_handle": result.lead.instagram_handle,
                    "instagram_url": result.lead.instagram_url,
                    "instagram_confidence": result.lead.instagram_confidence,
                    "email_status": result.lead.email_status,
                    "contactability_score": result.lead.contactability_score,
                    "best_channel": result.lead.best_channel,
                    "validation_status": result.lead.validation_status,
                    "validation_notes": result.lead.validation_notes,
                })
            
            validated.append(business)
        
        # Log summary
        ready_count = sum(1 for b in validated if b.get("validation_status") == "ready")
        self.logger.info(f"✅ Validation complete: {ready_count}/{len(validated)} ready to contact")
        
        return validated


    
    def run_audit(self, input_path: Path) -> dict:
        """
        Execute the audit workflow from a JSON input file.
        """
        self.logger.info("=" * 50)
        self.logger.info(f"🔍 Starting Audit Mode: Reading from {input_path}")
        self.logger.info("=" * 50)
        
        try:
            with open(input_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            client = data.get("client")
            competitors = data.get("competitors", [])
            
            if not client:
                return {"success": False, "error": "Missing 'client' in input JSON"}
            
            # Enrich client with Knowledge Graph before Audit if possible
            # (Optional, but good for context)
            if not client.get("website"):
                client = self.search.enrich_with_google(client)
            
            # Run LLM Audit
            audit_result = self.llm.audit_business(client, competitors)
            
            self.logger.info(f"✅ Audit Generated: Score {audit_result.get('completenessScore')}")
            return {"success": True, "result": audit_result}
            
        except Exception as e:
            self.logger.error(f"Audit failed: {e}")
            return {"success": False, "error": str(e)}

# =============================================================================
# CLI Entry Point
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Local Analysis Agent")
    parser.add_argument("--mode", choices=["search", "audit"], default="search", help="Operation mode")
    parser.add_argument("--query", "-q", help="Search query (e.g., 'restaurante')")
    parser.add_argument("--location", "-l", default="Buenos Aires", help="Location")
    parser.add_argument("--limit", "-n", type=int, default=10, help="Max results")
    parser.add_argument("--input", "-i", help="Input JSON file for audit mode")
    parser.add_argument("--dry-run", action="store_true", help="Don't sync to backend")
    parser.add_argument("--validate", "-v", action="store_true", help="Run contactability validation")
    parser.add_argument("--output", "-o", help="Save JSON output to file")
    
    args = parser.parse_args()
    
    orchestrator = AnalysisOrchestrator(dry_run=args.dry_run, validate=args.validate)
    
    if args.mode == "audit":
        if not args.input:
            logger.error("Audit mode requires --input <json_file>")
            return 1
        result = orchestrator.run_audit(Path(args.input))
    else:
        if not args.query:
            logger.error("Search mode requires --query")
            return 1
        result = orchestrator.run(args.query, args.location, args.limit)
    
    # Output
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        logger.info(f"📁 Output saved: {output_path}")
    else:
        # Print to stdout for subprocess capture
        print(json.dumps(result, ensure_ascii=False, indent=2))
    
    return 0 if result.get("success") else 1


if __name__ == "__main__":
    sys.exit(main())
