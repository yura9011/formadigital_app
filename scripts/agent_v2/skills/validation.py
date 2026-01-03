"""
ValidationSkills - Lead Contact Validation
==========================================
Skills for validating and enriching lead contact information.
Includes phone validation, Instagram finding, and email extraction.
"""

import re
import logging
from dataclasses import dataclass
from typing import Optional, Literal
from datetime import datetime

logger = logging.getLogger(__name__)


# =============================================================================
# Data Classes - Results
# =============================================================================

@dataclass
class PhoneValidationResult:
    """Result of phone number validation."""
    is_valid: bool
    phone_type: Literal["mobile", "landline", "unknown"]
    normalized_number: Optional[str]
    whatsapp_link: Optional[str]
    error_message: Optional[str]


@dataclass
class InstagramResult:
    """Result of Instagram search."""
    found: bool
    handle: Optional[str]
    url: Optional[str]
    source: Optional[Literal["website", "knowledge_graph", "google_search"]]
    confidence: Optional[Literal["high", "medium", "low"]]
    verification_notes: Optional[str]


@dataclass
class EmailResult:
    """Result of email extraction."""
    found: bool
    email: Optional[str]
    source_page: Optional[str]
    confidence: Optional[Literal["high", "medium", "low"]]
    error: Optional[str] = None


# =============================================================================
# PhoneValidatorSkill
# =============================================================================

