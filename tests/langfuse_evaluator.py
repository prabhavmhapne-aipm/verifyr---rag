"""
Langfuse RAG Evaluation Script - Master Evaluator (Phase 11 & 12)

This script runs comprehensive RAG evaluation using Langfuse Experiment Runner.
It combines Phase 11 (observability) and Phase 12 (comprehensive metrics) approaches.

Features:
- Uses modern Langfuse Experiment Runner pattern (@observe + dataset.run_experiment())
- Optional evaluator support (custom metrics: citation quality, helpfulness)
- Comprehensive metrics calculation (success rate, response time, cost, etc.)
- Robust error handling with fallback modes
- Interactive model selection or CLI arguments
- Detailed results saving to JSON

Usage:
    # With evaluators (Phase 12 - quality metrics)
    python tests/langfuse_evaluator.py --model claude-sonnet-4.5 --use-evaluators

    # Without evaluators (Phase 11 - batch testing)
    python tests/langfuse_evaluator.py --model gpt-4o-mini

    # Quick test with 10 cases
    python tests/langfuse_evaluator.py --max-tests 10

    # Simple evaluators (free, no LLM cost)
    python tests/langfuse_evaluator.py --use-evaluators --simple-evaluators
"""

import os
import sys
import time
import json
import requests
import argparse
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Add parent directory to path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Import Langfuse
from langfuse import get_client, observe, Evaluation

# Initialize Langfuse client
langfuse = get_client()

# Configuration
API_BASE_URL = "http://localhost:8000"
QUERY_ENDPOINT = f"{API_BASE_URL}/query"
RESULTS_DIR = Path(__file__).parent.parent / "data" / "evaluation_results"


# ============================================================================
# TASK FUNCTION - Calls RAG backend API (@observe decorator for auto-tracing)
# ============================================================================

@observe(as_type="generation")
def rag_task(*, item, **kwargs):
    """
    Task function that calls the RAG backend API

    This function is automatically traced by Langfuse via @observe decorator.

    Args:
        item: Langfuse dataset item with input/expected_output/metadata
        **kwargs: Additional config (model, language, etc.)

    Returns:
        dict: API response with answer, sources, retrieved_chunks, metrics
    """
    # Extract inputs
    question = item.input.get("question")
    category = item.input.get("category", "unknown")
    language = item.input.get("language", "en")
    model = kwargs.get("model", "gpt-4o-mini")

    # Call backend API
    try:
        start_time = time.time()
        response = requests.post(
            QUERY_ENDPOINT,
            json={
                "question": question,
                "model": model,
                "language": language,
                "skip_langfuse_trace": True  # Skip backend trace since @observe handles it
            },
            timeout=30
        )
        elapsed_time = time.time() - start_time

        if response.status_code == 200:
            result = response.json()

            # Return output that evaluators can use
            return {
                "answer": result.get("answer", ""),
                "sources": result.get("sources", []),
                "retrieved_chunks": result.get("retrieved_chunks", []),
                "chunks_retrieved": result.get("chunks_retrieved", 0),
                "response_time_ms": result.get("response_time_ms", int(elapsed_time * 1000)),
                "tokens_used": result.get("tokens_used", {}),
                "cost_usd": result.get("cost_usd", 0),
                "success": True,
                "error": None
            }
        else:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}: {response.text}",
                "response_time_ms": int(elapsed_time * 1000)
            }

    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "API call timed out after 30 seconds",
            "response_time_ms": 30000
        }
    except requests.exceptions.ConnectionError:
        return {
            "success": False,
            "error": "Cannot connect to backend API - is the server running?",
            "response_time_ms": 0
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"API call failed: {str(e)}",
            "response_time_ms": 0
        }


# ============================================================================
# EVALUATORS (Optional - for Phase 12 quality metrics)
# ============================================================================

