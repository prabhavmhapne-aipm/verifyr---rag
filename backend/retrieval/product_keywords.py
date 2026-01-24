"""
Product Keyword Mapping Configuration

Maps product identifiers (used in chunk metadata) to search keywords.
When a user mentions keywords, the system detects which product(s) they're asking about.

To add a new product:
1. Add the product identifier (must match product_name in chunks)
2. Add relevant keywords that users might use to refer to this product
3. Keywords should be lowercase and include common variations
"""

PRODUCT_KEYWORD_MAPPING = {
    "apple_watch_series11_2025": [
        "apple watch",
        "apple",
        "series 11",
        "apple watch series 11",
        "apple watch 11"
    ],
    "garmin_forerunner_970_2025": [
        "garmin",
        "forerunner",
        "970",
        "garmin forerunner",
        "garmin forerunner 970",
        "forerunner 970"
    ]
    # Add new products here:
    # "samsung_galaxy_watch7_2025": [
    #     "samsung",
    #     "galaxy watch",
    #     "watch 7",
    #     "galaxy watch 7",
    #     "samsung galaxy"
    # ]
}


def get_product_keywords(product_id: str) -> list:
    """
    Get keywords for a specific product.
    
    Args:
        product_id: Product identifier (e.g., "apple_watch_series11_2025")
    
    Returns:
        List of keywords, or empty list if product not found
    """
    return PRODUCT_KEYWORD_MAPPING.get(product_id, [])


def detect_products_in_query(query: str, available_products: list) -> list:
    """
    Detect which products are mentioned in a query.
    
    Args:
        query: User query string
        available_products: List of product identifiers available in the system
    
    Returns:
        List of product identifiers mentioned in the query
    """
    query_lower = query.lower()
    detected_products = []
    
    for product_id in available_products:
        keywords = get_product_keywords(product_id)
        if any(keyword in query_lower for keyword in keywords):
            detected_products.append(product_id)
    
    return detected_products