class PhoneValidatorSkill:
    """
    Validates Argentine phone numbers and generates WhatsApp links.
    
    Argentine phone format:
    - Mobile: 11 XXXX-XXXX (Buenos Aires) or area_code + 15 + XXXX-XXXX
    - Landline: 11 4XXX-XXXX (starts with 4)
    - International: +54 9 11 XXXX-XXXX (mobile) or +54 11 XXXX-XXXX (landline)
    
    Mobile detection:
    - Numbers with '15' after area code are mobile
    - Numbers with '9' after country code (+54 9) are mobile
    - Buenos Aires mobile: starts with 11 followed by non-4 digit
    
    Landline detection:
    - Buenos Aires landline: 11 4XXX-XXXX (starts with 4 after area code)
    """
    
    # Buenos Aires area code
    BA_AREA_CODE = '11'
    
    # Common Argentine area codes (2-4 digits)
    AREA_CODES = [
        '11',   # Buenos Aires
        '221',  # La Plata
        '223',  # Mar del Plata
        '261',  # Mendoza
        '341',  # Rosario
        '351',  # Córdoba
        '381',  # Tucumán
        '387',  # Salta
        '379',  # Corrientes
        '343',  # Paraná
        '362',  # Resistencia
        '370',  # Formosa
        '376',  # Posadas
        '380',  # La Rioja
        '383',  # Catamarca
        '385',  # Santiago del Estero
        '388',  # Jujuy
        '2202', # González Catán
        '2204', # Merlo
        '2205', # Moreno
        '220',  # Merlo/Moreno area
        '237',  # Morón/Castelar
        '236',  # Junín
        '249',  # Tandil
    ]
    
    def validate(self, phone: str) -> PhoneValidationResult:
        """
        Validates an Argentine phone number.
        
        Args:
            phone: Raw phone string from GMB/Harv3st
            
        Returns:
            PhoneValidationResult with validation details
        """
        # Handle empty input
        if not phone or not phone.strip():
            return PhoneValidationResult(
                is_valid=False,
                phone_type="unknown",
                normalized_number=None,
                whatsapp_link=None,
                error_message="Phone number is empty"
            )
        
        # Clean the phone number - remove all non-digit characters
        cleaned = self._clean_phone(phone)
        
        # Check for invalid characters in original (after basic cleaning)
        if not cleaned:
            return PhoneValidationResult(
                is_valid=False,
                phone_type="unknown",
                normalized_number=None,
                whatsapp_link=None,
                error_message=f"Phone contains no valid digits"
            )
        
        # Validate length (Argentine numbers: 10-13 digits depending on format)
        if len(cleaned) < 10:
            return PhoneValidationResult(
                is_valid=False,
                phone_type="unknown",
                normalized_number=None,
                whatsapp_link=None,
                error_message=f"Phone has {len(cleaned)} digits, expected at least 10"
            )
        
        if len(cleaned) > 13:
            return PhoneValidationResult(
                is_valid=False,
                phone_type="unknown",
                normalized_number=None,
                whatsapp_link=None,
                error_message=f"Phone has {len(cleaned)} digits, expected at most 13"
            )
        
        # Normalize to standard format and detect type
        normalized, phone_type = self._normalize_and_classify(cleaned)
        
        if normalized is None:
            return PhoneValidationResult(
                is_valid=False,
                phone_type="unknown",
                normalized_number=None,
                whatsapp_link=None,
                error_message=f"Unrecognized phone format: {phone}"
            )
        
        # Generate WhatsApp link only for mobile
        whatsapp_link = None
        if phone_type == "mobile":
            whatsapp_link = self._generate_whatsapp_link(normalized)
        
        return PhoneValidationResult(
            is_valid=True,
            phone_type=phone_type,
            normalized_number=normalized,
            whatsapp_link=whatsapp_link,
            error_message=None
        )
    
    def _clean_phone(self, phone: str) -> str:
        """Remove all non-digit characters from phone string."""
        return re.sub(r'\D', '', phone)
    
    def _normalize_and_classify(self, cleaned: str) -> tuple[Optional[str], Literal["mobile", "landline", "unknown"]]:
        """
        Normalize phone to international format and classify type.
        
        Returns:
            Tuple of (normalized_number, phone_type)
            normalized_number is in format +54XXXXXXXXXX
        """
        # Remove leading zeros
        cleaned = cleaned.lstrip('0')
        
        # Case 1: Already has country code 54
        if cleaned.startswith('54'):
            return self._process_with_country_code(cleaned)
        
        # Case 2: Starts with 9 (mobile indicator without country code)
        if cleaned.startswith('9') and len(cleaned) >= 11:
            # Add country code
            return self._process_with_country_code('54' + cleaned)
        
        # Case 3: Starts with 15 (old mobile format)
        if cleaned.startswith('15') and len(cleaned) >= 10:
            # Convert 15XXXXXXXX to 549 11 XXXXXXXX (assuming Buenos Aires)
            local_number = cleaned[2:]  # Remove 15
            normalized = f"+54911{local_number}"
            return (normalized, "mobile")
        
        # Case 4: Starts with area code (10 digits local format)
        if len(cleaned) == 10:
            return self._process_local_number(cleaned)
        
        # Case 5: 11 digits starting with area code + 15
        if len(cleaned) == 11:
            # Could be area_code + 15 + number
            for ac in self.AREA_CODES:
                if cleaned.startswith(ac + '15'):
                    local_number = cleaned[len(ac) + 2:]  # Remove area code and 15
                    normalized = f"+549{ac}{local_number}"
                    return (normalized, "mobile")
        
        return (None, "unknown")
    
    def _process_with_country_code(self, cleaned: str) -> tuple[Optional[str], Literal["mobile", "landline", "unknown"]]:
        """Process number that starts with 54 (country code)."""
        # Remove country code for analysis
        without_cc = cleaned[2:]
        
        # Check if it has mobile indicator (9)
        if without_cc.startswith('9'):
            # Mobile format: 54 9 XX XXXX XXXX
            local_part = without_cc[1:]  # Remove the 9
            if len(local_part) >= 10:
                normalized = f"+54{without_cc}"
                return (normalized, "mobile")
        
        # Check for landline (no 9, area code + 4XXX pattern)
        if len(without_cc) >= 10:
            # Try to match area code
            for ac in sorted(self.AREA_CODES, key=len, reverse=True):
                if without_cc.startswith(ac):
                    local_number = without_cc[len(ac):]
                    if local_number.startswith('4'):
                        normalized = f"+54{without_cc}"
                        return (normalized, "landline")
                    else:
                        # Mobile without 9 prefix (some formats)
                        normalized = f"+549{without_cc}"
                        return (normalized, "mobile")
        
        return (None, "unknown")
    
    def _process_local_number(self, cleaned: str) -> tuple[Optional[str], Literal["mobile", "landline", "unknown"]]:
        """Process 10-digit local number (area code + number)."""
        # Try to match area code
        for ac in sorted(self.AREA_CODES, key=len, reverse=True):
            if cleaned.startswith(ac):
                local_number = cleaned[len(ac):]
                
                # Buenos Aires special case
                if ac == '11':
                    # 11 4XXX XXXX = landline
                    # 11 [^4]XXX XXXX = mobile
                    if local_number.startswith('4'):
                        normalized = f"+54{cleaned}"
                        return (normalized, "landline")
                    else:
                        normalized = f"+549{cleaned}"
                        return (normalized, "mobile")
                
                # Other areas: assume mobile if not starting with 4
                if local_number.startswith('4'):
                    normalized = f"+54{cleaned}"
                    return (normalized, "landline")
                else:
                    normalized = f"+549{cleaned}"
                    return (normalized, "mobile")
        
        # Couldn't match area code, assume Buenos Aires mobile
        if len(cleaned) == 10:
            normalized = f"+549{cleaned}"
            return (normalized, "mobile")
        
        return (None, "unknown")
    
    def _generate_whatsapp_link(self, normalized: str) -> str:
        """Generate WhatsApp link from normalized number."""
        # Remove + for wa.me format
        number = normalized.replace('+', '')
        return f"wa.me/{number}"