def get_evaluators(use_simple: bool = False):
    """
    Get evaluator functions for quality metrics

    Args:
        use_simple: If True, use simple heuristic evaluators (free, no LLM cost)
                   If False, use LLM-as-judge evaluators (cost: ~$0.01 each)

    Returns:
        List of evaluator functions
    """
    try:
        if use_simple:
            from tests.custom_metrics import (
                simple_citation_quality_evaluator,
                simple_helpfulness_evaluator
            )
            return [
                simple_citation_quality_evaluator,
                simple_helpfulness_evaluator
            ]
        else:
            from tests.custom_metrics import (
                citation_quality_evaluator,
                helpfulness_evaluator
            )
            return [
                citation_quality_evaluator,
                helpfulness_evaluator
            ]
    except ImportError as e:
        print(f"⚠️  Could not import evaluators: {e}")
        print("   Continuing without evaluators (metrics calculation only)")
        return []


# ============================================================================
# DATASET SETUP AND EXPERIMENT RUNNER
# ============================================================================

def ensure_results_directory():
    """Create results directory if it doesn't exist."""
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def test_api_connection():
    """Test if the API is running and accessible."""
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get("indexes_loaded"):
                print("✅ API is healthy and indexes are loaded")
                return True
            else:
                print("❌ API is running but indexes are not loaded")
                return False
        else:
            print(f"❌ API health check failed with status {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to API at {API_BASE_URL}: {e}")
        print("   Make sure the FastAPI server is running:")
        print("   > cd backend")
        print("   > python main.py")
        return False


def create_or_update_dataset(dataset_name: str, test_cases: List[Dict], max_tests: int = None):
    """
    Create or update Langfuse dataset with test cases

    Args:
        dataset_name: Name of the dataset
        test_cases: List of test case dicts
        max_tests: Maximum number of tests to add (for quick testing)
    """
    print(f"\n=== Setting up dataset: {dataset_name} ===")

    # Limit test cases if max_tests specified
    if max_tests:
        test_cases = test_cases[:max_tests]
        print(f"📊 Using {max_tests} test cases (quick test mode)")
    else:
        print(f"📊 Using all {len(test_cases)} test cases")

    # Create dataset if it doesn't exist
    try:
        dataset = langfuse.get_dataset(dataset_name)
        print(f"✅ Dataset '{dataset_name}' found")
    except:
        dataset = langfuse.create_dataset(
            name=dataset_name,
            description=f"RAG evaluation - {len(test_cases)} test cases"
        )
        print(f"✅ Created new dataset '{dataset_name}'")

    # Add test cases to dataset
    print(f"📝 Adding {len(test_cases)} test cases to dataset...")
    for idx, test_case in enumerate(test_cases, 1):
        try:
            langfuse.create_dataset_item(
                dataset_name=dataset_name,
                input={
                    "question": test_case["question"],
                    "category": test_case.get("category", "unknown"),
                    "language": test_case.get("language", "en")
                },
                expected_output=test_case.get("expected_answer"),  # Ground truth (if available)
                metadata={
                    "expected_products": test_case.get("expected_products", []),
                    "tags": test_case.get("tags", [])
                }
            )
            if idx % 10 == 0:
                print(f"  Added {idx}/{len(test_cases)} test cases...")
        except Exception as e:
            # Item might already exist, skip
            pass

    print(f"✅ Dataset ready with {len(test_cases)} items")
    langfuse.flush()

    return dataset


def run_evaluation(
    dataset_name: str,
    model: str,
    evaluators: List = None,
    max_tests: int = None
):
    """
    Run evaluation using Langfuse Experiment Runner

    Args:
        dataset_name: Name of the dataset to evaluate
        model: Model to use for evaluation
        evaluators: List of evaluator functions (None = no evaluators)
        max_tests: Maximum number of tests to run (None = all)

    Returns:
        Experiment result object
    """
    print(f"\n=== Running Experiment ===")
    print(f"Model: {model}")
    print(f"Evaluators: {len(evaluators) if evaluators else 0}")
    print(f"Dataset: {dataset_name}")

    # Get dataset
    dataset = langfuse.get_dataset(dataset_name)

    # Create task function with model parameter
    def task_with_model(item):
        return rag_task(item=item, model=model)

    # Run experiment using Experiment Runner
    # This automatically handles:
    # - Trace creation and linking to dataset items
    # - Error isolation per test case
    # - Concurrent execution
    # - Evaluator execution
    result = dataset.run_experiment(
        name=f"RAG Evaluation - {model}",
        task=task_with_model,
        evaluators=evaluators or []
    )

    print(f"\n=== Experiment Results ===")
    print(result.format())

    # Flush to ensure all data is sent to Langfuse
    langfuse.flush()

    return result


