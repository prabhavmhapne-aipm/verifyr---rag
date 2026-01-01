"""
Langfuse Evaluation Script for RAG System

This script runs batch evaluation of the RAG system using Langfuse for observability.
It sends all test cases from test_cases.py to the /query endpoint and tracks metrics.
Creates a Langfuse Dataset for organizing test cases in the Langfuse dashboard.
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

# Load environment variables from .env file
load_dotenv()

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Add parent directory to path for test_cases import
sys.path.append(str(Path(__file__).parent))

from test_cases import TEST_CASES, get_test_cases_by_category, print_test_summary

# Try to import Langfuse (optional - script works without it)
try:
    from langfuse import Langfuse
    LANGFUSE_AVAILABLE = True
except ImportError:
    LANGFUSE_AVAILABLE = False
    Langfuse = None  # Set to None for type hints
    print("⚠️  Langfuse package not installed. Dataset creation will be skipped.")

# Configuration
API_BASE_URL = "http://localhost:8000"
QUERY_ENDPOINT = f"{API_BASE_URL}/query"
RESULTS_DIR = Path(__file__).parent.parent / "data" / "evaluation_results"


def ensure_results_directory():
    """Create results directory if it doesn't exist."""
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"✅ Results directory ready at {RESULTS_DIR}")


def initialize_langfuse_client() -> Optional["Langfuse"]:
    """
    Initialize Langfuse client if API keys are available.
    
    Returns:
        Langfuse client instance or None if not available
    """
    if not LANGFUSE_AVAILABLE:
        return None
    
    try:
        langfuse_host = os.getenv("LANGFUSE_HOST", "http://localhost:3000")
        langfuse_public_key = os.getenv("LANGFUSE_PUBLIC_KEY")
        langfuse_secret_key = os.getenv("LANGFUSE_SECRET_KEY")
        
        if langfuse_public_key and langfuse_secret_key:
            client = Langfuse(
                host=langfuse_host,
                public_key=langfuse_public_key,
                secret_key=langfuse_secret_key
            )
            return client
        else:
            return None
    except Exception as e:
        print(f"⚠️  Could not initialize Langfuse client: {e}")
        return None


def create_langfuse_dataset(langfuse_client: "Langfuse", model: str) -> Optional[str]:
    """
    Create a Langfuse dataset with test cases.
    
    Args:
        langfuse_client: Initialized Langfuse client
        model: Model name for dataset naming
        
    Returns:
        Dataset name if successful, None otherwise
    """
    if not langfuse_client:
        return None
    
    try:
        # Create dataset name with timestamp and model
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dataset_name = f"rag_evaluation_{model}_{timestamp}"
        
        # Create dataset
        dataset = langfuse_client.create_dataset(
            name=dataset_name,
            description=f"RAG evaluation test cases - Model: {model}, {len(TEST_CASES)} test cases"
        )
        
        print(f"\n📊 Creating Langfuse dataset: {dataset_name}")
        
        # Add test cases as dataset items
        for i, test_case in enumerate(TEST_CASES, 1):
            langfuse_client.create_dataset_item(
                dataset_name=dataset_name,
                input={
                    "question": test_case["question"],
                    "category": test_case["category"],
                    "language": test_case["language"]
                },
                expected_output=None,  # No expected outputs defined yet
                metadata={
                    "category": test_case["category"],
                    "language": test_case["language"],
                    "expected_products": test_case.get("expected_products", []),
                    "tags": test_case.get("tags", []),
                    "test_case_index": i
                }
            )
        
        print(f"   ✅ Created dataset with {len(TEST_CASES)} test cases")
        return dataset_name
        
    except Exception as e:
        print(f"   ⚠️  Failed to create Langfuse dataset: {e}")
        return None


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


