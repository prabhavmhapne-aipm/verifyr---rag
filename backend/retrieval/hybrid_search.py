"""
Hybrid Search Pipeline - Phase 5

Combines BM25 keyword search and vector semantic search using Reciprocal Rank Fusion (RRF).
Provides the best of both worlds: exact matching and semantic understanding.
"""

import sys
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from indexing.bm25_index import BM25Index
from indexing.vector_store import VectorStore

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')


class HybridSearcher:
    """Combines BM25 and vector search using Reciprocal Rank Fusion."""

    def __init__(
        self,
        bm25_index_path: str = "data/processed/bm25_index.pkl",
        qdrant_path: str = "data/qdrant_storage",
        collection_name: str = "product_docs",
        embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2",
        rrf_k: int = 60
    ):
        """
        Initialize hybrid searcher.

        Args:
            bm25_index_path: Path to BM25 index pickle file
            qdrant_path: Path to Qdrant storage
            collection_name: Qdrant collection name
            embedding_model: Sentence-transformers model name
            rrf_k: RRF constant (default: 60)
        """
        self.rrf_k = rrf_k

        # Initialize BM25
        print("📥 Loading BM25 index...")
        self.bm25_index = BM25Index(index_path=bm25_index_path)
        self.bm25_index.load()

        # Initialize Vector Store
        print("📥 Loading vector store...")
        self.vector_store = VectorStore(
            qdrant_path=qdrant_path,
            collection_name=collection_name,
            embedding_model=embedding_model
        )
        # Pre-load model and client
        self.vector_store._load_embedding_model()
        self.vector_store._initialize_qdrant()

        print("✅ Hybrid searcher ready!\n")

    def _calculate_rrf_score(self, rank: int) -> float:
        """
        Calculate RRF score for a given rank.

        RRF formula: score = 1 / (k + rank)
        where rank starts at 1 for the top result.

        Args:
            rank: Result rank (1-indexed)

        Returns:
            RRF score
        """
        return 1.0 / (self.rrf_k + rank)

    def _analyze_query(self, query: str) -> Dict[str, Any]:
        """
        Analyze query to determine:
        - Which product(s) are mentioned
        - If it's a comparison query
        - Query complexity
        
        Returns:
            Dict with 'target_products', 'is_comparison', 'complexity', 'top_k'
        """
        query_lower = query.lower()
        
        # Product keywords
        apple_keywords = ['apple watch', 'apple', 'series 11']
        garmin_keywords = ['garmin', 'forerunner', '970']
        
        # Detect products mentioned
        mentions_apple = any(kw in query_lower for kw in apple_keywords)
        mentions_garmin = any(kw in query_lower for kw in garmin_keywords)
        
        target_products = []
        if mentions_apple:
            target_products.append("Apple Watch Series 11")
        if mentions_garmin:
            target_products.append("Garmin Forerunner 970")
        
        # Comparison indicators
        comparison_terms = [
            'compare', 'comparison', 'versus', 'vs', 'vs.', 'v ', 
            'difference', 'differences', 'better', 'which', 'between',
            'sowohl', 'sowie', 'beide', 'unterschied', 'unterschiede',
            'vergleich', 'besser', 'welche', 'zwischen'
        ]
        is_comparison = (
            len(target_products) >= 2 or  # Both products mentioned
            any(term in query_lower for term in comparison_terms)
        )
        
        # Complexity indicators
        complexity_indicators = [
            'how', 'why', 'what are', 'explain', 'detailed',
            'step', 'guide', 'tutorial', 'setup', 'configure',
            'wie', 'warum', 'was sind', 'erklären', 'detailliert',
            'schritt', 'anleitung', 'einrichten', 'konfigurieren'
        ]
        
        # Simple: fact-based, single answer
        # Complex: multi-part, how-to, detailed explanation
        is_complex = (
            any(term in query_lower for term in complexity_indicators) or
            query.count('?') > 1 or  # Multiple questions
            len(query.split()) > 15  # Long query
        )
        
        # Determine top_k based on complexity and query type
        if is_complex:
            top_k = 8  # More chunks for complex queries
        elif is_comparison:
            top_k = 5  # Balanced for comparisons
        else:
            top_k = 5  # Default for simple queries
        
        return {
            "target_products": target_products,
            "is_comparison": is_comparison,
            "complexity": "complex" if is_complex else "simple",
            "top_k": top_k
        }

    def search_bm25(self, query: str, top_k: int = 20) -> List[Dict[str, Any]]:
        """
        Search using BM25 only.

        Args:
            query: Search query
            top_k: Number of results to return

        Returns:
            List of results with BM25 scores
        """
        results = self.bm25_index.search(query, top_k=top_k)

        formatted_results = []
        for rank, (chunk, score) in enumerate(results, 1):
            formatted_results.append({
                "chunk": chunk,
                "bm25_score": score,
                "bm25_rank": rank,
                "vector_score": None,
                "vector_rank": None
            })

        return formatted_results

    def search_vector(self, query: str, top_k: int = 20) -> List[Dict[str, Any]]:
        """
        Search using vector similarity only.

        Args:
            query: Search query
            top_k: Number of results to return

        Returns:
            List of results with vector scores
        """
        results = self.vector_store.search(query, top_k=top_k)

        formatted_results = []
        for rank, result in enumerate(results, 1):
            formatted_results.append({
                "chunk": {
                    "chunk_id": result["chunk_id"],
                    "product_name": result["product_name"],
                    "doc_type": result["doc_type"],
                    "page_num": result["page_num"],
                    "source_file": result.get("source_file"),
                    "source_url": result.get("source_url"),
                    "source_name": result.get("source_name"),
                    "text": result["text"]
                },
                "vector_score": result["score"],
                "vector_rank": rank,
                "bm25_score": None,
                "bm25_rank": None
            })

        return formatted_results

    def search_hybrid(
        self, 
        query: str, 
        top_k: int = 5, 
        retrieve_k: int = 20,
        target_products: Optional[List[str]] = None,
        apply_diversity: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Search using hybrid approach with Reciprocal Rank Fusion.

        Args:
            query: Search query
            top_k: Number of final results to return
            retrieve_k: Number of results to retrieve from each method before fusion
            target_products: Optional list of product names to filter by. 
                           If None, returns chunks from all products.
                           If specified, only returns chunks from these products.
            apply_diversity: Whether to apply product diversity balancing.
                           Only applies if target_products is None or has multiple products.

        Returns:
            List of results with RRF scores
        """
        # Get results from both methods
        bm25_results = self.search_bm25(query, top_k=retrieve_k)
        vector_results = self.search_vector(query, top_k=retrieve_k)

        # Build RRF scores by chunk_id
        rrf_scores = defaultdict(lambda: {
            "rrf_score": 0.0,
            "bm25_rank": None,
            "vector_rank": None,
            "bm25_score": None,
            "vector_score": None,
            "chunk": None
        })

        # Add BM25 contributions
        for result in bm25_results:
            chunk_id = result["chunk"]["chunk_id"]
            product_name = result["chunk"]["product_name"]
            
            # Filter by target products if specified
            if target_products and product_name not in target_products:
                continue
                
            rrf_scores[chunk_id]["rrf_score"] += self._calculate_rrf_score(result["bm25_rank"])
            rrf_scores[chunk_id]["bm25_rank"] = result["bm25_rank"]
            rrf_scores[chunk_id]["bm25_score"] = result["bm25_score"]
            rrf_scores[chunk_id]["chunk"] = result["chunk"]

        # Add Vector contributions
        for result in vector_results:
            chunk_id = result["chunk"]["chunk_id"]
            product_name = result["chunk"]["product_name"]
            
            # Filter by target products if specified
            if target_products and product_name not in target_products:
                continue
                
            rrf_scores[chunk_id]["rrf_score"] += self._calculate_rrf_score(result["vector_rank"])
            rrf_scores[chunk_id]["vector_rank"] = result["vector_rank"]
            rrf_scores[chunk_id]["vector_score"] = result["vector_score"]
            if rrf_scores[chunk_id]["chunk"] is None:
                rrf_scores[chunk_id]["chunk"] = result["chunk"]

        # Sort by RRF score
        sorted_results = sorted(
            rrf_scores.items(),
            key=lambda x: x[1]["rrf_score"],
            reverse=True
        )

        # Apply product diversity only if:
        # 1. Diversity is enabled
        # 2. Multiple products are in play (no filter or multiple products in filter)
        should_apply_diversity = (
            apply_diversity and 
            (target_products is None or len(target_products) > 1)
        )
        
        if should_apply_diversity:
            final_results = self._ensure_product_diversity(sorted_results, top_k)
        else:
            # Just take top_k without diversity
            final_results = [
                {
                    "chunk_id": chunk_id,
                    "chunk": scores["chunk"],
                    "rrf_score": scores["rrf_score"],
                    "bm25_rank": scores["bm25_rank"],
                    "vector_rank": scores["vector_rank"],
                    "bm25_score": scores["bm25_score"],
                    "vector_score": scores["vector_score"]
                }
                for chunk_id, scores in sorted_results[:top_k]
            ]

        return final_results

    def _ensure_product_diversity(
        self,
        sorted_results: List[tuple],
        top_k: int
    ) -> List[Dict[str, Any]]:
        """
        Ensure balanced product representation in final results.
        For comparison queries: ensures roughly 50/50 split (e.g., 3-2 or 2-3 for top_k=5).
        For complex queries: ensures at least 2 chunks per product when multiple products present.

        Args:
            sorted_results: Results sorted by RRF score
            top_k: Number of results to return

        Returns:
            Diverse list of results with balanced product representation
        """
        final_results = []
        product_counts = defaultdict(int)

        # First pass: Add top results while tracking product distribution
        for chunk_id, scores in sorted_results:
            if len(final_results) >= top_k:
                break

            product_name = scores["chunk"]["product_name"]
            final_results.append({
                "chunk_id": chunk_id,
                "chunk": scores["chunk"],
                "rrf_score": scores["rrf_score"],
                "bm25_rank": scores["bm25_rank"],
                "vector_rank": scores["vector_rank"],
                "bm25_score": scores["bm25_score"],
                "vector_score": scores["vector_score"]
            })
            product_counts[product_name] += 1

        # Get all unique products in sorted results
        all_products = set(scores["chunk"]["product_name"] for _, scores in sorted_results)
        
        # Determine minimum chunks per product based on top_k
        # For top_k=5: max(1, 5//2) = 2 (ensures 3-2 or 2-3 split)
        # For top_k=8: max(1, 8//2) = 3 (ensures 4-4 or 5-3 split)
        # For top_k=3: max(1, 3//2) = 1 (ensures 2-1 or 1-2 split)
        min_chunks_per_product = max(1, top_k // 2)
        
        # Second pass: Ensure balanced representation
        for chunk_id, scores in sorted_results:
            product_name = scores["chunk"]["product_name"]
            
            # Skip if this chunk is already in final_results
            if any(r["chunk_id"] == chunk_id for r in final_results):
                continue

            # If this product needs more representation
            if product_counts[product_name] < min_chunks_per_product:
                # Find the lowest scoring chunk from an over-represented product
                min_score_idx = None
                min_score = float('inf')
                
                for idx, result in enumerate(final_results):
                    other_product = result["chunk"]["product_name"]
                    # Replace if other product has more than minimum AND more than this product
                    if (other_product != product_name and 
                        product_counts[other_product] > min_chunks_per_product and
                        product_counts[other_product] > product_counts[product_name]):
                        if result["rrf_score"] < min_score:
                            min_score = result["rrf_score"]
                            min_score_idx = idx

                # Replace if found
                if min_score_idx is not None:
                    old_product = final_results[min_score_idx]["chunk"]["product_name"]
                    final_results[min_score_idx] = {
                        "chunk_id": chunk_id,
                        "chunk": scores["chunk"],
                        "rrf_score": scores["rrf_score"],
                        "bm25_rank": scores["bm25_rank"],
                        "vector_rank": scores["vector_rank"],
                        "bm25_score": scores["bm25_score"],
                        "vector_score": scores["vector_score"]
                    }
                    product_counts[old_product] -= 1
                    product_counts[product_name] += 1
                    
                    # Break if we've achieved balance for all products
                    all_balanced = all(
                        product_counts.get(prod, 0) >= min_chunks_per_product 
                        for prod in all_products
                    )
                    if all_balanced:
                        break

        return final_results

    def compare_search_methods(
        self,
        query: str,
        top_k: int = 5
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Compare all three search methods side-by-side.

        Args:
            query: Search query
            top_k: Number of results to return from each method

        Returns:
            Dictionary with results from each method
        """
        return {
            "bm25": self.search_bm25(query, top_k=top_k),
            "vector": self.search_vector(query, top_k=top_k),
            "hybrid": self.search_hybrid(query, top_k=top_k)
        }


def print_comparison_results(query: str, results: Dict[str, List[Dict[str, Any]]], top_n: int = 3):
    """Print comparison results in a readable format."""
    print("\n" + "=" * 80)
    print(f"📝 QUERY: '{query}'")
    print("=" * 80)

    # BM25 Results
    print("\n🔤 BM25 KEYWORD SEARCH (Top {})".format(top_n))
    print("-" * 80)
    for i, result in enumerate(results["bm25"][:top_n], 1):
        chunk = result["chunk"]
        print(f"\n#{i} | Score: {result['bm25_score']:.4f}")
        print(f"    Product: {chunk['product_name']}")
        print(f"    Source: {chunk['doc_type']} - Page {chunk['page_num']}")
        print(f"    Text: {chunk['text'][:120]}...")

    # Vector Results
    print(f"\n\n🔍 VECTOR SEMANTIC SEARCH (Top {top_n})")
    print("-" * 80)
    for i, result in enumerate(results["vector"][:top_n], 1):
        chunk = result["chunk"]
        print(f"\n#{i} | Score: {result['vector_score']:.4f}")
        print(f"    Product: {chunk['product_name']}")
        print(f"    Source: {chunk['doc_type']} - Page {chunk['page_num']}")
        print(f"    Text: {chunk['text'][:120]}...")

    # Hybrid Results
    print(f"\n\n⚡ HYBRID SEARCH (RRF) (Top {top_n})")
    print("-" * 80)
    for i, result in enumerate(results["hybrid"][:top_n], 1):
        chunk = result["chunk"]
        bm25_info = f"BM25: rank #{result['bm25_rank']}" if result['bm25_rank'] else "BM25: not in top 20"
        vector_info = f"Vector: rank #{result['vector_rank']}" if result['vector_rank'] else "Vector: not in top 20"
        print(f"\n#{i} | RRF Score: {result['rrf_score']:.4f} | {bm25_info} | {vector_info}")
        print(f"    Product: {chunk['product_name']}")
        print(f"    Source: {chunk['doc_type']} - Page {chunk['page_num']}")
        print(f"    Text: {chunk['text'][:120]}...")


def main():
    """Main execution function."""
    print("\n" + "=" * 80)
    print("🚀 PHASE 5: HYBRID SEARCH WITH RRF")
    print("=" * 80)
    print("  Combining BM25 keyword search + Vector semantic search")
    print("  Algorithm: Reciprocal Rank Fusion (RRF)")
    print("  RRF Formula: score = 1 / (60 + rank)")
    print("=" * 80 + "\n")

    # Initialize hybrid searcher
    searcher = HybridSearcher()

    # Test queries covering different scenarios
    test_queries = [
        # Semantic queries (Vector should excel)
        "battery life comparison between watches",

        # Keyword queries (BM25 should excel)
        "Apple Watch Series 11",

        # Mixed queries (Hybrid should excel)
        "waterproof for swimming and diving",

        # Technical specs with numbers (BM25 should excel)
        "50 meter wasserdicht",

        # Semantic understanding needed (Vector should excel)
        "Welche Uhr ist besser für Marathon Training?",

        # Product comparison (Hybrid should excel)
        "Herzfrequenz und Gesundheitsmetriken"
    ]

    print("\n" + "=" * 80)
    print("🧪 TESTING DIFFERENT QUERY TYPES")
    print("=" * 80)

    for query in test_queries:
        # Get comparison results
        results = searcher.compare_search_methods(query, top_k=5)

        # Print comparison
        print_comparison_results(query, results, top_n=3)

    print("\n" + "=" * 80)
    print("✅ Phase 5 complete! Hybrid search ready for production use.")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
