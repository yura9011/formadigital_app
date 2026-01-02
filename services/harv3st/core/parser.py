
def get_nested(arr, *indices):
    """Helper to safely get nested lists"""
    curr = arr
    for idx in indices:
        if isinstance(curr, list) and len(curr) > idx and curr[idx] is not None:
            curr = curr[idx]
        else:
            return None
    return curr

def parse_hours(hours_array):
    """
    Parse the hours array into a readable format.
    Google returns: [["miércoles", 3, [2025,12,31], [["8 a. m.–10 p. m.", [[8],[22]]]], 0, 1], ...]
    """
    if not hours_array or not isinstance(hours_array, list):
        return None
    
    result = []
    for day in hours_array:
        if isinstance(day, list) and len(day) >= 4:
            day_name = day[0] if isinstance(day[0], str) else None
            hours_info = day[3] if len(day) > 3 else None
            
            if day_name and hours_info:
                if isinstance(hours_info, list) and len(hours_info) > 0:
                    # Extract readable time string
                    time_str = hours_info[0][0] if isinstance(hours_info[0], list) else "Cerrado"
                else:
                    time_str = "Cerrado"
                result.append({"day": day_name, "hours": time_str})
    
    return result if result else None

def parse_attributes(attrs_array):
    """
    Parse service attributes into a clean list.
    Google returns nested arrays with attribute names like "Entrega a domicilio", "Retiro en tienda".
    """
    if not attrs_array or not isinstance(attrs_array, list):
        return None
    
    attributes = []
    try:
        for category in attrs_array:
            if isinstance(category, list) and len(category) >= 3:
                category_name = category[1] if len(category) > 1 else None
                items = category[2] if len(category) > 2 else []
                
                if isinstance(items, list):
                    for item in items:
                        if isinstance(item, list) and len(item) > 1:
                            attr_name = item[1] if isinstance(item[1], str) else None
                            # Check if it's a positive attribute (not negated)
                            is_positive = item[3] != 1 if len(item) > 3 else True
                            if attr_name and is_positive:
                                attributes.append(attr_name)
    except:
        pass
    
    return list(set(attributes)) if attributes else None  # Dedupe

def extract_business_data(item):
    """
    Maps obscure Google Maps array indices to readable business fields.
    Source: Reverse engineered December 2025.
    
    Args:
        item (list): The raw list representing a business from the network response.
        
    Returns:
        dict: Clean dictionary with business info, or None if invalid.
    """
    try:
        # === BASIC FIELDS ===
        name = get_nested(item, 11)
        if not name: return None

        # Address: item[2] is ["Street", "City"] list, or item[39] combined
        addr_list = get_nested(item, 2)
        full_address = ", ".join(addr_list) if isinstance(addr_list, list) else get_nested(item, 39)

        # Phone: Found at [178, 0, 0] or [178, 0, 1]
        phone = get_nested(item, 178, 0, 0) or get_nested(item, 178, 0, 1)

        # Website: Found at [7, 0] or [4, 3, 0]
        website = get_nested(item, 7, 0)
        if not website:
            website = get_nested(item, 4, 3, 0) 

        # Lat/Lng: Found at [9, 2] and [9, 3] usually
        lat = get_nested(item, 9, 2)
        lng = get_nested(item, 9, 3)
        
        # Categories: item[13]
        categories = get_nested(item, 13)

        # === NEW ENRICHMENT FIELDS ===
        
        # Reviews URL: Direct link to Google reviews page
        reviews_url = get_nested(item, 4, 3, 0)
        
        # Photo Count: Number of photos posted
        photo_count = get_nested(item, 37, 1)
        
        # Price Level: 1-4 ($-$$$$)
        price_level = get_nested(item, 4, 2)
        
        # Hours: Full schedule array
        hours_raw = get_nested(item, 203, 0)
        hours = parse_hours(hours_raw)
        
        # Open Now Status: Check current open state
        open_status_raw = get_nested(item, 203, 1, 4, 0)
        is_open_now = "Abierto" in str(open_status_raw) if open_status_raw else None
        
        # Service Attributes: Delivery, pickup, accessibility, etc.
        attrs_raw = get_nested(item, 100, 0)
        attributes = parse_attributes(attrs_raw)

        # === BUILD DATA OBJECT ===
        data = {
            "placeId": get_nested(item, 78) or get_nested(item, 0),
            "name": name,
            "averageRating": get_nested(item, 4, 7),
            "reviewCount": get_nested(item, 4, 8),
            "phones": phone,
            "website": website,
            "latitude": lat,
            "longitude": lng,
            "categories": categories,
            "fullAddress": full_address,
            # New fields
            "reviewsUrl": reviews_url,
            "photoCount": photo_count,
            "priceLevel": price_level,
            "hours": hours,
            "isOpenNow": is_open_now,
            "attributes": attributes,
        }

        # Cleanup list fields to strings
        if data['categories']:
             try:
                data['categories'] = ", ".join(data['categories'])
             except:
                pass

        return data

    except Exception as e:
        # Silent error or log if configured
        return None
