"""
ScraperSkill - Website Content Extraction
==========================================
Fetches and extracts content from business websites.
Uses requests for speed, falls back to Playwright for JS-heavy sites.
"""

import re
import logging
from typing import Optional
import requests
from bs4 import BeautifulSoup

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import SCRAPING_CONFIG

logger = logging.getLogger(__name__)


class ScraperSkill:
    """Scrapes business websites for contact info and content."""
    
    def __init__(self):
        self.timeout = SCRAPING_CONFIG["timeout_ms"] / 1000  # Convert to seconds
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
    
    def scrape(self, url: str) -> dict:
        """
        Scrape a website for contact information and content.
        Uses Playwright to render JS and handle modern sites.
        """
        if not url or "google.com" in url:
            return self._empty_result()
        
        logger.info(f"🌐 Scraping (Playwright): {url}")
        
        from playwright.sync_api import sync_playwright
        
        try:
            with sync_playwright() as p:
                # Launch browser (headless based on config)
                browser = p.chromium.launch(headless=True)
                
                # Context with realistic user agent
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    viewport={"width": 1280, "height": 720}
                )
                
                page = context.new_page()
                
                # Set timeout
                try:
                    page.goto(url, timeout=SCRAPING_CONFIG["timeout_ms"], wait_until="domcontentloaded")
                    # Small wait for hydration/dynamic content
                    page.wait_for_timeout(2000)
                except Exception as e:
                    logger.warning(f"⚠️ Page load timeout/error: {e}")
                    # Continue anyway to scrape what we got
                
                # Get Content
                html = page.content()
                browser.close()
                
                return self._extract_data(html, url)

        except Exception as e:
            logger.error(f"❌ Playwright failed for {url}: {e}")
            # Fallback to requests if Playwright explodes (e.g. not installed)
            logger.info("⚠️ Falling back to basic requests...")
            try:
                response = requests.get(url, headers=self.headers, timeout=10)
                return self._extract_data(response.text, url)
            except Exception as e2:
                return self._empty_result(error=str(e))
    
    def _extract_data(self, html: str, base_url: str) -> dict:
        """Extract emails and social links from HTML."""
        soup = BeautifulSoup(html, "html.parser")
        result = self._empty_result()
        
        # Extract visible text for LLM analysis
        # Extract visible text for LLM analysis
        for script in soup(["script", "style", "nav", "footer"]):
            script.decompose()
            
        # Get Meta Data (Crucial for context)
        title = soup.title.string if soup.title else ""
        meta_desc = ""
        desc_tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
        if desc_tag:
            meta_desc = desc_tag.get("content", "")
            
        # Combine distinct text content
        body_text = soup.get_text(separator=" ", strip=True)[:3000]
        result["raw_text"] = f"Title: {title}\nDescription: {meta_desc}\n\nContent:\n{body_text}"
        
        # Extract emails
        emails = self._extract_emails(html)
        if emails:
            result["email"] = emails[0]
        
        # Extract social links
        social = self._extract_social_links(soup)
        result.update(social)
        
        result["status"] = "success"
        return result
    
    def _extract_emails(self, content: str) -> list[str]:
        """Find emails in content."""
        pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        emails = re.findall(pattern, content)
        
        # Filter out image extensions (false positives)
        valid = [
            e for e in emails 
            if not e.endswith(('.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'))
        ]
        return list(set(valid))
    
    def _extract_social_links(self, soup: BeautifulSoup) -> dict:
        """Extract social media links."""
        social = {
            "instagram": None,
            "facebook": None,
            "linkedin": None,
        }
        
        patterns = {
            "instagram": "instagram.com",
            "facebook": "facebook.com",
            "linkedin": "linkedin.com",
        }
        
        for link in soup.find_all("a", href=True):
            href = link["href"]
            for platform, pattern in patterns.items():
                if pattern in href and not social[platform]:
                    social[platform] = href
                    
        return social
    
    def _empty_result(self, error: Optional[str] = None) -> dict:
        return {
            "email": None,
            "instagram": None,
            "facebook": None,
            "linkedin": None,
            "raw_text": "",
            "status": "error" if error else "skipped",
            "error": error,
        }


# Quick test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    skill = ScraperSkill()
    result = skill.scrape("https://example.com")
    print(result)