def run_single_query(
    question: str,
    category: str,
    language: str,
    model: str = "gpt-4o-mini",
    skip_backend_trace: bool = False
) -> Dict[str, Any]:
    """
    Run a single query through the RAG endpoint.
    
    NOTE: This function is called within item.run() context in experiments,
    so it should NOT receive dataset parameters (handled by the context).

    Args:
        question: The question to ask
        category: Test category (factual, comparison, complex)
        language: Language code (en, de)
        model: LLM model to use
        skip_backend_trace: If True, backend will skip trace creation (trace created by item.run())

    Returns:
        Dict with query results and metadata
    """
    try:
        payload = {
            "question": question,
            "model": model,
            "language": language,
            "skip_langfuse_trace": skip_backend_trace
        }

        start_time = time.time()
        response = requests.post(QUERY_ENDPOINT, json=payload, timeout=30)
        elapsed_time = time.time() - start_time

        if response.status_code == 200:
            result = response.json()
            return {
                "success": True,
                "question": question,
                "category": category,
                "language": language,
                "model": model,
                "answer": result.get("answer", ""),
                "sources": result.get("sources", []),
                "chunks_retrieved": result.get("chunks_retrieved", 0),
                "response_time_ms": result.get("response_time_ms", int(elapsed_time * 1000)),
                "tokens_used": result.get("tokens_used", {}),
                "cost_usd": result.get("cost_usd", 0),
                "error": None
            }
        else:
            return {
                "success": False,
                "question": question,
                "category": category,
                "language": language,
                "model": model,
                "error": f"HTTP {response.status_code}: {response.text}",
                "response_time_ms": int(elapsed_time * 1000)
            }

    except Exception as e:
        return {
            "success": False,
            "question": question,
            "category": category,
            "language": language,
            "model": model,
            "error": str(e),
            "response_time_ms": 0
        }