# ============================================================================
# METRICS CALCULATION (From original langfuse_evaluator.py)
# ============================================================================

def extract_results_from_experiment(experiment_result, test_cases: List[Dict]) -> List[Dict[str, Any]]:
    """
    Extract individual test results from experiment result for metrics calculation

    This converts the experiment result format to the legacy format for
    compatibility with calculate_metrics() function.

    Args:
        experiment_result: Result object from dataset.run_experiment()
        test_cases: Original test cases to match category/language

    Returns:
        List of result dicts in legacy format
    """
    results = []

    # Try to access runs from experiment result
    # The Langfuse SDK stores runs in experiment_result.runs
    if not hasattr(experiment_result, 'runs') or not experiment_result.runs:
        print("⚠️  No runs found in experiment result - cannot extract for JSON saving")
        return []

    # Create question lookup for metadata
    question_to_test_case = {tc["question"]: tc for tc in test_cases}

    for run in experiment_result.runs:
        try:
            # Extract input
            input_data = run.input if hasattr(run, 'input') else {}
            question = input_data.get("question", "")

            # Get test case metadata
            test_case = question_to_test_case.get(question, {})
            category = test_case.get("category", input_data.get("category", "unknown"))
            language = test_case.get("language", input_data.get("language", "en"))

            # Extract output
            output_data = run.output if hasattr(run, 'output') else {}

            # Extract evaluations (scores)
            evaluations = {}
            if hasattr(run, 'evaluations') and run.evaluations:
                for eval_obj in run.evaluations:
                    eval_name = eval_obj.name if hasattr(eval_obj, 'name') else 'unknown'
                    eval_value = eval_obj.value if hasattr(eval_obj, 'value') else 0.0
                    eval_comment = eval_obj.comment if hasattr(eval_obj, 'comment') else ''
                    evaluations[eval_name] = {
                        "score": eval_value,
                        "comment": eval_comment
                    }

            # Build result in legacy format
            result = {
                "success": output_data.get("success", True),
                "question": question,
                "category": category,
                "language": language,
                "answer": output_data.get("answer", ""),
                "sources": output_data.get("sources", []),
                "chunks_retrieved": output_data.get("chunks_retrieved", 0),
                "response_time_ms": output_data.get("response_time_ms", 0),
                "tokens_used": output_data.get("tokens_used", {}),
                "cost_usd": output_data.get("cost_usd", 0.0),
                "error": output_data.get("error"),
                "evaluations": evaluations  # Add evaluator scores
            }

            results.append(result)

        except Exception as e:
            print(f"⚠️  Error extracting run: {e}")
            continue

    return results


