"""
Hybrid Search Pipeline - Phase 5

Combines BM25 keyword search and vector semantic search using Reciprocal Rank Fusion (RRF).
Provides the best of both worlds: exact matching and semantic understanding.
"""

import sys
from pathlib import Path
from typing import List, Dict, Any, Tuple
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

    def search_hybrid(self, query: str, top_k: int = 5, retrieve_k: int = 20) -> List[Dict[str, Any]]:
        """
        Search using hybrid approach with Reciprocal Rank Fusion.

        Args:
            query: Search query
            top_k: Number of final results to return
            retrieve_k: Number of results to retrieve from each method before fusion

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
            rrf_scores[chunk_id]["rrf_score"] += self._calculate_rrf_score(result["bm25_rank"])
            rrf_scores[chunk_id]["bm25_rank"] = result["bm25_rank"]
            rrf_scores[chunk_id]["bm25_score"] = result["bm25_score"]
            rrf_scores[chunk_id]["chunk"] = result["chunk"]

        # Add Vector contributions
        for result in vector_results:
            chunk_id = result["chunk"]["chunk_id"]
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

        # Ensure product diversity - get chunks from BOTH products
        final_results = self._ensure_product_diversity(sorted_results, top_k)

        return final_results

    def _ensure_product_diversity(
        self,
        sorted_results: List[tuple],
        top_k: int
    ) -> List[Dict[str, Any]]:
        """
        Ensure both products are represented in final results.

        Strategy: Take top results but ensure at least 2 chunks from each product.

        Args:
            sorted_results: Results sorted by RRF score
            top_k: Number of results to return

        Returns:
            Diverse list of results with both products represented
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

        # Second pass: Ensure minimum representation from each product
        # If one product has 0 chunks, replace the lowest-scoring chunk with one from missing product
        min_chunks_per_product = max(1, top_k // 3)  # At least 1 chunk per product (or 1/3 of results)

        for chunk_id, scores in sorted_results:
            product_name = scores["chunk"]["product_name"]

            # If this product needs more representation
            if product_counts[product_name] < min_chunks_per_product:
                # Find the lowest scoring chunk from the over-represented product
                min_score_idx = None
                min_score = float('inf')

                for idx, result in enumerate(final_results):
                    other_product = result["chunk"]["product_name"]
                    if other_product != product_name and product_counts[other_product] > min_chunks_per_product:
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