# =============================================================================
# InstagramFinderSkill
# =============================================================================

class InstagramFinderSkill:
    """
    Searches for business Instagram profiles.
    
    Strategy:
    1. If website provided, scrape for Instagram links
    2. If not found, search Google: "{name} {location} instagram"
    3. Verify match by checking profile name/bio
    """
    
    # Instagram URL patterns
    INSTAGRAM_PATTERNS = [
        r'(?:https?://)?(?:www\.)?instagram\.com/([a-zA-Z0-9_.]+)/?',
        r'(?:https?://)?(?:www\.)?instagr\.am/([a-zA-Z0-9_.]+)/?',
    ]
    
    def __init__(self, search_skill=None):
        """
        Args:
            search_skill: Optional SearchSkill instance for Google searches
        """
        self.search_skill = search_skill
        self.last_request_time: Optional[datetime] = None
        self.min_request_interval = 3.0  # seconds
    
    def find(
        self, 
        business_name: str, 
        location: str, 
        website: Optional[str] = None,
        html_content: Optional[str] = None
    ) -> InstagramResult:
        """
        Searches for business Instagram profile.
        
        Args:
            business_name: Name of the business
            location: City/neighborhood
            website: Optional website URL to scrape first
            html_content: Optional pre-scraped HTML content
            
        Returns:
            InstagramResult with handle, URL, confidence
        """
        # Strategy 1: Extract from provided HTML content
        if html_content:
            result = self.extract_from_html(html_content)
            if result:
                handle, url = result
                confidence = self.verify_match(handle, business_name, location)
                return InstagramResult(
                    found=True,
                    handle=handle,
                    url=url,
                    source="website",
                    confidence=confidence,
                    verification_notes=f"Found in website HTML, confidence: {confidence}"
                )
        
        # Strategy 2: Search Google if we have search_skill
        if self.search_skill:
            self._respect_rate_limit()
            google_result = self._search_google(business_name, location)
            if google_result:
                handle, url, source = google_result
                confidence = self.verify_match(handle, business_name, location)
                return InstagramResult(
                    found=True,
                    handle=handle,
                    url=url,
                    source=source,
                    confidence=confidence,
                    verification_notes=f"Found via {source}, confidence: {confidence}"
                )
        
        # Not found
        return InstagramResult(
            found=False,
            handle=None,
            url=None,
            source=None,
            confidence=None,
            verification_notes="No Instagram profile found"
        )
    
    def extract_from_html(self, html: str) -> Optional[tuple[str, str]]:
        """
        Extract Instagram handle and URL from HTML content.
        
        Returns:
            Tuple of (handle, url) or None if not found
        """
        if not html:
            return None
        
        # Try each pattern
        for pattern in self.INSTAGRAM_PATTERNS:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches:
                handle = match.strip('/')
                # Filter out common non-profile pages
                if handle.lower() in ['p', 'explore', 'accounts', 'about', 'legal', 'privacy', 'terms', 'help']:
                    continue
                # Filter out handles that are too short or look like paths
                if len(handle) < 2 or '/' in handle:
                    continue
                
                url = f"https://instagram.com/{handle}"
                return (handle, url)
        
        # Also check for href attributes with instagram
        href_pattern = r'href=["\']([^"\']*instagram\.com/[^"\']+)["\']'
        href_matches = re.findall(href_pattern, html, re.IGNORECASE)
        for href in href_matches:
            # Extract handle from URL
            for pattern in self.INSTAGRAM_PATTERNS:
                match = re.search(pattern, href, re.IGNORECASE)
                if match:
                    handle = match.group(1).strip('/')
                    if handle.lower() not in ['p', 'explore', 'accounts', 'about', 'legal', 'privacy', 'terms', 'help']:
                        if len(handle) >= 2 and '/' not in handle:
                            url = f"https://instagram.com/{handle}"
                            return (handle, url)
        
        return None
    
    def _search_google(self, business_name: str, location: str) -> Optional[tuple[str, str, str]]:
        """
        Search Google for Instagram profile.
        
        Returns:
            Tuple of (handle, url, source) or None
        """
        if not self.search_skill:
            return None
        
        try:
            # Use the search skill's enrich_with_google which already extracts social profiles
            # Or do a direct search
            from serpapi import GoogleSearch
            
            query = f"{business_name} {location} instagram"
            logger.info(f"🔎 Searching Google for Instagram: '{query}'")
            
            params = {
                "engine": "google",
                "q": query,
                "api_key": self.search_skill.api_key,
                "hl": "es",
                "gl": "ar",
                "num": 5,
            }
            
            search = GoogleSearch(params)
            results = search.get_dict()
            
            # Check Knowledge Graph first
            kg = results.get("knowledge_graph", {})
            profiles = kg.get("profiles", [])
            for p in profiles:
                link = p.get("link", "")
                name = p.get("name", "").lower()
                if "instagram" in name or "instagram.com" in link:
                    for pattern in self.INSTAGRAM_PATTERNS:
                        match = re.search(pattern, link, re.IGNORECASE)
                        if match:
                            handle = match.group(1).strip('/')
                            url = f"https://instagram.com/{handle}"
                            return (handle, url, "knowledge_graph")
            
            # Check organic results
            organic = results.get("organic_results", [])
            for result in organic:
                link = result.get("link", "")
                if "instagram.com" in link:
                    for pattern in self.INSTAGRAM_PATTERNS:
                        match = re.search(pattern, link, re.IGNORECASE)
                        if match:
                            handle = match.group(1).strip('/')
                            if handle.lower() not in ['p', 'explore', 'accounts']:
                                url = f"https://instagram.com/{handle}"
                                return (handle, url, "google_search")
            
            return None
            
        except Exception as e:
            logger.warning(f"⚠️ Google search for Instagram failed: {e}")
            return None
    
    def verify_match(
        self, 
        handle: str, 
        business_name: str, 
        location: str
    ) -> Literal["high", "medium", "low"]:
        """
        Verify if Instagram profile matches the business.
        
        Heuristics:
        - High: Handle contains significant part of business name
        - Medium: Handle contains location or partial name match
        - Low: No clear match (found via search but unverified)
        
        Returns:
            Confidence level
        """
        if not handle or not business_name:
            return "low"
        
        # Normalize for comparison
        handle_lower = handle.lower().replace('_', '').replace('.', '')
        name_lower = business_name.lower()
        
        # Remove common words from business name
        stop_words = ['la', 'el', 'los', 'las', 'de', 'del', 'y', 'e', 'the', 'and', 'of']
        name_words = [w for w in name_lower.split() if w not in stop_words and len(w) > 2]
        
        # Check for significant name match
        name_combined = ''.join(name_words)
        
        # High confidence: handle contains most of the business name
        if name_combined and name_combined in handle_lower:
            return "high"
        
        # High confidence: handle is very similar to business name
        if len(name_words) > 0:
            matches = sum(1 for word in name_words if word in handle_lower)
            if matches >= len(name_words) * 0.7:  # 70% of words match
                return "high"
        
        # Medium confidence: partial match or location match
        location_lower = location.lower() if location else ""
        location_words = [w for w in location_lower.split() if len(w) > 2]
        
        if any(word in handle_lower for word in name_words):
            return "medium"
        
        if any(word in handle_lower for word in location_words):
            return "medium"
        
        # Low confidence: no clear match
        return "low"
    
    def _respect_rate_limit(self):
        """Ensure minimum interval between requests."""
        import time
        
        if self.last_request_time:
            elapsed = (datetime.now() - self.last_request_time).total_seconds()
            if elapsed < self.min_request_interval:
                sleep_time = self.min_request_interval - elapsed
                logger.debug(f"Rate limiting: sleeping {sleep_time:.1f}s")
                time.sleep(sleep_time)
        
        self.last_request_time = datetime.now()


