"""
Phase 12 - Custom Metrics (Step 4/5)

Two LLM-as-a-judge evaluators for generation quality:
1. Citation Quality - Are sources correctly cited and formatted?
2. Helpfulness - Is the answer clear, actionable, and helpful?

These evaluators use GPT-4o as the judge to provide nuanced quality assessment.
They are designed to work with Langfuse Experiment Runner.

Usage:
    from tests.custom_metrics import (
        citation_quality_evaluator,
        helpfulness_evaluator
    )

    # Add to evaluator_complete.py:
    evaluators = [
        citation_quality_evaluator,
        helpfulness_evaluator,
    ]
"""

import os
from langfuse import Evaluation
from openai import OpenAI
from typing import Dict, Any

# Initialize OpenAI client for LLM-as-judge
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def citation_quality_evaluator(*, output, **kwargs):
    """
    Citation Quality evaluator using LLM-as-a-judge

    Evaluates whether sources are correctly cited and well-formatted in the answer.

    Criteria:
    - Are citations present?
    - Are they well-placed (after relevant claims)?
    - Do they use correct format [Product, Document Type, Page X]?
    - Do citation numbers/references match available sources?

    Args:
        output: Task output with answer and sources
        **kwargs: Additional arguments (judge_model override, item from Langfuse)

    Returns:
        Evaluation: Score 0.0-1.0 with reasoning
    """
    answer = output.get("answer", "")
    sources = output.get("sources", [])
    judge_model = kwargs.get("judge_model", "gpt-4o")

    # Handle empty answer
    if not answer:
        return Evaluation(
            name="citation_quality",
            value=0.0,
            comment="Empty answer - cannot evaluate citations"
        )

    # Prepare source list for judge
    source_list = "\n".join([
        f"- {s.get('product', 'Unknown')}, {s.get('doc_type', 'unknown')}, Page {s.get('page', '?')}"
        for s in sources
    ])

    # LLM-as-judge prompt
    judge_prompt = f"""You are evaluating the citation quality in a RAG system answer.

**Available Sources:**
{source_list if source_list else "None"}

**Answer:**
{answer}

**Evaluation Criteria:**
1. Are citations present in the answer? (Look for [Product, Document Type, Page X] format)
2. Are citations placed after relevant claims?
3. Is the citation format correct and consistent?
4. Do the cited sources match the available sources?

**Scoring Rubric:**
- 1.0 (Excellent): Citations present, well-placed, correct format, match sources
- 0.8 (Good): Citations present and mostly correct, minor formatting issues
- 0.6 (Fair): Some citations present but inconsistent or poorly placed
- 0.4 (Poor): Few citations, major formatting issues
- 0.2 (Very Poor): Citations barely present or all incorrect
- 0.0 (None): No citations at all

**Response Format:**
Provide ONLY a JSON object with:
{{"score": <float 0.0-1.0>, "reasoning": "<brief explanation>"}}
"""

    try:
        # Call judge LLM
        response = client.chat.completions.create(
            model=judge_model,
            messages=[
                {"role": "system", "content": "You are an expert evaluator for RAG systems. Respond only with valid JSON."},
                {"role": "user", "content": judge_prompt}
            ],
            temperature=0.0,
            response_format={"type": "json_object"}
        )

        # Parse response
        import json
        result = json.loads(response.choices[0].message.content)
        score = float(result.get("score", 0.0))
        reasoning = result.get("reasoning", "No reasoning provided")

        # Clamp score to [0.0, 1.0]
        score = max(0.0, min(1.0, score))

        return Evaluation(
            name="citation_quality",
            value=score,
            comment=f"Judge: {reasoning}"
        )

    except Exception as e:
        # If judge fails, return neutral score with error
        return Evaluation(
            name="citation_quality",
            value=0.5,
            comment=f"Judge evaluation failed: {str(e)}"
        )


