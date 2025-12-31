"""
Text Chunking Pipeline - Phase 2

Breaks extracted text into optimal chunks for retrieval.
Uses LangChain RecursiveCharacterTextSplitter with token-based splitting.
"""

import sys
import json
from pathlib import Path
from typing import List, Dict, Any
from collections import defaultdict

from langchain_text_splitters import RecursiveCharacterTextSplitter

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')


class SemanticChunker:
    """Chunks documents using semantic text splitting."""

    def __init__(
        self,
        input_path: str = "data/processed",
        output_path: str = "data/processed",
        chunk_size: int = 800,
        chunk_overlap: int = 200
    ):
        """
        Initialize chunker.

        Args:
            input_path: Path to JSON files from Phase 1
            output_path: Path to save chunks.json
            chunk_size: Target chunk size in tokens
            chunk_overlap: Number of overlapping tokens between chunks
        """
        self.input_path = Path(input_path)
        self.output_path = Path(output_path)
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,  # Character-based approximation (will be close to tokens)
            separators=["\n\n", "\n", ". ", " ", ""],
            is_separator_regex=False
        )

        # Statistics
        self.stats = {
            "total_documents": 0,
            "total_pages": 0,
            "total_chunks": 0,
            "chunks_by_product": defaultdict(int),
            "chunks_by_doctype": defaultdict(int)
        }

    def _create_chunk_id(
        self,
        product_name: str,
        doc_type: str,
        page_num: int,
        chunk_index: int
    ) -> str:
        """
        Create unique chunk ID.

        Args:
            product_name: Product name
            doc_type: Document type
            page_num: Page number
            chunk_index: Index of chunk within document

        Returns:
            Chunk ID in format: {product}_{doctype}_p{page}_c{chunk_index}
        """
        return f"{product_name}_{doc_type}_p{page_num}_c{chunk_index}"

    def chunk_page(
        self,
        page_data: Dict[str, Any],
        global_chunk_index: int
    ) -> List[Dict[str, Any]]:
        """
        Chunk a single page's text.

        Args:
            page_data: Page data with text and metadata
            global_chunk_index: Current global chunk index across all documents

        Returns:
            List of chunk dictionaries
        """
        text = page_data["text"]

        # Split text into chunks
        text_chunks = self.text_splitter.split_text(text)

        chunks = []
        for i, chunk_text in enumerate(text_chunks):
            chunk_id = self._create_chunk_id(
                page_data["product_name"],
                page_data["doc_type"],
                page_data["page_num"],
                i
            )

            chunk = {
                "chunk_id": chunk_id,
                "chunk_index": global_chunk_index + i,
                "product_name": page_data["product_name"],
                "doc_type": page_data["doc_type"],
                "page_num": page_data["page_num"],
                "source_file": page_data["source_file"],
                "source_url": page_data.get("source_url"),
                "source_name": page_data.get("source_name"),
                "text": chunk_text
            }

            chunks.append(chunk)

            # Update statistics
            self.stats["chunks_by_product"][page_data["product_name"]] += 1
            self.stats["chunks_by_doctype"][page_data["doc_type"]] += 1

        return chunks

    def chunk_document(self, document_path: Path) -> List[Dict[str, Any]]:
        """
        Chunk all pages in a document.

        Args:
            document_path: Path to document JSON file

        Returns:
            List of all chunks from the document
        """
        with open(document_path, 'r', encoding='utf-8') as f:
            pages = json.load(f)

        print(f"  📄 {document_path.name}")
        print(f"     Pages: {len(pages)}")

        all_chunks = []
        current_chunk_index = self.stats["total_chunks"]

        for page_data in pages:
            page_chunks = self.chunk_page(page_data, current_chunk_index)
            all_chunks.extend(page_chunks)
            current_chunk_index += len(page_chunks)
            self.stats["total_chunks"] += len(page_chunks)

        self.stats["total_pages"] += len(pages)
        self.stats["total_documents"] += 1

        print(f"     Chunks created: {len(all_chunks)}")

        return all_chunks

    def chunk_all_documents(self) -> List[Dict[str, Any]]:
        """
        Process all JSON files and create chunks.

        Returns:
            List of all chunks from all documents
        """
        # Find all JSON files (excluding chunks.json if it exists)
        json_files = [
            f for f in self.input_path.glob("*.json")
            if f.name != "chunks.json"
        ]

        if not json_files:
            print(f"⚠️  No JSON files found in {self.input_path}")
            return []

        print(f"\n🔍 Found {len(json_files)} document(s) to chunk")
        print("=" * 60)

        all_chunks = []

        for json_file in sorted(json_files):
            doc_chunks = self.chunk_document(json_file)
            all_chunks.extend(doc_chunks)

        return all_chunks

    def save_chunks(self, chunks: List[Dict[str, Any]]):
        """
        Save all chunks to a single JSON file.

        Args:
            chunks: List of all chunks
        """
        output_file = self.output_path / "chunks.json"

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(chunks, f, indent=2, ensure_ascii=False)

        print("\n" + "=" * 60)
        print("💾 SAVED CHUNKS")
        print("=" * 60)
        print(f"  ✅ {output_file.name}")
        print(f"  📊 Total chunks: {len(chunks)}")
        print(f"  📊 Output: {output_file.absolute()}")

    def print_statistics(self):
        """Print chunking statistics."""
        print("\n" + "=" * 60)
        print("📈 CHUNKING STATISTICS")
        print("=" * 60)
        print(f"  Documents processed: {self.stats['total_documents']}")
        print(f"  Total pages: {self.stats['total_pages']}")
        print(f"  Total chunks created: {self.stats['total_chunks']}")

        print("\n  Chunks by Product:")
        for product, count in sorted(self.stats['chunks_by_product'].items()):
            print(f"    • {product}: {count} chunks")

        print("\n  Chunks by Document Type:")
        for doc_type, count in sorted(self.stats['chunks_by_doctype'].items()):
            print(f"    • {doc_type}: {count} chunks")

        if self.stats['total_chunks'] > 0:
            avg_chunks_per_page = self.stats['total_chunks'] / self.stats['total_pages']
            print(f"\n  Average chunks per page: {avg_chunks_per_page:.2f}")

        print("=" * 60)


def main():
    """Main execution function."""
    print("\n" + "=" * 60)
    print("🚀 PHASE 2: TEXT CHUNKING")
    print("=" * 60)
    print(f"  Chunk size: 800 tokens")
    print(f"  Chunk overlap: 200 tokens")
    print(f"  Separators: ['\\n\\n', '\\n', '. ', ' ', '']")
    print("=" * 60)

    # Initialize chunker
    chunker = SemanticChunker(
        chunk_size=800,
        chunk_overlap=200
    )

    # Chunk all documents
    chunks = chunker.chunk_all_documents()

    if not chunks:
        print("\n❌ No chunks were created!")
        return

    # Save chunks
    chunker.save_chunks(chunks)

    # Print statistics
    chunker.print_statistics()

    print("\n✅ Phase 2 complete! Check data/processed/chunks.json\n")


if __name__ == "__main__":
    main()
