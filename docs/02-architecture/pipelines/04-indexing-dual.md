
 Indexing (Dual Index Strategy)
Build both BM25 and vector indexes

Input: Chunks + Embeddings
Branch 1: Vector Index

Vector Database: Stores embeddings with metadata
Index Builder: Creates efficient search structures (HNSW, IVF, etc.)
Metadata Indexer: Enables filtering by product, doc_type, etc.

Branch 2: Keyword Index

Tokenizer: Breaks text into searchable tokens
BM25 Index Builder: Creates statistical term-frequency index
Index Serializer: Persists index to disk

Output: Two parallel indexes ready for search