def helpfulness_evaluator(*, output, **kwargs):
    """
    Helpfulness evaluator using LLM-as-a-judge

    Evaluates whether the answer is clear, actionable, and helpful for the user.

    Criteria:
    - Is the answer easy to understand?
    - Is it actionable (can user act on it)?
    - Is the length appropriate for the question complexity?
    - Does it directly address the question?

    Args:
        output: Task output with answer
        **kwargs: Additional arguments (judge_model override, item from Langfuse)

    Returns:
        Evaluation: Score 0.0-1.0 with reasoning
    """
    # Get item from kwargs (Langfuse passes it here)
    item = kwargs.get('item')

    # Extract question from item if available
    question = item.input.get("question", "") if item else ""
    answer = output.get("answer", "")
    judge_model = kwargs.get("judge_model", "gpt-4o")

    # Handle empty answer
    if not answer:
        return Evaluation(
            name="helpfulness",
            value=0.0,
            comment="Empty answer - not helpful"
        )

    # LLM-as-judge prompt
    judge_prompt = f"""You are evaluating the helpfulness of an answer in a product comparison RAG system.

**Question:**
{question}

**Answer:**
{answer}

**Evaluation Criteria:**
1. **Clarity**: Is the answer easy to understand? Clear language?
2. **Actionability**: Can the user make a decision or take action based on this answer?
3. **Completeness**: Does it fully address the question without being overly verbose?
4. **Relevance**: Does it directly answer what was asked?
5. **Length Appropriateness**: Is the length appropriate for the question complexity?
   - Simple facts: 1-3 sentences
   - Comparisons: 4-6 sentences with key differences
   - Complex/troubleshooting: Detailed, step-by-step

**Scoring Rubric:**
- 1.0 (Excellent): Clear, actionable, complete, relevant, appropriate length
- 0.8 (Good): Mostly helpful, minor issues with clarity or completeness
- 0.6 (Fair): Somewhat helpful but lacks clarity or actionability
- 0.4 (Poor): Vague or only partially addresses the question
- 0.2 (Very Poor): Confusing or mostly irrelevant
- 0.0 (Useless): Completely unhelpful or off-topic

**Response Format:**
Provide ONLY a JSON object with:
{{"score": <float 0.0-1.0>, "reasoning": "<brief explanation>"}}
"""

    try:
        # Call judge LLM
        response = client.chat.completions.create(
            model=judge_model,
            messages=[
                {"role": "system", "content": "You are an expert evaluator for RAG systems. Respond only with valid JSON."},
                {"role": "user", "content": judge_prompt}
            ],
            temperature=0.0,
            response_format={"type": "json_object"}
        )

        # Parse response
        import json
        result = json.loads(response.choices[0].message.content)
        score = float(result.get("score", 0.0))
        reasoning = result.get("reasoning", "No reasoning provided")

        # Clamp score to [0.0, 1.0]
        score = max(0.0, min(1.0, score))

        return Evaluation(
            name="helpfulness",
            value=score,
            comment=f"Judge: {reasoning}"
        )

    except Exception as e:
        # If judge fails, return neutral score with error
        return Evaluation(
            name="helpfulness",
            value=0.5,
            comment=f"Judge evaluation failed: {str(e)}"
        )


# ============================================================================
# SIMPLE FALLBACK EVALUATORS (no LLM calls, for quick testing)
# ============================================================================

def simple_citation_quality_evaluator(*, output, **kwargs):
    """
    Simple citation quality check without LLM

    Checks:
    - Are there brackets [ ] in the answer (indicating citations)?
    - Are there sources in the output?

    Use this for quick testing without LLM costs.
    """
    answer = output.get("answer", "")
    sources = output.get("sources", [])

    has_brackets = "[" in answer and "]" in answer
    has_sources = len(sources) > 0

    if has_brackets and has_sources:
        score = 1.0
        comment = "Citations present (brackets found) and sources available"
    elif has_brackets:
        score = 0.7
        comment = "Citation markers found but no sources"
    elif has_sources:
        score = 0.5
        comment = "Sources available but no citation markers in answer"
    else:
        score = 0.0
        comment = "No citations or sources"

    return Evaluation(
        name="citation_quality_simple",
        value=score,
        comment=comment
    )


