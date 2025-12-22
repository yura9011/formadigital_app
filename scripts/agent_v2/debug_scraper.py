from skills.scraper import ScraperSkill
import logging

logging.basicConfig(level=logging.INFO)
skill = ScraperSkill()
url = "http://doroitalianbar.com"
result = skill.scrape(url)

print("=== RAW TEXT SENT TO LLM ===")
print(result.get("raw_text", "NO TEXT"))
print("============================")
