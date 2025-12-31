"""
Vector Store Pipeline - Phase 3

Generates embeddings and stores chunks in Qdrant vector database.
Uses sentence-transformers with multilingual support for German content.
"""

import sys
import json
from pathlib import Path
from typing import List, Dict, Any
from tqdm import tqdm

from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')


class VectorStore:
    """Manages vector embeddings and Qdrant storage."""

    def __init__(
        self,
        chunks_path: str = "data/processed/chunks.json",
        qdrant_path: str = "data/qdrant_storage",
        collection_name: str = "product_docs",
        embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"
    ):
        """
        Initialize vector store.

        Args:
            chunks_path: Path to chunks.json file
            qdrant_path: Path for Qdrant storage
            collection_name: Name of the Qdrant collection
            embedding_model: Sentence-transformers model name
        """
        self.chunks_path = Path(chunks_path)
        self.qdrant_path = Path(qdrant_path)
        self.collection_name = collection_name
        self.embedding_model_name = embedding_model

        # Create storage directory
        self.qdrant_path.mkdir(parents=True, exist_ok=True)

        # Initialize components (lazy loading)
        self.embedding_model = None
        self.client = None
        self.embedding_dim = None

        # Statistics
        self.stats = {
            "total_chunks": 0,
            "embeddings_generated": 0,
            "chunks_uploaded": 0
        }

    def _load_embedding_model(self):
        """Load the sentence-transformers model."""
        if self.embedding_model is None:
            print(f"\n📥 Loading embedding model: {self.embedding_model_name}")
            print("   (First run will download the model, this may take a few minutes)")

            self.embedding_model = SentenceTransformer(self.embedding_model_name)
            self.embedding_dim = self.embedding_model.get_sentence_embedding_dimension()

            print(f"   ✅ Model loaded: {self.embedding_dim}-dimensional embeddings")

    def _initialize_qdrant(self):
        """Initialize Qdrant client and create collection."""
        if self.client is None:
            print(f"\n🗄️  Initializing Qdrant (embedded mode)")
            print(f"   Storage path: {self.qdrant_path.absolute()}")

            try:
                self.client = QdrantClient(path=str(self.qdrant_path))
            except Exception as e:
                error_msg = str(e).lower()
                if "already accessed" in error_msg or "locked" in error_msg or "database is locked" in error_msg:
                    print(f"\n❌ ERROR: Qdrant database is locked!")
                    print(f"   The database is currently being used by another process.")
                    print(f"\n   Solutions:")
                    print(f"   1. Stop the FastAPI server (if running):")
                    print(f"      - Press Ctrl+C in the terminal running the server")
                    print(f"      - Or kill the Python process using Task Manager")
                    print(f"   2. Wait a few seconds after stopping the server")
                    print(f"   3. Then try running this script again")
                    print(f"\n   If the problem persists, you may need to restart your computer")
                    print(f"   to release the file lock.\n")
                    raise RuntimeError(
                        "Qdrant database is locked. Please stop the FastAPI server "
                        "or any other process using the database before running indexing."
                    ) from e
                else:
                    raise

            # Check if collection exists
            collections = self.client.get_collections().collections
            collection_names = [c.name for c in collections]

            if self.collection_name in collection_names:
                print(f"   ⚠️  Collection '{self.collection_name}' already exists. Deleting...")
                self.client.delete_collection(self.collection_name)

            # Create new collection
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=self.embedding_dim,
                    distance=Distance.COSINE
                )
            )

            print(f"   ✅ Collection '{self.collection_name}' created")

    def load_chunks(self) -> List[Dict[str, Any]]:
        """
        Load chunks from JSON file.

        Returns:
            List of chunk dictionaries
        """
        print(f"\n📂 Loading chunks from {self.chunks_path.name}")

        with open(self.chunks_path, 'r', encoding='utf-8') as f:
            chunks = json.load(f)

        self.stats["total_chunks"] = len(chunks)
        print(f"   ✅ Loaded {len(chunks)} chunks")

        return chunks

    def generate_embeddings(self, chunks: List[Dict[str, Any]], batch_size: int = 32) -> List[List[float]]:
        """
        Generate embeddings for all chunks.

        Args:
            chunks: List of chunk dictionaries
            batch_size: Number of chunks to embed at once

        Returns:
            List of embedding vectors
        """
        self._load_embedding_model()

        print(f"\n🔢 Generating embeddings for {len(chunks)} chunks")
        print(f"   Batch size: {batch_size}")

        # Extract text from chunks
        texts = [chunk["text"] for chunk in chunks]

        # Generate embeddings with progress bar
        embeddings = []
        for i in tqdm(range(0, len(texts), batch_size), desc="   Embedding batches"):
            batch_texts = texts[i:i + batch_size]
            batch_embeddings = self.embedding_model.encode(
                batch_texts,
                show_progress_bar=False,
                convert_to_numpy=True
            )
            embeddings.extend(batch_embeddings.tolist())
            self.stats["embeddings_generated"] = len(embeddings)

        print(f"   ✅ Generated {len(embeddings)} embeddings")

        return embeddings

    def upload_to_qdrant(self, chunks: List[Dict[str, Any]], embeddings: List[List[float]]):
        """
        Upload chunks with embeddings to Qdrant.

        Args:
            chunks: List of chunk dictionaries
            embeddings: List of embedding vectors
        """
        self._initialize_qdrant()

        print(f"\n📤 Uploading {len(chunks)} chunks to Qdrant")

        # Prepare points
        points = []
        for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point = PointStruct(
                id=idx,
                vector=embedding,
                payload={
                    "chunk_id": chunk["chunk_id"],
                    "chunk_index": chunk["chunk_index"],
                    "product_name": chunk["product_name"],
                    "doc_type": chunk["doc_type"],
                    "page_num": chunk["page_num"],
                    "source_file": chunk["source_file"],
                    "source_url": chunk.get("source_url"),
                    "source_name": chunk.get("source_name"),
                    "text": chunk["text"]
                }
            )
            points.append(point)

        # Upload in batches with progress bar
        batch_size = 100
        for i in tqdm(range(0, len(points), batch_size), desc="   Uploading batches"):
            batch_points = points[i:i + batch_size]
            self.client.upsert(
                collection_name=self.collection_name,
                points=batch_points
            )
            self.stats["chunks_uploaded"] += len(batch_points)

        print(f"   ✅ Uploaded {self.stats['chunks_uploaded']} chunks")

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for similar chunks.

        Args:
            query: Search query
            top_k: Number of results to return

        Returns:
            List of search results with scores
        """
        if self.client is None:
            self._initialize_qdrant()

        if self.embedding_model is None:
            self._load_embedding_model()

        # Generate query embedding
        query_embedding = self.embedding_model.encode(query, convert_to_numpy=True).tolist()

        # Search using query method
        search_results = self.client.query_points(
            collection_name=self.collection_name,
            query=query_embedding,
            limit=top_k
        ).points

        # Format results
        results = []
        for result in search_results:
            results.append({
                "score": result.score,
                "chunk_id": result.payload["chunk_id"],
                "product_name": result.payload["product_name"],
                "doc_type": result.payload["doc_type"],
                "page_num": result.payload["page_num"],
                "source_file": result.payload.get("source_file"),
                "source_url": result.payload.get("source_url"),
                "source_name": result.payload.get("source_name"),
                "text": result.payload["text"]
            })

        return results

    def print_statistics(self):
        """Print processing statistics."""
        print("\n" + "=" * 60)
        print("📈 VECTOR STORE STATISTICS")
        print("=" * 60)
        print(f"  Total chunks processed: {self.stats['total_chunks']}")
        print(f"  Embeddings generated: {self.stats['embeddings_generated']}")
        print(f"  Chunks uploaded to Qdrant: {self.stats['chunks_uploaded']}")
        print(f"  Embedding dimensions: {self.embedding_dim}")
        print(f"  Collection name: {self.collection_name}")
        print(f"  Storage path: {self.qdrant_path.absolute()}")
        print("=" * 60)

    def close(self):
        """Close Qdrant client to release file lock."""
        if self.client is not None:
            # Qdrant client doesn't have an explicit close method
            # Setting to None allows garbage collection to release the lock
            self.client = None


def main():
    """Main execution function."""
    print("\n" + "=" * 60)
    print("🚀 PHASE 3: VECTOR EMBEDDINGS & QDRANT SETUP")
    print("=" * 60)
    print(f"  Model: paraphrase-multilingual-MiniLM-L12-v2")
    print(f"  Distance metric: Cosine similarity")
    print(f"  Database: Qdrant (embedded mode)")
    print("=" * 60)

    # Initialize vector store
    vector_store = VectorStore()

    # Load chunks
    chunks = vector_store.load_chunks()

    # Generate embeddings
    embeddings = vector_store.generate_embeddings(chunks, batch_size=32)

    # Upload to Qdrant
    vector_store.upload_to_qdrant(chunks, embeddings)

    # Print statistics
    vector_store.print_statistics()

    # Test search
    print("\n" + "=" * 60)
    print("🔍 TESTING VECTOR SEARCH")
    print("=" * 60)

    test_queries = [
        "Akkulaufzeit und Batteriekapazität",  # Battery life (German)
        "waterproof rating specifications",     # English
        "Herzfrequenz messen"                   # Heart rate (German)
    ]

    for query in test_queries:
        print(f"\n📝 Query: '{query}'")
        results = vector_store.search(query, top_k=3)

        for i, result in enumerate(results, 1):
            print(f"\n   Result #{i} (score: {result['score']:.4f})")
            print(f"   Product: {result['product_name']}")
            print(f"   Source: {result['doc_type']} - Page {result['page_num']}")
            print(f"   Text: {result['text'][:150]}...")

    print("\n" + "=" * 60)
    print("✅ Phase 3 complete! Vector store ready for retrieval.\n")


if __name__ == "__main__":
    main()
