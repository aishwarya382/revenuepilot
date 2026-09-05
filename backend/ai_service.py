from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from services.intent_extractor import extract_intent
from services.agent_tools import (
    search_products,
    get_product,
    compare_products,
    check_stock,
    get_related_products
)
from audit_service import log_event

def process_customer_query(db: Session, user_message: str, customer_id: str = "cust_demo_01") -> Dict[str, Any]:
    """
    Real Tool-Using AI Shopping Agent:
    1. Extracts intent dynamically without hardcoded categories.
    2. Executes SQLAlchemy database-grounded search tools.
    3. Strictly enforces catalog truth - never fabricates products.
    4. Formulates grounded reasoning and returns verified product cards.
    """
    intent = extract_intent(user_message)
    intent_type = intent["intent_type"]
    search_query = intent["search_query"]
    max_price = intent["max_price"]
    min_price = intent["min_price"]
    is_gift = intent["is_gift"]

    # 1. Handle Greetings / General Assistance
    if intent_type == "GREETING":
        return {
            "intent": "AI Shopping Greeting",
            "ai_message": "Hello! I am your Revenue Pilot AI Shopping Assistant. Tell me what product or budget you are looking for (e.g., 'Cake under ₹2,000' or 'Gaming headphones under ₹5,000') and I'll find verified in-stock options for you!",
            "primary_product": None,
            "compared_products": [],
            "bundle": None,
            "bounded_ai_card": None,
            "follow_up": "What would you like to search for today?"
        }

    # 2. Execute Database Search Tool
    matched_products = []
    if is_gift:
        # For gift recommendations, search catalog items matching the price window
        matched_products = search_products(
            db=db,
            query=search_query if (search_query and search_query != "gift") else None,
            max_price=max_price,
            min_price=min_price,
            stock_required=True,
            limit=6
        )
    else:
        # Specific product query
        matched_products = search_products(
            db=db,
            query=search_query,
            max_price=max_price,
            min_price=min_price,
            stock_required=True,
            limit=6
        )

    # 3. Log Audit Trail Step
    log_event(
        db=db,
        actor_type="AI_AGENT",
        actor_id=customer_id,
        action="Catalog Tool Search",
        reason=f"AI Agent searched database for intent: '{search_query or user_message}' (Budget: Max ₹{max_price or 'Any'})",
        metadata={
            "query": user_message,
            "extracted_intent": intent,
            "results_found_count": len(matched_products),
            "matched_ids": [p.id for p in matched_products]
        },
        status="COMPLETED"
    )

    # 4. Handle Case: NO PRODUCTS FOUND IN DATABASE
    if not matched_products:
        budget_text = f" under ₹{int(max_price):,}" if max_price else ""
        item_text = f"'{search_query}'" if search_query else f"'{user_message}'"
        
        return {
            "intent": f"Search for {item_text}",
            "ai_message": f"I couldn't find an exact match in this store for {item_text}{budget_text}. All our results are strictly grounded in live inventory.",
            "primary_product": None,
            "compared_products": [],
            "bundle": None,
            "bounded_ai_card": None,
            "follow_up": "Would you like me to broaden the budget or search for another product?"
        }

    # 5. Format Verified Database Results
    primary = matched_products[0]
    
    # Check if there are other matching items to compare
    compared = []
    for prod in matched_products:
        compared.append({
            "id": prod.id,
            "name": prod.name,
            "category": prod.category,
            "price": prod.price,
            "original_price": prod.price,
            "description": prod.description,
            "stock": prod.stock,
            "image_url": prod.image_url,
            "badge": "Top Match" if prod.id == primary.id else None
        })

    # Assemble concise AI explanation
    budget_clause = f" under ₹{int(max_price):,}" if max_price else ""
    if len(matched_products) == 1:
        ai_msg = f"I found 1 verified product in our inventory matching {search_query or 'your search'}{budget_clause}: **{primary.name}** at ₹{int(primary.price):,} ({primary.stock} in stock)."
    else:
        ai_msg = f"I found {len(matched_products)} verified products in our inventory matching {search_query or 'your search'}{budget_clause}. Here are the top options grounded in our catalog:"

    return {
        "intent": f"Search: {search_query or user_message}",
        "ai_message": ai_msg,
        "primary_product": {
            "id": primary.id,
            "name": primary.name,
            "category": primary.category,
            "price": primary.price,
            "original_price": primary.price,
            "description": primary.description,
            "stock": primary.stock,
            "image_url": primary.image_url
        },
        "compared_products": compared,
        "bundle": None,
        "bounded_ai_card": {
            "reason": f"Inventory match for {primary.category}: '{primary.name}'",
            "upsell": "",
            "expected_benefit": f"Grounded database match. Price ₹{int(primary.price):,}, {primary.stock} units in stock.",
            "action": f"Add {primary.name} to Cart",
            "permission": "Customer approval required before charging",
            "price": primary.price
        },
        "follow_up": "Would you like to add this to your cart or compare specifications?"
    }
