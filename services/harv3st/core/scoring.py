"""
Lead Scoring Module
Assigns opportunity scores to leads based on configurable rules.
Higher score = better prospect for outreach.
Scoring is aligned with Forma Digital's 4 service lines:
  1. Presencia web (sitios web)
  2. Google Business (fichas optimizadas)
  3. WhatsApp con IA (automatización de atención)
  4. Odoo/ERP (operaciones y facturación)
"""

FOOD_CATEGORIES = [
    "restaurante", "café", "cafetería", "bodega", "pizzería", "heladería",
    "panadería", "bar", "pub", "cervecería", "comida", "delivery",
    "rotisería", "sushi", "hamburguesería", "parrilla", "comida rápida",
    "takeaway", "catering", "confitería", "churrasquería",
]

RETAIL_CATEGORIES = [
    "tienda", "local", "boutique", "ferretería", "librería", "floristería",
    "kiosco", "supermercado", "minimarket", "almacén", "pollería",
    "carnicería", "verdulería", "lacteos", "electrodomésticos",
    "mueblería", "indumentaria", "calzado", "bazar", "juguetería",
]


def detect_service_opportunities(lead: dict) -> dict:
    """
    Detect which Forma Digital services this lead might need.
    Returns a dict with per-service opportunity detection.
    """
    website = lead.get("website", "")
    has_website = bool(website and "search.google.com" not in website)
    instagram = lead.get("instagram")
    facebook = lead.get("facebook")
    photo_count = lead.get("photoCount") or 0
    rating = lead.get("averageRating")
    review_count = lead.get("reviewCount") or 0
    attributes = lead.get("attributes") or []
    categories_str = str(lead.get("categories", "")).lower()
    phone = lead.get("phones")
    email = lead.get("email")

    # --- Web ---
    web_opp = {"detected": False, "reason": None, "priority": None}
    if not has_website:
        web_opp = {"detected": True, "reason": "Sin sitio web", "priority": "alta"}
    elif has_website and not instagram and not facebook:
        web_opp = {"detected": True, "reason": "Sitio básico sin redes sociales", "priority": "media"}

    # --- Google Business ---
    gbp_opp = {"detected": False, "reason": None, "priority": None}
    gbp_reasons = []
    if photo_count == 0:
        gbp_reasons.append("Sin fotos")
    elif photo_count < 5:
        gbp_reasons.append("Pocas fotos")
    if rating and rating < 4.0 and review_count > 10:
        gbp_reasons.append(f"Rating bajo ({rating})")
    if not instagram and not facebook:
        gbp_reasons.append("Sin presencia en redes")
    if gbp_reasons:
        priority = "alta" if photo_count == 0 or (rating and rating < 3.5) else "media"
        gbp_opp = {"detected": True, "reason": ", ".join(gbp_reasons), "priority": priority}

    # --- WhatsApp con IA ---
    wa_opp = {"detected": False, "reason": None, "priority": None}
    wa_reasons = []
    attrs_lower = [str(a).lower() for a in attributes]
    is_food = any(cat in categories_str for cat in FOOD_CATEGORIES)
    has_delivery = any("domicilio" in a or "delivery" in a for a in attrs_lower)
    high_volume = review_count > 50

    if is_food:
        wa_reasons.append("Negocio de comida")
    if has_delivery:
        wa_reasons.append("Ofrece delivery")
    if high_volume and rating and rating < 4.2:
        wa_reasons.append("Alto volumen con rating mejorable")
    if high_volume and is_food:
        wa_reasons.append("Alto tráfico potencial")

    if wa_reasons:
        priority = "alta" if is_food and high_volume else "media"
        wa_opp = {"detected": True, "reason": ", ".join(wa_reasons), "priority": priority}

    # --- Odoo/ERP ---
    odoo_opp = {"detected": False, "reason": None, "priority": None}
    odoo_reasons = []
    is_retail = any(cat in categories_str for cat in RETAIL_CATEGORIES)
    has_price_level = lead.get("priceLevel") is not None
    is_multi = review_count > 200  # proxy for larger operation

    if is_retail:
        odoo_reasons.append("Negocio de retail/comercio")
    if is_multi:
        odoo_reasons.append("Alto volumen de operación")
    if has_price_level and is_retail:
        odoo_reasons.append("Niveles de precio variables")

    if odoo_reasons:
        priority = "alta" if is_retail and is_multi else "media" if is_retail else "baja"
        odoo_opp = {"detected": True, "reason": ", ".join(odoo_reasons), "priority": priority}

    return {
        "web": web_opp,
        "gbp": gbp_opp,
        "whatsapp": wa_opp,
        "odoo": odoo_opp,
    }


