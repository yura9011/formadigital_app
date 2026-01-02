"""
Lead Scoring Module
Assigns opportunity scores to leads based on configurable rules.
Higher score = better prospect for outreach.
"""

def calculate_lead_score(lead: dict, rules: dict = None) -> int:
    """
    Calculate an opportunity score for a lead.
    
    Args:
        lead: Business data dictionary
        rules: Optional custom scoring rules
        
    Returns:
        int: Score from 0-100
    """
    if rules is None:
        rules = DEFAULT_SCORING_RULES
    
    score = 0
    
    # Rule 1: No website = marketing opportunity
    website = lead.get("website", "")
    if not website or "search.google.com" in website:
        score += rules.get("no_website", 25)
    
    # Rule 2: Low rating with traffic = struggling business
    rating = lead.get("averageRating") or 5
    review_count = lead.get("reviewCount") or 0
    
    if review_count > 30 and rating < 4.0:
        score += rules.get("low_rating_high_traffic", 20)
    elif review_count > 100 and rating < 4.5:
        score += rules.get("moderate_rating_very_high_traffic", 15)
    
    # Rule 3: No photos = neglected listing
    photo_count = lead.get("photoCount") or 0
    if photo_count == 0:
        score += rules.get("no_photos", 15)
    elif photo_count < 5:
        score += rules.get("few_photos", 5)
    
    # Rule 4: High rating, many reviews = successful, may want expansion
    if rating >= 4.5 and review_count > 100:
        score += rules.get("high_success", 10)
    
    # Rule 5: Has phone = contactable
    if lead.get("phones"):
        score += rules.get("has_phone", 5)
    
    # Rule 6: Currently open = active business
    if lead.get("isOpenNow") is True:
        score += rules.get("is_open_now", 5)
    
    # Cap at 100
    return min(score, 100)


def score_all_leads(leads: list, rules: dict = None) -> list:
    """
    Score all leads and return sorted by score descending.
    
    Args:
        leads: List of business dictionaries
        rules: Optional custom scoring rules
        
    Returns:
        list: Leads with added 'score' field, sorted by score
    """
    scored = []
    for lead in leads:
        lead_copy = lead.copy()
        lead_copy['score'] = calculate_lead_score(lead, rules)
        scored.append(lead_copy)
    
    # Sort by score descending
    scored.sort(key=lambda x: x['score'], reverse=True)
    return scored


# Default scoring rules (configurable)
DEFAULT_SCORING_RULES = {
    "no_website": 25,
    "low_rating_high_traffic": 20,
    "moderate_rating_very_high_traffic": 15,
    "no_photos": 15,
    "few_photos": 5,
    "high_success": 10,
    "has_phone": 5,
    "is_open_now": 5,
}