def calculate_metrics(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate aggregate metrics from evaluation results.

    Args:
        results: List of evaluation results

    Returns:
        Dict with calculated metrics
    """
    if not results:
        return {
            "total_queries": 0,
            "successful": 0,
            "failed": 0,
            "success_rate": 0.0,
            "avg_response_time_ms": 0,
            "min_response_time_ms": 0,
            "max_response_time_ms": 0,
            "avg_chunks_retrieved": 0,
            "avg_sources_per_answer": 0,
            "total_tokens": 0,
            "total_cost_usd": 0,
            "by_category": {},
            "by_language": {}
        }

    successful = [r for r in results if r.get("success", False)]
    failed = [r for r in results if not r.get("success", False)]

    # Response times
    response_times = [r.get("response_time_ms", 0) for r in successful]

    # Chunks retrieved
    chunks_retrieved = [r.get("chunks_retrieved", 0) for r in successful]

    # Tokens and costs
    total_tokens = sum(
        r.get("tokens_used", {}).get("input", 0) +
        r.get("tokens_used", {}).get("output", 0)
        for r in successful
    )
    total_cost = sum(r.get("cost_usd", 0) for r in successful)

    # Sources
    sources_count = [len(r.get("sources", [])) for r in successful]

    # By category
    by_category = {}
    for category in ["factual", "comparison", "complex"]:
        cat_results = [r for r in results if r.get("category") == category]
        cat_successful = [r for r in cat_results if r.get("success")]
        by_category[category] = {
            "total": len(cat_results),
            "successful": len(cat_successful),
            "success_rate": len(cat_successful) / len(cat_results) if cat_results else 0
        }

    # By language
    by_language = {}
    for lang in ["en", "de"]:
        lang_results = [r for r in results if r.get("language") == lang]
        lang_successful = [r for r in lang_results if r.get("success")]
        by_language[lang] = {
            "total": len(lang_results),
            "successful": len(lang_successful),
            "success_rate": len(lang_successful) / len(lang_results) if lang_results else 0
        }

    # Evaluator scores (average across all results)
    evaluator_scores = {}
    for result in results:
        evaluations = result.get("evaluations", {})
        for eval_name, eval_data in evaluations.items():
            if eval_name not in evaluator_scores:
                evaluator_scores[eval_name] = []
            evaluator_scores[eval_name].append(eval_data.get("score", 0.0))

    # Calculate averages
    avg_evaluator_scores = {}
    for eval_name, scores in evaluator_scores.items():
        avg_evaluator_scores[eval_name] = sum(scores) / len(scores) if scores else 0.0

    return {
        "total_queries": len(results),
        "successful": len(successful),
        "failed": len(failed),
        "success_rate": len(successful) / len(results),
        "avg_response_time_ms": sum(response_times) / len(response_times) if response_times else 0,
        "min_response_time_ms": min(response_times) if response_times else 0,
        "max_response_time_ms": max(response_times) if response_times else 0,
        "avg_chunks_retrieved": sum(chunks_retrieved) / len(chunks_retrieved) if chunks_retrieved else 0,
        "avg_sources_per_answer": sum(sources_count) / len(sources_count) if sources_count else 0,
        "total_tokens": total_tokens,
        "total_cost_usd": total_cost,
        "by_category": by_category,
        "by_language": by_language,
        "evaluator_scores": avg_evaluator_scores  # Add evaluator averages
    }


def print_evaluation_summary(metrics: Dict[str, Any], model: str):
    """Print a formatted summary of evaluation results."""
    print(f"\n{'=' * 80}")
    print(f"EVALUATION SUMMARY - Model: {model}")
    print(f"{'=' * 80}\n")

    print(f"Overall Performance:")
    print(f"  Total Queries:       {metrics['total_queries']}")
    print(f"  Successful:          {metrics['successful']} ({metrics['success_rate']*100:.1f}%)")
    print(f"  Failed:              {metrics['failed']}")

    print(f"\nResponse Times:")
    print(f"  Average:             {metrics['avg_response_time_ms']:.0f} ms")
    print(f"  Min:                 {metrics['min_response_time_ms']:.0f} ms")
    print(f"  Max:                 {metrics['max_response_time_ms']:.0f} ms")

    print(f"\nRetrieval Metrics:")
    print(f"  Avg Chunks Retrieved: {metrics['avg_chunks_retrieved']:.1f}")
    print(f"  Avg Sources/Answer:   {metrics['avg_sources_per_answer']:.1f}")

    print(f"\nCost Metrics:")
    print(f"  Total Tokens:        {metrics['total_tokens']}")
    print(f"  Total Cost:          ${metrics['total_cost_usd']:.4f}")
    if metrics['successful'] > 0:
        print(f"  Avg Cost/Query:      ${metrics['total_cost_usd']/metrics['successful']:.4f}")

    if metrics['by_category']:
        print(f"\nBy Category:")
        for category, stats in metrics['by_category'].items():
            print(f"  {category.capitalize():12s} {stats['successful']}/{stats['total']} ({stats['success_rate']*100:.0f}%)")

    if metrics['by_language']:
        print(f"\nBy Language:")
        for lang, stats in metrics['by_language'].items():
            print(f"  {lang.upper():12s} {stats['successful']}/{stats['total']} ({stats['success_rate']*100:.0f}%)")

    # Print evaluator scores if available
    if metrics.get('evaluator_scores'):
        print(f"\nEvaluator Scores (Average):")
        for eval_name, score in metrics['evaluator_scores'].items():
            print(f"  {eval_name:30s} {score:.3f} ({score*100:.1f}%)")

    print(f"\n{'=' * 80}\n")


def save_results(results: List[Dict[str, Any]], metrics: Dict[str, Any], model: str):
    """Save evaluation results to JSON file."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"eval_{model}_{timestamp}.json"
    filepath = RESULTS_DIR / filename

    output = {
        "metadata": {
            "timestamp": datetime.now().isoformat(),
            "model": model,
            "total_queries": len(results),
            "api_base_url": API_BASE_URL
        },
        "metrics": metrics,
        "results": results
    }

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"✅ Results saved to {filepath}")
    return filepath


