"""
BM25 Keyword Index Pipeline - Phase 4

Builds BM25 keyword search index for exact matches and technical specifications.
Complements vector search with keyword-based retrieval.
"""

import sys
import json
import pickle
from pathlib import Path
from typing import List, Dict, Any, Tuple

from rank_bm25 import BM25Okapi

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')


class BM25Index:
    """Manages BM25 keyword search index."""

    def __init__(
        self,
        chunks_path: str = "data/processed/chunks.json",
        index_path: str = "data/processed/bm25_index.pkl"
    ):
        """
        Initialize BM25 index.

        Args:
            chunks_path: Path to chunks.json file
            index_path: Path to save BM25 index pickle file
        """
        self.chunks_path = Path(chunks_path)
        self.index_path = Path(index_path)

        # Components
        self.chunks = None
        self.bm25 = None
        self.tokenized_corpus = None

        # Statistics
        self.stats = {
            "total_chunks": 0,
            "total_tokens": 0,
            "avg_tokens_per_chunk": 0,
            "unique_tokens": 0
        }

    def _tokenize(self, text: str) -> List[str]:
        """
        Tokenize text for BM25.

        Simple tokenization: lowercase and split on whitespace.
        Preserves numbers and special characters for technical terms.

        Args:
            text: Text to tokenize

        Returns:
            List of tokens
        """
        # Simple tokenization: lowercase and split
        tokens = text.lower().split()
        return tokens

    def load_chunks(self) -> List[Dict[str, Any]]:
        """
        Load chunks from JSON file.

        Returns:
            List of chunk dictionaries
        """
        print(f"\n📂 Loading chunks from {self.chunks_path.name}")

        with open(self.chunks_path, 'r', encoding='utf-8') as f:
            self.chunks = json.load(f)

        self.stats["total_chunks"] = len(self.chunks)
        print(f"   ✅ Loaded {len(self.chunks)} chunks")

        return self.chunks

    def build_index(self) -> BM25Okapi:
        """
        Build BM25 index from chunks.

        Returns:
            BM25Okapi index
        """
        if self.chunks is None:
            raise ValueError("Chunks not loaded. Call load_chunks() first.")

        print(f"\n🔨 Building BM25 index")

        # Tokenize all chunks
        self.tokenized_corpus = []
        all_tokens = []

        for chunk in self.chunks:
            tokens = self._tokenize(chunk["text"])
            self.tokenized_corpus.append(tokens)
            all_tokens.extend(tokens)

        # Build BM25 index
        self.bm25 = BM25Okapi(self.tokenized_corpus)

        # Calculate statistics
        self.stats["total_tokens"] = len(all_tokens)
        self.stats["unique_tokens"] = len(set(all_tokens))
        self.stats["avg_tokens_per_chunk"] = len(all_tokens) / len(self.chunks)

        print(f"   ✅ Index built")
        print(f"   Total tokens: {self.stats['total_tokens']:,}")
        print(f"   Unique tokens: {self.stats['unique_tokens']:,}")
        print(f"   Avg tokens/chunk: {self.stats['avg_tokens_per_chunk']:.1f}")

        return self.bm25

    def save(self):
        """Save BM25 index to pickle file."""
        if self.bm25 is None:
            raise ValueError("Index not built. Call build_index() first.")

        print(f"\n💾 Saving BM25 index to {self.index_path.name}")

        # Save both index and chunks for retrieval
        index_data = {
            "bm25": self.bm25,
            "chunks": self.chunks,
            "tokenized_corpus": self.tokenized_corpus,
            "stats": self.stats
        }

        with open(self.index_path, 'wb') as f:
            pickle.dump(index_data, f)

        file_size = self.index_path.stat().st_size / 1024 / 1024
        print(f"   ✅ Saved ({file_size:.2f} MB)")
        print(f"   Path: {self.index_path.absolute()}")

    def load(self):
        """Load BM25 index from pickle file."""
        print(f"\n📥 Loading BM25 index from {self.index_path.name}")

        with open(self.index_path, 'rb') as f:
            index_data = pickle.load(f)

        self.bm25 = index_data["bm25"]
        self.chunks = index_data["chunks"]
        self.tokenized_corpus = index_data["tokenized_corpus"]
        self.stats = index_data["stats"]

        print(f"   ✅ Loaded index with {len(self.chunks)} chunks")

    def search(self, query: str, top_k: int = 5) -> List[Tuple[Dict[str, Any], float]]:
        """
        Search using BM25.

        Args:
            query: Search query
            top_k: Number of results to return

        Returns:
            List of (chunk, score) tuples
        """
        if self.bm25 is None:
            raise ValueError("Index not loaded. Call load() or build_index() first.")

        # Tokenize query
        query_tokens = self._tokenize(query)

        # Get BM25 scores
        scores = self.bm25.get_scores(query_tokens)

        # Get top-k results
        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]

        results = []
        for idx in top_indices:
            results.append((self.chunks[idx], scores[idx]))

        return results

    def print_statistics(self):
        """Print index statistics."""
        print("\n" + "=" * 60)
        print("📈 BM25 INDEX STATISTICS")
        print("=" * 60)
        print(f"  Total chunks indexed: {self.stats['total_chunks']}")
        print(f"  Total tokens: {self.stats['total_tokens']:,}")
        print(f"  Unique tokens: {self.stats['unique_tokens']:,}")
        print(f"  Average tokens per chunk: {self.stats['avg_tokens_per_chunk']:.1f}")
        print(f"  Index file: {self.index_path.absolute()}")
        if self.index_path.exists():
            file_size = self.index_path.stat().st_size / 1024 / 1024
            print(f"  Index size: {file_size:.2f} MB")
        print("=" * 60)


def main():
    """Main execution function."""
    print("\n" + "=" * 60)
    print("🚀 PHASE 4: BM25 KEYWORD INDEX")
    print("=" * 60)
    print(f"  Algorithm: BM25Okapi")
    print(f"  Tokenization: Simple (lowercase + whitespace split)")
    print("=" * 60)

    # Initialize BM25 index
    bm25_index = BM25Index()

    # Load chunks
    chunks = bm25_index.load_chunks()

    # Build index
    bm25_index.build_index()

    # Save index
    bm25_index.save()

    # Print statistics
    bm25_index.print_statistics()

    # Test searches
    print("\n" + "=" * 60)
    print("🔍 TESTING BM25 SEARCH")
    print("=" * 60)

    test_queries = [
        "battery 12 hours",                    # English keyword match
        "Akkulaufzeit 18 Stunden",            # German keyword match
        "waterproof rating IP67",             # Technical specification
        "50 meter wasserdicht",               # Technical spec (German)
        "Apple Watch Series 11",              # Product name
        "Garmin Forerunner 970"               # Product name
    ]

    for query in test_queries:
        print(f"\n📝 Query: '{query}'")
        results = bm25_index.search(query, top_k=3)

        for i, (chunk, score) in enumerate(results, 1):
            print(f"\n   Result #{i} (BM25 score: {score:.4f})")
            print(f"   Product: {chunk['product_name']}")
            print(f"   Source: {chunk['doc_type']} - Page {chunk['page_num']}")
            print(f"   Text: {chunk['text'][:150]}...")

    print("\n" + "=" * 60)
    print("✅ Phase 4 complete! BM25 index ready for hybrid search.\n")


if __name__ == "__main__":
    main()
