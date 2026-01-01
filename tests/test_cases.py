"""
Test cases for RAG system evaluation.

Contains 15 test questions across three categories:
- Factual (5): Simple fact-based questions
- Comparison (5): Product comparison questions
- Complex (5): Multi-step reasoning or post-purchase support questions
"""

TEST_CASES = [
    # ========== Factual Questions (5) ==========
    {
        "question": "What is the battery life of the Apple Watch Series 11?",
        "category": "factual",
        "language": "en",
        "expected_products": ["Apple Watch Series 11"],
        "tags": ["battery", "specifications"]
    },
    {
        "question": "Wie lange hält der Akku der Garmin Forerunner 970?",
        "category": "factual",
        "language": "de",
        "expected_products": ["Garmin Forerunner 970"],
        "tags": ["battery", "specifications"]
    },
    {
        "question": "What waterproof rating does the Apple Watch Series 11 have?",
        "category": "factual",
        "language": "en",
        "expected_products": ["Apple Watch Series 11"],
        "tags": ["waterproof", "specifications"]
    },
    {
        "question": "Welches Gewicht hat die Garmin Forerunner 970?",
        "category": "factual",
        "language": "de",
        "expected_products": ["Garmin Forerunner 970"],
        "tags": ["weight", "specifications"]
    },
    {
        "question": "What materials is the Apple Watch Series 11 made from?",
        "category": "factual",
        "language": "en",
        "expected_products": ["Apple Watch Series 11"],
        "tags": ["materials", "build"]
    },

    # ========== Comparison Questions (5) ==========
    {
        "question": "Which watch has better battery life, Apple Watch Series 11 or Garmin Forerunner 970?",
        "category": "comparison",
        "language": "en",
        "expected_products": ["Apple Watch Series 11", "Garmin Forerunner 970"],
        "tags": ["battery", "comparison"]
    },
    {
        "question": "Welche Uhr ist leichter?",
        "category": "comparison",
        "language": "de",
        "expected_products": ["Apple Watch Series 11", "Garmin Forerunner 970"],
        "tags": ["weight", "comparison"]
    },
    {
        "question": "Compare the waterproof ratings of both watches",
        "category": "comparison",
        "language": "en",
        "expected_products": ["Apple Watch Series 11", "Garmin Forerunner 970"],
        "tags": ["waterproof", "comparison"]
    },
    {
        "question": "Welche ist haltbarer für Trailrunning?",
        "category": "comparison",
        "language": "de",
        "expected_products": ["Apple Watch Series 11", "Garmin Forerunner 970"],
        "tags": ["durability", "trail-running", "comparison"]
    },
    {
        "question": "Which offers better value for money, Apple Watch or Garmin?",
        "category": "comparison",
        "language": "en",
        "expected_products": ["Apple Watch Series 11", "Garmin Forerunner 970"],
        "tags": ["value", "price", "comparison"]
    },

    # ========== Complex Questions (5) ==========
    {
        "question": "Which product is better for marathon training and why?",
        "category": "complex",
        "language": "en",
        "expected_products": ["Apple Watch Series 11", "Garmin Forerunner 970"],
        "tags": ["marathon", "training", "recommendation", "reasoning"]
    },
    {
        "question": "How do I set up GPS tracking on my Garmin Forerunner 970?",
        "category": "complex",
        "language": "en",
        "expected_products": ["Garmin Forerunner 970"],
        "tags": ["setup", "gps", "post-purchase", "how-to"]
    },
    {
        "question": "Was bedeutet IP67 Wasserschutz für meine Nutzung beim Schwimmen?",
        "category": "complex",
        "language": "de",
        "expected_products": ["Apple Watch Series 11", "Garmin Forerunner 970"],
        "tags": ["waterproof", "technical-translation", "swimming", "explanation"]
    },
    {
        "question": "I'm having trouble syncing my Apple Watch Series 11. How do I troubleshoot this?",
        "category": "complex",
        "language": "en",
        "expected_products": ["Apple Watch Series 11"],
        "tags": ["troubleshooting", "sync", "post-purchase", "how-to"]
    },
    {
        "question": "How do the products compare for outdoor use? What does GPS accuracy mean for trail running?",
        "category": "complex",
        "language": "en",
        "expected_products": ["Apple Watch Series 11", "Garmin Forerunner 970"],
        "tags": ["outdoor", "gps", "technical-translation", "trail-running", "comparison"]
    }
]


def get_test_cases_by_category(category: str) -> list:
    """
    Get test cases filtered by category.

    Args:
        category: One of 'factual', 'comparison', 'complex'

    Returns:
        List of test cases matching the category
    """
    return [tc for tc in TEST_CASES if tc["category"] == category]


def get_test_cases_by_language(language: str) -> list:
    """
    Get test cases filtered by language.

    Args:
        language: 'en' or 'de'

    Returns:
        List of test cases matching the language
    """
    return [tc for tc in TEST_CASES if tc["language"] == language]


def print_test_summary():
    """Print summary of test cases."""
    print("\n" + "=" * 60)
    print("TEST CASES SUMMARY")
    print("=" * 60)

    # Count by category
    factual = len(get_test_cases_by_category("factual"))
    comparison = len(get_test_cases_by_category("comparison"))
    complex_q = len(get_test_cases_by_category("complex"))

    # Count by language
    english = len(get_test_cases_by_language("en"))
    german = len(get_test_cases_by_language("de"))

    print(f"\nTotal test cases: {len(TEST_CASES)}")
    print(f"\nBy Category:")
    print(f"  Factual:    {factual}")
    print(f"  Comparison: {comparison}")
    print(f"  Complex:    {complex_q}")
    print(f"\nBy Language:")
    print(f"  English:    {english}")
    print(f"  German:     {german}")
    print("\n" + "=" * 60 + "\n")


if __name__ == "__main__":
    print_test_summary()

    print("\nSample test cases:\n")
    for i, tc in enumerate(TEST_CASES[:3], 1):
        print(f"{i}. [{tc['category']}] [{tc['language']}] {tc['question']}")
