import re
from typing import Dict, Any, Optional, List

def parse_price_value(val_str: str) -> Optional[float]:
    """Parse numeric price values supporting formats like 5000, 5,000, 50k, 5k, etc."""
    if not val_str:
        return None
    cleaned = val_str.lower().replace(",", "").replace("₹", "").replace("rs", "").strip()
    if cleaned.endswith("k"):
        try:
            return float(cleaned[:-1]) * 1000.0
        except ValueError:
            return None
    try:
        return float(cleaned)
    except ValueError:
        return None

def extract_intent(user_query: str) -> Dict[str, Any]:
    """
    Dynamically extract structured intent from arbitrary customer queries.
    Never hardcodes fixed product categories.
    """
    raw_query = user_query.strip()
    query_lower = raw_query.lower()
    
    # 1. Detect Greetings / Non-search queries
    greeting_patterns = [r"^(hi|hello|hey|greetings|howdy|good morning|good evening|help|who are you)\b"]
    for pattern in greeting_patterns:
        if re.match(pattern, query_lower):
            return {
                "intent_type": "GREETING",
                "search_query": None,
                "category": None,
                "max_price": None,
                "min_price": None,
                "attributes": [],
                "is_gift": False,
                "original_query": raw_query
            }

    # 2. Extract Price Constraints
    max_price = None
    min_price = None

    # Pattern: "between 1000 and 5000" / "between ₹1,000 to ₹5,000"
    between_match = re.search(r"between\s*₹?\s*([\d,]+k?)\s*(?:and|to|-)\s*₹?\s*([\d,]+k?)", query_lower)
    if between_match:
        min_price = parse_price_value(between_match.group(1))
        max_price = parse_price_value(between_match.group(2))

    # Pattern: "under 5000" / "below ₹60,000" / "less than 2k" / "within 5000"
    if max_price is None:
        under_match = re.search(r"(?:under|below|less than|within|max(?:imum)?)\s*₹?\s*([\d,]+k?)", query_lower)
        if under_match:
            max_price = parse_price_value(under_match.group(1))

    # Pattern: "around 2000" / "approx 2k" / "budget of 2000" / "budget around 2000"
    if max_price is None:
        around_match = re.search(r"(?:around|approx(?:imately)?|budget(?: of| around| is)?)\s*₹?\s*([\d,]+k?)", query_lower)
        if around_match:
            val = parse_price_value(around_match.group(1))
            if val:
                # Set a flexible window for "around"
                max_price = val * 1.15
                min_price = val * 0.5

    # Pattern: "above 50000" / "more than 30k" / "min 2000"
    if min_price is None:
        above_match = re.search(r"(?:above|more than|greater than|min(?:imum)?)\s*₹?\s*([\d,]+k?)", query_lower)
        if above_match:
            min_price = parse_price_value(above_match.group(1))

    # 3. Detect Gift Intent
    is_gift = bool(re.search(r"\b(gift|present|for my (?:mother|mom|father|dad|sister|brother|friend|wife|husband|colleague))\b", query_lower))

    # 4. Extract Key Attributes (e.g. 16GB RAM, gaming, programming, ANC, 4K, wireless)
    attributes = []
    attr_patterns = [
        r"(\d+gb\s*(?:ram|ssd|storage)?)",
        r"(gaming)",
        r"(programming|coding)",
        r"(wireless|bluetooth)",
        r"(anc|noise cancell?ing)",
        r"(4k|1080p|fhd)",
        r"(water-?resistant|anti-?theft)",
        r"(ultra-?slim|lightweight)"
    ]
    for ap in attr_patterns:
        m = re.search(ap, query_lower)
        if m:
            attributes.append(m.group(1))

    # 5. Clean Search Terms to extract Target Item/Category
    # Remove phrases about budget, intent markers, and filler
    clean_text = query_lower
    # Remove budget clauses
    clean_text = re.sub(r"(?:under|below|around|approx|between|above|budget of|less than|more than)\s*₹?\s*[\d,]+k?(?:\s*(?:and|to|-)\s*₹?\s*[\d,]+k?)?", "", clean_text)
    clean_text = re.sub(r"₹\s*[\d,]+k?", "", clean_text)
    clean_text = re.sub(r"\b\d+k\b", "", clean_text)
    
    # Remove common filler lead-ins
    filler_phrases = [
        r"^i (?:need|want|am looking for|would like to buy|m looking for)\s*(?:a|an|some)?",
        r"^(?:find|show|give|search|suggest|recommend)\s*(?:me)?\s*(?:a|an|some)?",
        r"^(?:looking for|searching for|options for)\s*(?:a|an|some)?",
        r"^(?:can you (?:find|show|suggest))\s*(?:me)?\s*(?:a|an|some)?",
        r"\b(?:please|good|best|cheap|affordable|top|suitable)\b"
    ]
    for fp in filler_phrases:
        clean_text = re.sub(fp, "", clean_text)

    # Clean up whitespace and punctuation
    clean_text = re.sub(r"[^\w\s-]", " ", clean_text)
    search_keywords = " ".join(clean_text.split()).strip()

    return {
        "intent_type": "GIFT_SEARCH" if is_gift else "PRODUCT_SEARCH",
        "search_query": search_keywords if search_keywords else None,
        "category": search_keywords if search_keywords else None,
        "max_price": max_price,
        "min_price": min_price,
        "attributes": attributes,
        "is_gift": is_gift,
        "original_query": raw_query
    }