def simple_helpfulness_evaluator(*, output, **kwargs):
    """
    Simple helpfulness check without LLM

    Heuristics:
    - Answer length > 50 chars = likely helpful
    - Contains expected product names = likely relevant
    - Not too long (< 500 chars for simple queries)

    Use this for quick testing without LLM costs.
    """
    # Get item from kwargs (Langfuse passes it here)
    item = kwargs.get('item')

    question = item.input.get("question", "") if item else ""
    answer = output.get("answer", "")
    expected_products = item.metadata.get("expected_products", []) if item else []

    # Check length
    length = len(answer)
    if length < 10:
        score = 0.0
        comment = "Answer too short to be helpful"
    elif length < 50:
        score = 0.4
        comment = "Answer very brief, may lack detail"
    elif length > 1000:
        score = 0.7
        comment = "Answer quite long, may be verbose"
    else:
        score = 0.8
        comment = "Answer length seems appropriate"

    # Check for product names
    if expected_products:
        products_mentioned = sum(1 for p in expected_products if p.lower() in answer.lower())
        if products_mentioned == len(expected_products):
            score = min(1.0, score + 0.2)
            comment += f" | All {len(expected_products)} expected products mentioned"
        elif products_mentioned > 0:
            comment += f" | {products_mentioned}/{len(expected_products)} expected products mentioned"

    return Evaluation(
        name="helpfulness_simple",
        value=score,
        comment=comment
    )


# ============================================================================
# TEST THE EVALUATORS (if run directly)
# ============================================================================

if __name__ == "__main__":
    print("=== Testing Custom Metric Evaluators ===\n")
    print("Note: These evaluators use GPT-4o as judge (costs ~$0.01 per evaluation)")
    print("Set OPENAI_API_KEY environment variable to test.\n")

    # Mock item and output for testing
    class MockItem:
        def __init__(self, question, expected_products=None):
            self.input = {"question": question}
            self.metadata = {"expected_products": expected_products or []}

    # Test Case 1: Good answer with citations
    print("Test 1: Good answer with citations")
    item1 = MockItem("What is the battery life?", ["Apple Watch Series 11"])
    output1 = {
        "answer": "The Apple Watch Series 11 has 18 hours of battery life [Apple Watch Series 11, Manual, Page 5].",
        "sources": [{"product": "Apple Watch Series 11", "doc_type": "manual", "page": 5}]
    }

    # Test with simple evaluators (no LLM cost)
    citation1 = simple_citation_quality_evaluator(item=item1, output=output1)
    helpfulness1 = simple_helpfulness_evaluator(item=item1, output=output1)

    print(f"  Citation Quality (simple): {citation1.value:.2f} - {citation1.comment}")
    print(f"  Helpfulness (simple): {helpfulness1.value:.2f} - {helpfulness1.comment}")

    # Uncomment to test with LLM judge (requires OPENAI_API_KEY)
    # citation1_llm = citation_quality_evaluator(item=item1, output=output1)
    # helpfulness1_llm = helpfulness_evaluator(item=item1, output=output1)
    # print(f"  Citation Quality (LLM): {citation1_llm.value:.2f} - {citation1_llm.comment}")
    # print(f"  Helpfulness (LLM): {helpfulness1_llm.value:.2f} - {helpfulness1_llm.comment}")

    # Test Case 2: Poor answer without citations
    print("\nTest 2: Poor answer without citations")
    item2 = MockItem("Which watch is better?")
    output2 = {
        "answer": "It depends.",
        "sources": []
    }

    citation2 = simple_citation_quality_evaluator(item=item2, output=output2)
    helpfulness2 = simple_helpfulness_evaluator(item=item2, output=output2)

    print(f"  Citation Quality (simple): {citation2.value:.2f} - {citation2.comment}")
    print(f"  Helpfulness (simple): {helpfulness2.value:.2f} - {helpfulness2.comment}")

    print("\n✅ Custom metric evaluators created successfully!")
    print("\nNext: Import these evaluators into evaluator_complete.py")
    print("\nTo use LLM-based evaluators:")
    print("  - Ensure OPENAI_API_KEY is set in .env")
    print("  - Use citation_quality_evaluator and helpfulness_evaluator")
    print("  - Cost: ~$0.01 per evaluation (GPT-4o)")
    print("\nTo use simple evaluators (free, no LLM):")
    print("  - Use simple_citation_quality_evaluator and simple_helpfulness_evaluator")
    print("  - Good for quick testing before running full LLM-based evaluation")