def run_experiment(
    langfuse_client: "Langfuse",
    dataset_name: str,
    model: str,
    delay_between_queries: float = 1.0
) -> List[Dict[str, Any]]:
    """
    Run evaluation using Langfuse dataset experiment API.
    This uses item.run() to automatically create traces and link them to dataset items.
    
    Args:
        langfuse_client: Initialized Langfuse client
        dataset_name: Name of the Langfuse dataset
        model: LLM model to use for all queries
        delay_between_queries: Delay in seconds between queries
        
    Returns:
        List of evaluation results
    """
    results = []
    
    try:
        # Get the dataset
        dataset = langfuse_client.get_dataset(dataset_name)
        
        # Create run name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        run_name = f"evaluation_run_{model}_{timestamp}"
        
        print(f"\n{'=' * 80}")
        print(f"RUNNING DATASET EXPERIMENT - {len(TEST_CASES)} TEST CASES")
        print(f"{'=' * 80}")
        print(f"Dataset: {dataset_name}")
        print(f"Run Name: {run_name}")
        print(f"Model: {model}")
        print(f"Delay between queries: {delay_between_queries}s\n")
        
        # Get dataset items - use dataset.items property
        items_list = list(dataset.items) if hasattr(dataset, 'items') else []
        total_items = len(items_list)
        
        if total_items == 0:
            print("⚠️  No items found in dataset")
            return results
        
        print(f"Found {total_items} items in dataset\n")
        
        # Create a mapping of question to test case for metadata
        question_to_test_case = {tc["question"]: tc for tc in TEST_CASES}
        
        # Iterate through dataset items and run experiment
        for i, item in enumerate(items_list, 1):
            # Extract question from dataset item input
            item_input = item.input if hasattr(item, 'input') else item.get('input', {}) if isinstance(item, dict) else {}
            question = item_input.get("question", "")
            
            # Find matching test case
            test_case = question_to_test_case.get(question)
            if not test_case:
                print(f"⚠️  Item {i}/{total_items}: Could not find test case for question")
                continue
            
            category = test_case["category"]
            language = test_case["language"]
            
            print(f"[{i}/{total_items}] Processing: {question[:60]}...")
            
            # Use item.run() context manager as per Langfuse docs:
            # https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk
            # Note: This requires SDK version that supports item.run() (may need newer version)
            try:
                # Check if item.run() method exists (available in newer SDK versions)
                if not hasattr(item, 'run'):
                    print(f"   ⚠️  item.run() method not available in SDK version 2.60.10")
                    print(f"   ⚠️  This feature may require a newer SDK version")
                    print(f"   ⚠️  Falling back to regular execution (traces created but not linked to dataset)")
                    # Fall back to regular execution
                    result = run_single_query(
                        question=question,
                        category=category,
                        language=language,
                        model=model
                    )
                    results.append(result)
                    if result.get("success"):
                        print(f"   ✅ Success ({result.get('response_time_ms', 0)}ms)")
                    else:
                        print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")
                    continue
                
                # Use item.run() as shown in Langfuse documentation
                with item.run(
                    run_name=run_name,
                    run_description=f"Evaluation run for {model}",
                    run_metadata={"model": model, "timestamp": timestamp}
                ) as root_span:
                    # Execute the query within the experiment context
                    # Skip backend trace creation since item.run() creates the trace
                    result = run_single_query(
                        question=question,
                        category=category,
                        language=language,
                        model=model,
                        skip_backend_trace=True  # Backend will skip trace creation
                    )
                    
                    # Add result to list
                    results.append(result)
                    
                    # Update the root span with output if successful
                    # Using update_trace() as shown in documentation examples
                    if root_span and result.get("success"):
                        root_span.update_trace(
                            input={"question": question, "category": category, "language": language, "model": model},
                            output={
                                "answer": result.get("answer", ""),
                                "sources": result.get("sources", []),
                                "chunks_retrieved": result.get("chunks_retrieved", 0),
                                "response_time_ms": result.get("response_time_ms", 0)
                            },
                            metadata={
                                "category": category,
                                "language": language,
                                "model": model,
                                "chunks_retrieved": result.get("chunks_retrieved", 0),
                                "tokens_used": result.get("tokens_used", {}),
                                "cost_usd": result.get("cost_usd", 0),
                                "response_time_ms": result.get("response_time_ms", 0)
                            }
                        )
                    elif root_span and not result.get("success"):
                        # Update trace with error
                        root_span.update_trace(
                            input={"question": question, "category": category, "language": language, "model": model},
                            output={"error": result.get("error", "Unknown error")},
                            metadata={
                                "category": category,
                                "language": language,
                                "model": model
                            }
                        )
                
                if result.get("success"):
                    print(f"   ✅ Success ({result.get('response_time_ms', 0)}ms)")
                else:
                    print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")
                    
            except AttributeError as attr_error:
                # item.run() doesn't exist in this SDK version
                print(f"   ⚠️  item.run() not available: {attr_error}")
                print(f"   ⚠️  Falling back to regular execution")
                result = run_single_query(
                    question=question,
                    category=category,
                    language=language,
                    model=model
                )
                results.append(result)
                if result.get("success"):
                    print(f"   ✅ Success ({result.get('response_time_ms', 0)}ms)")
                else:
                    print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")
            except Exception as e:
                print(f"   ❌ Error in experiment context: {e}")
                import traceback
                traceback.print_exc()
                results.append({
                    "success": False,
                    "question": question,
                    "category": category,
                    "language": language,
                    "model": model,
                    "error": f"Experiment error: {str(e)}",
                    "response_time_ms": 0
                })
            
            # Delay between queries (except for last one)
            if i < total_items:
                time.sleep(delay_between_queries)
        
        # Flush to ensure all traces are sent
        langfuse_client.flush()
        print(f"\n✅ Experiment completed. {len(results)} results collected.")
        
    except Exception as e:
        print(f"\n❌ Error running experiment: {e}")
        import traceback
        traceback.print_exc()
    
    return results


