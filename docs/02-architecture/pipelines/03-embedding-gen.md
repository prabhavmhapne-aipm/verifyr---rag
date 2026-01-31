Input: Text chunks
Components:

Embedding Model: Transforms text into dense vectors
Batch Processor: Handles chunks in batches for efficiency
Normalization Layer: Prepares embeddings for cosine similarity
Embedding Validator: Checks for anomalies or failed generations

Output: Numerical embedding vectors (one per chunk)