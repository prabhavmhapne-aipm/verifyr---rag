Hybrid Retrieval Pipeline
Input: Processed query + query embedding
Parallel Branches:
Branch 1: BM25 Retrieval

Tokenize query
Search BM25 index
Return top-N chunks with keyword scores

Branch 2: Vector Retrieval

Use query embedding
Search vector database (cosine similarity)
Return top-N chunks with semantic scores

Fusion Layer:

Reciprocal Rank Fusion: Combines both result sets
Score Normalizer: Balances different scoring scales
Result Deduplicator: Removes duplicate chunks

Optional Enhancement:

Cross-Encoder Reranker: Re-scores fused results for precision

Output: Ranked list of top-K most relevant chunks