def calculate_lead_score(lead: dict, rules: dict = None) -> int:
    """
    Calculate an opportunity score for a lead.
    Normalized to 0-100 range.
    """
    if rules is None:
        rules = DEFAULT_SCORING_RULES

    raw_score = 0

    # --- Web rules ---
    website = lead.get("website", "")
    has_website = bool(website and "search.google.com" not in website)
    instagram = lead.get("instagram")
    facebook = lead.get("facebook")

    if not has_website:
        raw_score += rules.get("no_website", 25)
    elif has_website and not instagram and not facebook:
        raw_score += rules.get("website_obsolete", 20)

    # --- Google Business rules ---
    photo_count = lead.get("photoCount") or 0
    if photo_count == 0:
        raw_score += rules.get("no_photos", 15)
    elif photo_count < 5:
        raw_score += rules.get("few_photos", 5)

    rating = lead.get("averageRating") or 5
    review_count = lead.get("reviewCount") or 0

    if review_count > 10 and rating < 4.0:
        raw_score += rules.get("low_rating", 10)
    if review_count > 50 and rating < 4.0:
        raw_score += rules.get("high_volume_low_rating", 20)

    # --- Social media rules ---
    if not instagram:
        raw_score += rules.get("no_instagram", 15)
    if not facebook:
        raw_score += rules.get("no_facebook", 10)

    # Instagram inactivity (if data available from enrichment)
    last_post = lead.get("instagramLastPostDate")
    if last_post and instagram:
        from datetime import datetime, timezone
        try:
            if isinstance(last_post, str):
                last_post_dt = datetime.fromisoformat(last_post.replace("Z", "+00:00"))
            else:
                last_post_dt = last_post
            days_since = (datetime.now(timezone.utc) - last_post_dt).days
            if days_since > 30:
                raw_score += rules.get("inactive_instagram", 15)
        except (ValueError, TypeError):
            pass

    # --- WhatsApp / food service rules ---
    attributes = lead.get("attributes") or []
    categories_str = str(lead.get("categories", "")).lower()
    attrs_lower = [str(a).lower() for a in attributes]
    is_food = any(cat in categories_str for cat in FOOD_CATEGORIES)
    has_delivery = any("domicilio" in a or "delivery" in a for a in attrs_lower)

    if has_delivery:
        raw_score += rules.get("delivery_business", 15)
    if is_food:
        raw_score += rules.get("food_service", 10)

    # --- ERP / retail rules ---
    is_retail = any(cat in categories_str for cat in RETAIL_CATEGORIES)
    if is_retail and review_count > 100:
        raw_score += rules.get("multi_category", 10)

    # --- Contact rules ---
    if lead.get("phones"):
        raw_score += rules.get("has_phone", 5)
    if lead.get("email"):
        raw_score += rules.get("has_email", 5)

    # Normalize to 0-100 (max raw ~185)
    max_raw = sum(rules.values())
    normalized = int((raw_score / max_raw) * 100) if max_raw > 0 else 0
    return min(normalized, 100)


def score_all_leads(leads: list, rules: dict = None) -> list:
    """
    Score all leads and return sorted by score descending.
    """
    scored = []
    for lead in leads:
        lead_copy = lead.copy()
        lead_copy['score'] = calculate_lead_score(lead, rules)
        lead_copy['serviceOpportunities'] = detect_service_opportunities(lead)
        scored.append(lead_copy)

    scored.sort(key=lambda x: x['score'], reverse=True)
    return scored


DEFAULT_SCORING_RULES = {
    # Web
    "no_website": 25,
    "website_obsolete": 20,
    # Google Business
    "no_photos": 15,
    "few_photos": 5,
    "low_rating": 10,
    "high_volume_low_rating": 20,
    # Social
    "no_instagram": 15,
    "no_facebook": 10,
    "inactive_instagram": 15,
    # WhatsApp / food
    "delivery_business": 15,
    "food_service": 10,
    # ERP / retail
    "multi_category": 10,
    # Contact
    "has_phone": 5,
    "has_email": 5,
}