# =============================================================================
# EmailFinderSkill
# =============================================================================

class EmailFinderSkill:
    """
    Extracts email addresses from business websites.
    Filters generic emails and prioritizes personal/business contacts.
    """
    
    # Generic email prefixes to deprioritize
    GENERIC_PREFIXES = [
        'info', 'noreply', 'no-reply', 'support', 'admin', 
        'webmaster', 'postmaster', 'mailer-daemon', 'root',
        'newsletter', 'marketing', 'spam', 'abuse'
    ]
    
    # Preferred email prefixes (higher priority)
    PREFERRED_PREFIXES = [
        'ventas', 'sales', 'contacto', 'contact', 'hola', 
        'hello', 'reservas', 'booking', 'pedidos', 'orders'
    ]
    
    # Image extensions to filter out (false positives)
    IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp']
    
    def find(self, website_url: str, html_content: Optional[str] = None) -> EmailResult:
        """
        Extracts email addresses from business website.
        
        Args:
            website_url: URL to scrape
            html_content: Optional pre-scraped HTML content
            
        Returns:
            EmailResult with email, source page, confidence
        """
        if not html_content:
            return EmailResult(
                found=False,
                email=None,
                source_page=None,
                confidence=None,
                error="No HTML content provided"
            )
        
        # Extract all emails from HTML
        emails = self.extract_emails(html_content)
        
        if not emails:
            return EmailResult(
                found=False,
                email=None,
                source_page=website_url,
                confidence=None,
                error=None
            )
        
        # Filter and prioritize
        result = self.filter_and_prioritize(emails)
        
        if result:
            email, confidence = result
            return EmailResult(
                found=True,
                email=email,
                source_page=website_url,
                confidence=confidence,
                error=None
            )
        
        # All emails were filtered out (all generic)
        # Return the first one with low confidence
        return EmailResult(
            found=True,
            email=emails[0],
            source_page=website_url,
            confidence="low",
            error=None
        )
    
    def extract_emails(self, html: str) -> list[str]:
        """
        Extract all email addresses from HTML content.
        
        Returns:
            List of email addresses found
        """
        if not html:
            return []
        
        # Email regex pattern
        pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        
        # Find all matches
        emails = re.findall(pattern, html)
        
        # Filter out image extensions (false positives like image@2x.png)
        valid_emails = []
        for email in emails:
            email_lower = email.lower()
            is_image = any(email_lower.endswith(ext) for ext in self.IMAGE_EXTENSIONS)
            if not is_image:
                valid_emails.append(email.lower())
        
        # Remove duplicates while preserving order
        seen = set()
        unique_emails = []
        for email in valid_emails:
            if email not in seen:
                seen.add(email)
                unique_emails.append(email)
        
        return unique_emails
    
    def filter_and_prioritize(self, emails: list[str]) -> Optional[tuple[str, Literal["high", "medium", "low"]]]:
        """
        Filter generic emails and return best candidate with confidence.
        
        Priority:
        1. Preferred prefixes (ventas@, contacto@, etc.) → high confidence
        2. Personal names (not generic) → medium confidence
        3. Generic prefixes (info@, support@) → low confidence
        
        Returns:
            Tuple of (best_email, confidence) or None if all filtered
        """
        if not emails:
            return None
        
        # Categorize emails
        preferred = []
        personal = []
        generic = []
        
        for email in emails:
            prefix = email.split('@')[0].lower()
            
            # Check if preferred
            if any(pref in prefix for pref in self.PREFERRED_PREFIXES):
                preferred.append(email)
            # Check if generic
            elif any(gen == prefix or prefix.startswith(gen) for gen in self.GENERIC_PREFIXES):
                generic.append(email)
            # Otherwise it's personal/business
            else:
                personal.append(email)
        
        # Return best match
        if preferred:
            return (preferred[0], "high")
        if personal:
            return (personal[0], "medium")
        if generic:
            return (generic[0], "low")
        
        return None
    
    def is_generic_email(self, email: str) -> bool:
        """Check if email is a generic/no-reply type."""
        prefix = email.split('@')[0].lower()
        return any(gen == prefix or prefix.startswith(gen) for gen in self.GENERIC_PREFIXES)


# Quick test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Test PhoneValidatorSkill
    phone_validator = PhoneValidatorSkill()
    print("PhoneValidatorSkill created")
    
    # Test InstagramFinderSkill
    instagram_finder = InstagramFinderSkill()
    print("InstagramFinderSkill created")
    
    # Test EmailFinderSkill
    email_finder = EmailFinderSkill()
    print("EmailFinderSkill created")
    
    print("\n✅ All validation skills initialized successfully")