def run_batch_evaluation(
    model: str = "gpt-4o-mini",
    delay_between_queries: float = 1.0,
    langfuse_client: Optional["Langfuse"] = None,
    dataset_name: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Run batch evaluation - uses experiment API if Langfuse is available, 
    otherwise falls back to simple batch execution.
    
    Args:
        model: LLM model to use for all queries
        delay_between_queries: Delay in seconds between queries
        langfuse_client: Optional Langfuse client (for experiment mode)
        dataset_name: Optional dataset name (for experiment mode)
        
    Returns:
        List of evaluation results
    """
    # If we have Langfuse client and dataset, use experiment API
    if langfuse_client and dataset_name:
        return run_experiment(langfuse_client, dataset_name, model, delay_between_queries)
    
    # Otherwise, fall back to simple batch execution (no Langfuse)
    results = []
    total_tests = len(TEST_CASES)

    print(f"\n{'=' * 80}")
    print(f"RUNNING BATCH EVALUATION - {total_tests} TEST CASES (NO LANGFUSE)")
    print(f"{'=' * 80}")
    print(f"Model: {model}")
    print(f"Delay between queries: {delay_between_queries}s\n")

    for i, test_case in enumerate(TEST_CASES, 1):
        question = test_case["question"]
        category = test_case["category"]
        language = test_case["language"]
        
        print(f"[{i}/{total_tests}] {question[:60]}...")
        result = run_single_query(question, category, language, model)
        results.append(result)
        
        if result.get("success"):
            print(f"   ✅ Success ({result.get('response_time_ms', 0)}ms)")
        else:
            print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")
        
        if i < total_tests:
            time.sleep(delay_between_queries)
    
    return results


def calculate_metrics(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate aggregate metrics from evaluation results.

    Args:
        results: List of evaluation results

    Returns:
        Dict with calculated metrics
    """
    successful = [r for r in results if r.get("success", False)]
    failed = [r for r in results if not r.get("success", False)]

    # Response times
    response_times = [r.get("response_time_ms", 0) for r in successful]

    # Chunks retrieved
    chunks_retrieved = [r.get("chunks_retrieved", 0) for r in successful]

    # Tokens and costs
    total_tokens = sum(r.get("tokens_used", {}).get("input", 0) + r.get("tokens_used", {}).get("output", 0) for r in successful)
    total_cost = sum(r.get("cost_usd", 0) for r in successful)

    # Sources
    sources_count = [len(r.get("sources", [])) for r in successful]

    # By category
    by_category = {}
    for category in ["factual", "comparison", "complex"]:
        cat_results = [r for r in results if r["category"] == category]
        cat_successful = [r for r in cat_results if r["success"]]
        by_category[category] = {
            "total": len(cat_results),
            "successful": len(cat_successful),
            "success_rate": len(cat_successful) / len(cat_results) if cat_results else 0
        }

    # By language
    by_language = {}
    for lang in ["en", "de"]:
        lang_results = [r for r in results if r["language"] == lang]
        lang_successful = [r for r in lang_results if r["success"]]
        by_language[lang] = {
            "total": len(lang_results),
            "successful": len(lang_successful),
            "success_rate": len(lang_successful) / len(lang_results) if lang_results else 0
        }

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
        "by_language": by_language
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
    print(f"  Avg Cost/Query:      ${metrics['total_cost_usd']/metrics['successful']:.4f}" if metrics['successful'] > 0 else "  Avg Cost/Query:      N/A")

    print(f"\nBy Category:")
    for category, stats in metrics['by_category'].items():
        print(f"  {category.capitalize():12s} {stats['successful']}/{stats['total']} ({stats['success_rate']*100:.0f}%)")

    print(f"\nBy Language:")
    for lang, stats in metrics['by_language'].items():
        print(f"  {lang.upper():12s} {stats['successful']}/{stats['total']} ({stats['success_rate']*100:.0f}%)")

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


def main():
    """Main entry point for batch evaluation."""
    print("\n" + "=" * 80)
    print("LANGFUSE RAG EVALUATION SCRIPT")
    print("=" * 80)

    # Show test summary
    print_test_summary()

    # Check environment variables and initialize Langfuse client
    print("\nChecking Langfuse configuration:")
    langfuse_client = initialize_langfuse_client()
    if langfuse_client:
        print("  ✅ Langfuse client initialized")
        print(f"  ✅ Langfuse Host: {os.getenv('LANGFUSE_HOST', 'http://localhost:3000')}")
    else:
        print("  ⚠️  Langfuse client not available")
        print("     - Dataset creation will be skipped")
        print("     - Traces will not be collected unless keys are set in backend")
        print("     - To enable: Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY in .env")
        if not LANGFUSE_AVAILABLE:
            print("     - Install langfuse package: pip install langfuse")

    # Ensure results directory exists
    ensure_results_directory()

    # Test API connection
    print("\nTesting API connection...")
    if not test_api_connection():
        print("\n❌ Cannot proceed without API connection. Exiting.")
        sys.exit(1)

    # Parse command-line arguments
    parser = argparse.ArgumentParser(description="Run RAG system evaluation with Langfuse")
    parser.add_argument(
        "--model",
        type=str,
        choices=["gpt-4o-mini", "gpt-4o", "claude-sonnet-4.5", "claude-3.5-haiku"],
        default=None,
        help="LLM model to use for evaluation (default: gpt-4o-mini)"
    )
    args = parser.parse_args()

    # Model selection: use CLI arg if provided, otherwise ask interactively
    if args.model:
        model = args.model
        print(f"\nUsing model from command line: {model}")
    else:
        print("\nAvailable models:")
        print("  1. gpt-4o-mini (default, cheapest)")
        print("  2. gpt-4o (higher quality)")
        print("  3. claude-sonnet-4.5 (best quality)")
        print("  4. claude-3.5-haiku (fast)")

        try:
            model_choice = input("\nSelect model (1-4) or press Enter for default [1]: ").strip()
        except EOFError:
            # Non-interactive mode, use default
            print("\nNon-interactive mode detected, using default model: gpt-4o-mini")
            model_choice = ""
        
        model_map = {
            "1": "gpt-4o-mini",
            "2": "gpt-4o",
            "3": "claude-sonnet-4.5",
            "4": "claude-3.5-haiku",
            "": "gpt-4o-mini"
        }
        model = model_map.get(model_choice, "gpt-4o-mini")

    # Create Langfuse dataset (if client available)
    dataset_name = None
    if langfuse_client:
        dataset_name = create_langfuse_dataset(langfuse_client, model)

    # Run evaluation (uses experiment API if Langfuse available)
    print(f"\nStarting batch evaluation with model: {model}")
    results = run_batch_evaluation(
        model=model,
        delay_between_queries=1.0,
        langfuse_client=langfuse_client,
        dataset_name=dataset_name
    )
    
    # NOTE: Trace linking is handled automatically by item.run() in experiment API

    # Calculate metrics
    print("\nCalculating metrics...")
    metrics = calculate_metrics(results)

    # Print summary
    print_evaluation_summary(metrics, model)

    # Save results
    filepath = save_results(results, metrics, model)

    # Final instructions
    print("\n" + "=" * 80)
    print("NEXT STEPS")
    print("=" * 80)
    print("\n1. View detailed traces in Langfuse dashboard:")
    print("   http://localhost:3000")
    if dataset_name:
        print(f"\n2. View evaluation dataset and runs in Langfuse:")
        print(f"   http://localhost:3000/datasets/{dataset_name}")
        print("   - Go to Datasets section")
        print("   - Click on your dataset to view test cases and runs")
        print("   - Each run will show linked traces for all test cases")
    print("\n3. Review evaluation results:")
    print(f"   {filepath}")
    print("\n4. Compare different models:")
    print("   Run this script again with a different model")
    print("\n5. Iterate and improve:")
    print("   - Adjust chunk size")
    print("   - Tune hybrid search parameters")
    print("   - Improve prompts")
    print("   - Test different embedding models")
    print("\n" + "=" * 80 + "\n")


if __name__ == "__main__":
    main()
