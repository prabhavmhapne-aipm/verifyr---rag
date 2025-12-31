"""
Test script to verify source metadata flows through the entire pipeline.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.append(str(project_root))

from backend.retrieval.hybrid_search import HybridSearcher
from backend.generation.llm_client import RAGGenerator
import json

print("\n" + "="*60)
print("Testing Source Metadata Flow")
print("="*60)

# Initialize components
print("\n1. Initializing Hybrid Search...")
searcher = HybridSearcher()

# Test search
print("\n2. Performing hybrid search...")
query = "Wie ist die Akkulaufzeit der Apple Watch?"
results = searcher.search_hybrid(query, top_k=3)

print(f"\n3. Search returned {len(results)} results")

# Check first result
if results:
    first_result = results[0]
    print("\nFirst result details:")
    print(f"  Product: {first_result['chunk']['product_name']}")
    print(f"  Doc Type: {first_result['chunk']['doc_type']}")
    print(f"  Page: {first_result['chunk']['page_num']}")
    print(f"  Source File: {first_result['chunk'].get('source_file', 'MISSING')}")
    print(f"  Source URL: {first_result['chunk'].get('source_url', 'MISSING')}")
    print(f"  Source Name: {first_result['chunk'].get('source_name', 'MISSING')}")
    print(f"  Text Preview: {first_result['chunk']['text'][:100]}...")

# Test LLM generation
print("\n4. Testing RAG Generator...")
generator = RAGGenerator(model="gpt-4o-mini")

# Extract chunks for generation
chunks = [r["chunk"] for r in results]

# Generate answer
print("\n5. Generating answer...")
result = generator.generate(query, chunks)

print(f"\n6. Answer generated ({len(result['answer'])} chars)")
print(f"\n7. Sources extracted: {len(result['sources'])}")

if result['sources']:
    for i, source in enumerate(result['sources'][:3], 1):
        print(f"\nSource #{i}:")
        print(f"  Product: {source['product']}")
        print(f"  Doc Type: {source['doc_type']}")
        print(f"  Page: {source['page']}")
        print(f"  File: {source['file']}")
        print(f"  URL: {source.get('source_url', 'MISSING')}")
        print(f"  Name: {source.get('source_name', 'MISSING')}")

print("\n" + "="*60)
if result['sources'] and result['sources'][0].get('source_url'):
    print("✅ SUCCESS: Source URLs are flowing through the pipeline!")
else:
    print("❌ FAILURE: Source URLs are NULL in the pipeline")
print("="*60 + "\n")