# ============================================================================
# MAIN FUNCTION
# ============================================================================

def main():
    """Main entry point for evaluation script."""

    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description="Run RAG evaluation using Langfuse Experiment Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Phase 12: Run with quality evaluators (LLM-as-judge)
  python tests/langfuse_evaluator.py --model claude-sonnet-4.5 --use-evaluators

  # Phase 11: Run without evaluators (batch testing only)
  python tests/langfuse_evaluator.py --model gpt-4o-mini

  # Quick test with 10 cases
  python tests/langfuse_evaluator.py --max-tests 10

  # Use simple evaluators (free, no LLM cost)
  python tests/langfuse_evaluator.py --use-evaluators --simple-evaluators
        """
    )
    parser.add_argument(
        "--model",
        type=str,
        choices=["gpt-4o-mini", "gpt-4o", "claude-sonnet-4.5", "claude-3.5-haiku"],
        default=None,
        help="LLM model to use for evaluation (default: gpt-4o-mini)"
    )
    parser.add_argument(
        "--dataset-name",
        type=str,
        default="rag_evaluation_dataset",
        help="Name of the Langfuse dataset (default: rag_evaluation_dataset)"
    )
    parser.add_argument(
        "--max-tests",
        type=int,
        default=None,
        help="Maximum number of test cases to run (default: all)"
    )
    parser.add_argument(
        "--skip-dataset-creation",
        action="store_true",
        help="Skip dataset creation/update (use existing dataset)"
    )
    parser.add_argument(
        "--use-evaluators",
        action="store_true",
        help="Use quality evaluators (Phase 12 - citation quality, helpfulness)"
    )
    parser.add_argument(
        "--simple-evaluators",
        action="store_true",
        help="Use simple heuristic evaluators instead of LLM-as-judge (free, no cost)"
    )

    args = parser.parse_args()

    print("\n" + "="*80)
    print("LANGFUSE RAG EVALUATION - MASTER EVALUATOR")
    print("="*80)

    # Verify Langfuse connection
    print("\n=== Initializing Langfuse Client ===")
    if langfuse.auth_check():
        print("✅ Langfuse client authenticated and ready!")
        print(f"   Host: {os.getenv('LANGFUSE_HOST', 'http://localhost:3000')}")
    else:
        print("❌ Authentication failed. Check your LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY in .env")
        sys.exit(1)

    # Ensure results directory exists
    ensure_results_directory()

    # Test API connection
    print("\n=== Testing API Connection ===")
    if not test_api_connection():
        print("\n❌ Cannot proceed without API connection. Exiting.")
        sys.exit(1)

    # Model selection: use CLI arg if provided, otherwise ask interactively
    if args.model:
        model = args.model
        print(f"\n=== Model Selection ===")
        print(f"Using model from command line: {model}")
    else:
        print("\n=== Model Selection ===")
        print("Available models:")
        print("  1. gpt-4o-mini (default, cheapest)")
        print("  2. gpt-4o (higher quality)")
        print("  3. claude-sonnet-4.5 (best quality)")
        print("  4. claude-3.5-haiku (fast)")

        try:
            model_choice = input("\nSelect model (1-4) or press Enter for default [1]: ").strip()
        except EOFError:
            # Non-interactive mode, use default
            print("Non-interactive mode detected, using default model: gpt-4o-mini")
            model_choice = ""

        model_map = {
            "1": "gpt-4o-mini",
            "2": "gpt-4o",
            "3": "claude-sonnet-4.5",
            "4": "claude-3.5-haiku",
            "": "gpt-4o-mini"
        }
        model = model_map.get(model_choice, "gpt-4o-mini")

    # Load test cases
    print("\n=== Loading test cases ===")
    try:
        # Try Phase 12 test cases first (50 cases)
        from tests.test_cases_phase12 import TEST_CASES
        print(f"✅ Loaded {len(TEST_CASES)} test cases from test_cases_phase12.py")
    except ImportError:
        try:
            # Fall back to Phase 11 test cases (15 cases)
            from tests.test_cases import TEST_CASES
            print(f"✅ Loaded {len(TEST_CASES)} test cases from test_cases.py")
        except ImportError as e:
            print(f"❌ Error loading test cases: {e}")
            print("Make sure either test_cases_phase12.py or test_cases.py exists")
            sys.exit(1)

    # Create/update dataset (unless skipped)
    if not args.skip_dataset_creation:
        dataset = create_or_update_dataset(
            dataset_name=args.dataset_name,
            test_cases=TEST_CASES,
            max_tests=args.max_tests
        )

    # Setup evaluators (optional - Phase 12)
    evaluators = None
    if args.use_evaluators:
        print("\n=== Setting up evaluators ===")
        evaluators = get_evaluators(use_simple=args.simple_evaluators)

        if evaluators:
            if args.simple_evaluators:
                print(f"✅ Using {len(evaluators)} simple evaluators (heuristic-based, free)")
                print("   - simple_citation_quality")
                print("   - simple_helpfulness")
            else:
                print(f"✅ Using {len(evaluators)} LLM-as-judge evaluators")
                print("   - citation_quality (GPT-4o)")
                print("   - helpfulness (GPT-4o)")
                est_cost = 0.02 * (args.max_tests or len(TEST_CASES))
                print(f"\n💰 Estimated cost: ~${est_cost:.2f} (2 evals × {args.max_tests or len(TEST_CASES)} cases × $0.01)")
        else:
            print("⚠️  No evaluators loaded - continuing without quality metrics")
            args.use_evaluators = False
    else:
        print("\n=== Evaluators: Disabled ===")
        print("Running without evaluators (Phase 11 mode - metrics only)")
        print("To enable: Add --use-evaluators flag")

    # Run evaluation
    print(f"\n{'='*80}")
    print("STARTING EVALUATION")
    print(f"{'='*80}")
    result = run_evaluation(
        dataset_name=args.dataset_name,
        model=model,
        evaluators=evaluators,
        max_tests=args.max_tests
    )

    # Extract results from experiment and save to JSON
    print("\n=== Extracting Results for Local Saving ===")
    results_list = extract_results_from_experiment(result, TEST_CASES)

    if results_list:
        print(f"✅ Extracted {len(results_list)} results from experiment")

        # Calculate aggregate metrics
        metrics = calculate_metrics(results_list)

        # Print summary to console
        print_evaluation_summary(metrics, model)

        # Save to JSON file
        filepath = save_results(results_list, metrics, model)
        print(f"💾 Results saved to: {filepath}")
    else:
        print("⚠️  Could not extract results - skipping local JSON save")
        print("   Results are still available in Langfuse dashboard")

    # Final instructions
    print("\n" + "="*80)
    print("EVALUATION COMPLETE!")
    print("="*80)
    print(f"\n📊 View detailed results in Langfuse dashboard:")
    print(f"   👉 http://localhost:3000/datasets/{args.dataset_name}")
    print(f"\n💡 Next steps:")
    print(f"   - Review evaluator scores in Langfuse UI")
    print(f"   - Compare different models by re-running with --model flag")
    print(f"   - Tune retrieval/generation based on low-scoring test cases")
    if not args.use_evaluators:
        print(f"\n   - Add --use-evaluators to see quality metrics (citation quality, helpfulness)")
    print()


if __name__ == "__main__":
    main()
