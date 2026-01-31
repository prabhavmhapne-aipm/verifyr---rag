The RAG system consists of three main pipelines that work together:

Pipeline 1: Offline Indexing Pipeline (Build Once, Update Periodically)
Purpose: Transform raw product documents into searchable, retrievable knowledge
Flow: Raw PDFs → Text Extraction → Chunking → Embedding Generation → Dual Index Storage (Vector DB + BM25)

Triggers:
- Initial system setup
- New product additions
- Document updates
- Index optimization/re-chunking

Pipeline 2: Query-Time Retrieval Pipeline (Runs Per User Query)
Purpose: Find the most relevant information for a given user question
Flow: User Query → Query Processing → Hybrid Search (Parallel BM25 + Vector Search) → Result Fusion → Reranking (Optional) → Top-K Chunks

Pipeline 3: Generation Pipeline (Runs Per User Query)
Purpose: Synthesize retrieved information into a coherent, cited answer
Flow: User Query + Retrieved Chunks → Context Formatting → LLM Prompt Construction → Claude API Call → Answer + Source Attribution


Supporting Pipeline: Evaluation Pipeline (Runs Periodically)
Purpose: Measure and improve system quality
Flow: Test Questions → Run Through Retrieval + Generation → Compare Against Ground Truth → Metrics Dashboard → System Tuning