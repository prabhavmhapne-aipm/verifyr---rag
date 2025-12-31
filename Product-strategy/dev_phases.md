# RAG System Development Phases
## Building Verifyr Product Comparison with Claude Code in Cursor

---

## 🎯 Overview

This document outlines the 10-phase development strategy for building a traditional RAG system using Claude Code in Cursor. Complete each phase fully and validate before moving to the next.

**Tech Stack:**
- Backend: FastAPI
- Frontend: HTML/JavaScript
- Vector DB: Qdrant (embedded mode)
- Keyword Search: BM25
- LLM: Claude Sonnet 4.5
- Embeddings: sentence-transformers

**Core Principle:** Build incrementally, test constantly, validate thoroughly.

---

## Phase 0: Foundation Setup (Manual)

### Tasks

1. **Create project structure:**
```
verifyr-rag/
├── backend/
│   ├── api/
│   ├── ingestion/
│   ├── indexing/
│   ├── retrieval/
│   ├── generation/
│   └── main.py
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── data/
│   ├── raw/
│   ├── processed/
│   └── qdrant_storage/
├── tests/
├── requirements.txt
└── DESIGN.md
```

2. **Organize your PDFs:**
```
data/raw/
├── product_a/
│   ├── manual.pdf
│   ├── specifications.pdf
│   ├── review.pdf
│   └── reviews/
│       ├── review_site1.pdf
│       └── review_site2.pdf
├── product_b/
│   ├── manual.pdf
│   ├── specifications.pdf
│   └── review.pdf
└── sources.json  # Optional: Map PDFs to source URLs for clickable citations
```

3. **Create sources.json (optional but recommended):**
```json
{
  "product_a": {
    "manual.pdf": {
      "source_url": "https://example.com/product-a-manual",
      "source_name": "Official Manual"
    },
    "reviews/review_site1.pdf": {
      "source_url": "https://reviewsite.com/product-a-review",
      "source_name": "Review Site"
    }
  }
}
```
See `data/raw/sources.json.example` for full format.

4. **Create DESIGN.md with decisions:**
- Chunk size: 800 tokens
- Overlap: 200 tokens
- Embedding model: paraphrase-multilingual-MiniLM-L12-v2 (optimized for German)
- Vector DB: Qdrant embedded mode
- LLM: Claude Sonnet 4.5
- Top-K retrieval: 5 chunks

### Success Criteria
- ✅ Project structure created
- ✅ PDFs placed in correct folders
- ✅ Design decisions documented
- ✅ sources.json created (optional, for clickable citations)

---

## Phase 1: PDF Text Extraction

### Objective
Extract clean text from all 6 PDFs with proper metadata.

### Prompt for Claude Code

```
I need to extract text from PDFs in data/raw/. 

Project Structure:
- data/raw/product_a/ contains: manual.pdf, specifications.pdf, review.pdf
- data/raw/product_b/ contains: manual.pdf, specifications.pdf, review.pdf

Requirements:
1. Use PyMuPDF (fitz) for primary text extraction
2. Fallback to Tesseract OCR if extracted text < 50 characters per page
3. Load source URL metadata from data/raw/sources.json (if exists)
4. Extract metadata:
   - product_name (from folder name)
   - doc_type (infer from filename: manual/specifications/review)
   - page_number
   - source_file
   - source_url (from sources.json, optional)
   - source_name (from sources.json, optional)
   - text content
5. Output to data/processed/ as individual JSON files: {product}_{doctype}.json
6. Create backend/ingestion/pdf_processor.py with:
   - PDFProcessor class
   - _load_sources_metadata() method to load sources.json
   - _get_source_metadata() method to look up URLs per file
   - extract_text_from_pdf() method
   - process_directory() method
   - _ocr_page() fallback method
7. Create a runnable script that processes all PDFs

Dependencies needed:
- PyMuPDF
- pytesseract
- Pillow

Test: Run `python backend/ingestion/pdf_processor.py` and verify:
- JSON files created in data/processed/
- Each page includes source_url and source_name fields (if sources.json exists)
```

### Your Validation Steps

1. **Install dependencies:**
```bash
pip install PyMuPDF pytesseract Pillow
```

2. **Run the processor:**
```bash
python backend/ingestion/pdf_processor.py
```

3. **Check output:**
- Navigate to `data/processed/`
- Verify 6 JSON files exist
- Open 2-3 files randomly
- Check text quality (readable? coherent? OCR artifacts?)
- Verify metadata is correct

4. **Quality checks:**
- Does text match what's in the PDF?
- Are page numbers sequential?
- Is doc_type correctly inferred?
- Any garbled OCR text? (share with Claude to fix)

### Success Criteria
- ✅ 6 JSON files in data/processed/
- ✅ Text is readable and accurate
- ✅ All metadata fields present
- ✅ No major OCR errors

### Common Issues & Fixes

**Issue:** OCR produces garbage text
**Fix:** Ask Claude to improve OCR preprocessing (image enhancement, language specification)

**Issue:** Some PDFs fail to process
**Fix:** Share error with Claude, likely file path or encoding issue

---

## Phase 2: Text Chunking

### Objective
Break extracted text into optimal chunks for retrieval.

### Prompt for Claude Code

```
Now chunk the extracted text from data/processed/*.json files.

Requirements:
1. Read all JSON files from Phase 1 (data/processed/*.json)
2. Use LangChain's RecursiveCharacterTextSplitter:
   - chunk_size: 800 tokens
   - chunk_overlap: 200 tokens
   - separators: ["\n\n", "\n", ". ", " ", ""]
3. Preserve ALL metadata from extraction:
   - product_name
   - doc_type
   - page_num
   - source_file
   - source_url (if present)
   - source_name (if present)
4. Add new metadata:
   - chunk_id: "{product}_{doctype}_p{page}_c{chunk_index}"
   - chunk_index (position within document)
5. Output single file: data/processed/chunks.json (array of chunk objects)
6. Create backend/ingestion/chunker.py with:
   - SemanticChunker class
   - chunk_documents() method
7. Include statistics output:
   - Total chunks created
   - Chunks per product
   - Chunks per document type

Test: Run script, verify chunks are ~800 tokens and contain metadata.
```

### Your Validation Steps

1. **Run chunker:**
```bash
python backend/ingestion/chunker.py
```

2. **Inspect chunks.json:**
- Open the file
- Check total number of chunks (expect 50-200 for 6 docs)
- Read 5 random chunks:
  - Are they coherent? (complete sentences/paragraphs)
  - Check boundaries (not cutting mid-sentence?)
  - Verify ~800 tokens each (roughly 600-1000 words)

3. **Metadata validation:**
- Pick a chunk, verify:
  - product_name matches source
  - doc_type is correct
  - page_num makes sense
  - chunk_id is unique

4. **Quality assessment:**
- Do chunks contain meaningful information?
- Is overlap working? (check if consecutive chunks share some text)
- Any chunks that are too small/large? (outliers)

### Success Criteria
- ✅ chunks.json exists with all chunks
- ✅ Chunks are coherent and well-sized
- ✅ Metadata preserved correctly
- ✅ Statistics output looks reasonable

### Common Issues & Fixes

**Issue:** Chunks cut mid-sentence
**Fix:** Ask Claude to adjust separators or chunk size

**Issue:** Too many/few chunks
**Fix:** Modify chunk_size parameter (smaller = more chunks)

**Issue:** Overlap not working
**Fix:** Verify chunk_overlap parameter is being used

---

## Phase 3: Vector Embeddings & Qdrant Setup

### Objective
Generate embeddings and store in vector database.

### Prompt for Claude Code

```
Generate embeddings and store in Qdrant vector database.

Requirements:
1. Read data/processed/chunks.json
2. Use sentence-transformers library:
   - Model: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
   - Normalize embeddings for cosine similarity
3. Initialize Qdrant client:
   - Embedded mode: QdrantClient(path="./data/qdrant_storage")
   - Collection name: "product_docs"
   - Distance metric: Cosine
4. Store each chunk:
   - chunk_id as document ID
   - embedding vector
   - chunk text
   - all metadata as payload
5. Create backend/indexing/vector_store.py with:
   - VectorStore class
   - add_chunks() method
   - search() method (for testing)
6. Create a runnable script that:
   - Generates all embeddings (with progress bar)
   - Creates Qdrant collection
   - Uploads all chunks
7. Include test query at end:
   - Query: "battery life specifications"
   - Print top 3 results with scores

Show embedding generation progress and confirm successful storage.
```

### Your Validation Steps

1. **Install dependencies:**
```bash
pip install sentence-transformers qdrant-client
```

2. **Run indexing:**
```bash
python backend/indexing/vector_store.py
```

3. **Monitor output:**
- Watch embedding generation progress
- Verify no errors during upload
- Check test query results

4. **Validate storage:**
- Confirm `data/qdrant_storage/` folder exists
- Check folder size (should be multiple MB)

5. **Test search manually:**
```python
from qdrant_client import QdrantClient

client = QdrantClient(path="./data/qdrant_storage")
results = client.search(
    collection_name="product_docs",
    query_vector=[0.1] * 384,  # dummy vector
    limit=3
)
print(results)
```

6. **Quality checks:**
- Do search results make semantic sense?
- Are metadata fields preserved?
- Do similarity scores look reasonable? (0.0-1.0 range)

### Success Criteria
- ✅ Qdrant storage folder created
- ✅ All chunks stored successfully
- ✅ Test query returns relevant results
- ✅ Metadata intact in stored documents

### Common Issues & Fixes

**Issue:** Out of memory during embedding generation
**Fix:** Ask Claude to batch process (smaller batches)

**Issue:** Qdrant connection errors
**Fix:** Ensure path is correct, folder is writable

**Issue:** "Storage folder already accessed" or database locked error
**Fix:** Qdrant uses SQLite which locks when FastAPI server is running. Solutions:
  1. Stop the FastAPI server before running vector indexing
  2. Use `python backend/indexing/reset_qdrant.py` to check lock status
  3. If persists, close all Python processes or restart computer
  4. OneDrive sync can also cause locks - check for null files in qdrant_storage/

**Issue:** Search returns irrelevant results
**Fix:** May be normal - will improve with hybrid search

---

## Phase 4: BM25 Keyword Index

### Objective
Build keyword-based search index for exact matches.

### Prompt for Claude Code

```
Build BM25 keyword search index.

Requirements:
1. Read data/processed/chunks.json
2. Use rank-bm25 library (BM25Okapi)
3. Tokenize chunk text:
   - Lowercase
   - Split on whitespace
   - Keep as simple tokens
4. Build BM25 index from tokenized corpus
5. Serialize index to data/processed/bm25_index.pkl using pickle
6. Create backend/indexing/bm25_index.py with:
   - BM25Index class
   - build_index() method
   - search(query, top_k) method
   - save() and load() methods
7. Create runnable script that:
   - Builds index from chunks
   - Saves to pickle file
   - Tests with sample queries
8. Include test queries:
   - "battery 12 hours" (keyword match)
   - "waterproof rating IP67" (technical term)
   - Print top 5 results with scores

Show indexing progress and test results.
```

### Your Validation Steps

1. **Install dependencies:**
```bash
pip install rank-bm25
```

2. **Run BM25 indexing:**
```bash
python backend/indexing/bm25_index.py
```

3. **Check output:**
- Verify `data/processed/bm25_index.pkl` created
- Check file size (should be several MB)

4. **Test keyword search:**
- Run provided test queries
- Verify results contain query keywords
- Check score ordering (highest scores first)

5. **Compare with vector search:**
- Same query in both systems
- BM25 should excel at exact matches (model numbers, specs)
- Vector should excel at semantic queries

6. **Quality checks:**
- Do results contain the query terms?
- Are technical specifications returned for technical queries?
- Is ranking sensible?

### Success Criteria
- ✅ BM25 index file created
- ✅ Test queries return relevant results
- ✅ Keyword matching works correctly
- ✅ Scores reflect term frequency appropriately

### Common Issues & Fixes

**Issue:** All scores are similar
**Fix:** May indicate poor tokenization - ask Claude to improve

**Issue:** Pickle file very large
**Fix:** Normal for BM25 with many chunks

**Issue:** Search returns nothing
**Fix:** Check tokenization consistency between indexing and search

---

## Phase 5: Hybrid Search with RRF

### Objective
Combine BM25 and vector search using Reciprocal Rank Fusion.

### Prompt for Claude Code

```
Implement hybrid search combining BM25 and vector search with Reciprocal Rank Fusion.

Requirements:
1. Create backend/retrieval/hybrid_search.py
2. HybridSearcher class that takes:
   - VectorStore instance (from Phase 3)
   - BM25Index instance (from Phase 4)
   - EmbeddingGenerator instance
3. search(query, top_k) method:
   - Generate query embedding
   - Run BM25 search → get top 20 results
   - Run vector search → get top 20 results
   - Apply Reciprocal Rank Fusion:
     * RRF formula: score = 1 / (60 + rank)
     * Combine scores from both methods
     * Sort by combined RRF score
   - Return top_k results with metadata
4. Include result structure:
   - chunk object
   - rrf_score
   - bm25_rank (or None)
   - vector_rank (or None)
5. Create test script that compares:
   - BM25-only results
   - Vector-only results
   - Hybrid results
   For queries:
   - "battery life comparison" (semantic)
   - "model X1000 specifications" (keyword)
   - "which is more durable" (mixed)

Show how hybrid improves over individual methods.
```

### Your Validation Steps

1. **Run hybrid search tests:**
```bash
python backend/retrieval/hybrid_search.py
```

2. **Analyze test results:**
- Compare the 3 approaches for each query type
- Does hybrid get best of both worlds?
- Check RRF scores are calculated correctly

3. **Manual testing:**
```python
from backend.retrieval.hybrid_search import HybridSearcher

searcher = HybridSearcher(vector_store, bm25_index, embedder)
results = searcher.search("waterproof for trail running", top_k=5)

for r in results:
    print(f"Score: {r['rrf_score']:.4f}")
    print(f"BM25 rank: {r['bm25_rank']}, Vector rank: {r['vector_rank']}")
    print(f"Product: {r['chunk'].metadata['product_name']}")
    print(f"Text preview: {r['chunk'].text[:100]}...")
    print("---")
```

4. **Quality assessment:**
- Do hybrid results include diverse sources?
- Are both products represented?
- Do results match query intent?

5. **Compare query types:**
- Keyword queries: BM25 should rank high
- Semantic queries: Vector should rank high
- Hybrid should balance both

### Success Criteria
- ✅ Hybrid search returns top-K results
- ✅ RRF scores calculated correctly
- ✅ Results better than individual methods
- ✅ Diverse source coverage

### Common Issues & Fixes

**Issue:** Hybrid no better than single method
**Fix:** Adjust k parameter in RRF formula (try 30, 90)

**Issue:** Results favor one method too heavily
**Fix:** May need weighted fusion instead of pure RRF

**Issue:** Duplicate chunks in results
**Fix:** Add deduplication logic

---

## Phase 6: FastAPI Backend Setup

### Objective
Create REST API with query endpoint.

### Prompt for Claude Code

```
Create FastAPI backend with REST API.

Requirements:
1. Create backend/main.py as FastAPI application
2. Enable CORS:
   - Allow origin: http://localhost:3000
   - Allow methods: GET, POST
   - Allow headers: Content-Type
3. Create endpoints:
   
   GET /health
   - Returns: {"status": "healthy", "indexes_loaded": true}
   - Check Qdrant connection
   
   POST /query
   - Request body: {"question": "string"}
   - Response (stub for now):
     {
       "answer": "This will be generated by Claude API",
       "sources": [],
       "query_id": "uuid",
       "response_time_ms": 0
     }
   - Validate question is non-empty
   
   GET /products
   - Returns: {"products": ["Product A", "Product B"]}
   
4. Add startup event to:
   - Load BM25 index from pickle
   - Initialize Qdrant client
   - Load embedding model
   - Print "Indexes loaded successfully"

5. Add proper error handling:
   - 400 for invalid input
   - 500 for server errors
   - Include error message in response

6. Use Pydantic models for request/response validation

7. **IMPORTANT: Mount static files for frontend serving:**
   - Import StaticFiles from fastapi.staticfiles
   - Mount frontend/ directory at /frontend path with html=True
   - Mount Verifyr/ directory at /Verifyr path (for design system CSS)
   - Use project root path resolution: Path(__file__).parent.parent
   - Add existence checks and logging for both mounts

   Example configuration (lines 94-110 in main.py):
   ```python
   from fastapi.staticfiles import StaticFiles

   project_root = Path(__file__).parent.parent
   frontend_path = project_root / "frontend"
   verifyr_path = project_root / "Verifyr"

   if frontend_path.exists():
       app.mount("/frontend", StaticFiles(directory=str(frontend_path), html=True), name="frontend")
       print(f"✅ Frontend mounted at /frontend from {frontend_path}")

   if verifyr_path.exists():
       app.mount("/Verifyr", StaticFiles(directory=str(verifyr_path)), name="verifyr")
       print(f"✅ Verifyr design system mounted at /Verifyr from {verifyr_path}")
   ```

   This enables:
   - Chat interface access at http://localhost:8000/frontend/
   - Design system CSS at http://localhost:8000/Verifyr/design-system/design-system.css
   - Single server for both API and frontend (no CORS issues)

Run server on port 8000 with auto-reload.
Include instructions for testing with curl.
```

### Your Validation Steps

1. **Install FastAPI:**
```bash
pip install fastapi uvicorn python-multipart
```

2. **Start server:**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

3. **Test health endpoint:**
```bash
curl http://localhost:8000/health
```
Expected: `{"status": "healthy", "indexes_loaded": true}`

4. **Test query endpoint (stub):**
```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question":"test question"}'
```

5. **Test products endpoint:**
```bash
curl http://localhost:8000/products
```

6. **Check Swagger docs:**
- Navigate to `http://localhost:8000/docs`
- Verify all endpoints listed
- Test query endpoint through UI

7. **Test error handling:**
```bash
# Empty question
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question":""}'
```
Expected: 400 error

8. **Test static file serving:**
```bash
# Test frontend access
curl -I http://localhost:8000/frontend/
# Expected: 200 OK

# Test design system CSS
curl -I http://localhost:8000/Verifyr/design-system/design-system.css
# Expected: 200 OK
```

9. **Verify server logs on startup:**
```
✅ Frontend mounted at /frontend from C:\path\to\verifyr - rag\frontend
✅ Verifyr design system mounted at /Verifyr from C:\path\to\verifyr - rag\Verifyr
```

### Success Criteria
- ✅ Server starts without errors
- ✅ Health check passes
- ✅ Query endpoint returns stub response
- ✅ CORS configured correctly
- ✅ Swagger docs accessible
- ✅ Error handling works
- ✅ Frontend accessible at /frontend/
- ✅ Design system CSS loads from /Verifyr/
- ✅ Server logs show both mounts on startup

### Common Issues & Fixes

**Issue:** CORS errors when testing from browser
**Fix:** Verify CORS middleware configured with correct origin

**Issue:** Indexes not loading on startup
**Fix:** Check file paths are correct, files exist

**Issue:** Server crashes on startup
**Fix:** Check import errors, missing dependencies

**Issue:** Frontend returns 404 Not Found
**Fix:** Ensure StaticFiles is imported and /frontend and /Verifyr directories are mounted correctly. Check server logs for mount confirmation messages.

**Issue:** Frontend CSS not loading (design looks broken)
**Fix:** Verify /Verifyr directory is mounted. Check browser console for 404 errors on CSS files. Ensure frontend HTML references CSS as `/Verifyr/design-system/design-system.css`

**Issue:** Path resolution errors (directories not found)
**Fix:** Use `Path(__file__).parent.parent` to get project root, not relative paths

---

## Phase 7: LLM API Integration (Multi-Model Support)

### Objective
Integrate multiple LLM providers for answer generation with citations. Supports Anthropic (Claude) and OpenAI (GPT) models for cost/quality comparisons and evaluation.

### Prompt for Claude Code

```
Integrate LLM API for RAG answer generation with multi-model support.

Requirements:
1. Create backend/generation/llm_client.py
2. RAGGenerator class with configurable model selection:
   - __init__(model_name="claude-sonnet-4.5", api_key=None)
   - Auto-detect provider from model name
   - Supported models:
     * "claude-sonnet-4.5" (Anthropic) - Best quality, $0.024/query
     * "claude-3.5-haiku" (Anthropic) - Fast & cheap, $0.0064/query
     * "gpt-4o" (OpenAI) - High quality, $0.02/query
     * "gpt-4o-mini" (OpenAI) - Very cheap, $0.00108/query
   - Read API keys from environment:
     * ANTHROPIC_API_KEY for Claude models
     * OPENAI_API_KEY for GPT models
   
3. Answer generation logic (same for all models):
   - Format chunks with source markers:
     [Source 1: Product A, manual, Page 5]
     {chunk text}
   - System prompt:
     "You are a product comparison expert for athletes.
     - Compare products objectively using ONLY provided documents
     - Always cite sources using [Product, Document Type, Page X]
     - Match answer length to question complexity:
       * Simple facts: 1-3 sentences
       * Comparisons: 4-6 sentences with key differences
       * Step-by-step guides: Numbered steps, detailed as needed
     - Be concise but complete - include all relevant information
     - State clearly when information is missing"
   - User prompt:
     "Context: {formatted_chunks}
     Question: {query}
     Provide an answer with citations, matching the complexity of the question."
   - max_tokens: 800 for all models
   
4. Model configuration mapping:
   MODEL_CONFIGS = {
       "claude-sonnet-4.5": {
           "provider": "anthropic",
           "model_id": "claude-sonnet-4-20250514",
           "max_tokens": 800
       },
       "claude-3.5-haiku": {
           "provider": "anthropic",
           "model_id": "claude-3-5-haiku-20241022",
           "max_tokens": 800
       },
       "gpt-4o": {
           "provider": "openai",
           "model_id": "gpt-4o",
           "max_tokens": 800
       },
       "gpt-4o-mini": {
           "provider": "openai",
           "model_id": "gpt-4o-mini",
           "max_tokens": 800
       }
   }

5. Response structure:
   {
     "answer": "generated text",
     "sources": [
       {"product": "Product A", "doc_type": "manual", "page": 5, "file": "manual.pdf"}
     ],
     "retrieved_chunks": [...],
     "model_used": "claude-sonnet-4.5",
     "provider": "anthropic",
     "tokens_used": {"input": 4000, "output": 500}
   }
   
6. Methods:
   - _format_context(chunks) - format for LLM
   - _extract_sources(chunks) - structure source metadata
   - _call_anthropic(prompt, max_tokens) - Anthropic API call
   - _call_openai(prompt, max_tokens) - OpenAI API call
   
7. Create test script that tests ALL 4 models with same mock chunks:
   - Verify all API connections work
   - Compare citation quality across models
   - Compare answer quality
   - Track token usage and costs
   - Generate comparison report

Include example with 3 mock chunks from different products/docs.
DO NOT hardcode API keys - read from environment variables.
```

### Your Validation Steps

1. **Install SDKs:**
```bash
pip install anthropic openai
```

2. **Set API keys:**
```bash
# Windows PowerShell
$env:ANTHROPIC_API_KEY='your-anthropic-key'
$env:OPENAI_API_KEY='your-openai-key'

# Linux/Mac
export ANTHROPIC_API_KEY='your-anthropic-key'
export OPENAI_API_KEY='your-openai-key'
```

3. **Test all models:**
```bash
python backend/generation/llm_client.py
```

4. **Validate responses for each model:**
- Does answer reference the mock chunks?
- Are citations formatted correctly? [Product, Type, Page]
- Is source metadata extracted properly?
- Compare quality across models

5. **Test model switching:**
```python
# Test each model
from backend.generation.llm_client import RAGGenerator

models = ["claude-sonnet-4.5", "claude-3.5-haiku", "gpt-4o", "gpt-4o-mini"]

for model in models:
    print(f"\n=== Testing {model} ===")
    generator = RAGGenerator(model_name=model)
    result = generator.generate_answer(query, chunks)
    print(f"Answer: {result['answer']}")
    print(f"Tokens: {result['tokens_used']}")
```

6. **Compare outputs:**
- Citation accuracy per model
- Answer quality per model
- Response time per model
- Cost per model

7. **Cost tracking:**
- Log token usage for each request
- Calculate actual cost per query
- Compare with estimates

### Success Criteria
- ✅ All 4 models work with same codebase
- ✅ Easy model switching via parameter
- ✅ Citations appear in all model responses
- ✅ Sources extracted correctly for all models
- ✅ Token usage tracked and reported
- ✅ Error handling for API failures
- ✅ Comparison report generated

### Common Issues & Fixes

**Issue:** API key not found
**Fix:** Verify environment variables set correctly for both providers

**Issue:** Model name not recognized
**Fix:** Check MODEL_CONFIGS dictionary, use exact model names

**Issue:** Citation format differs between models
**Fix:** Add post-processing to normalize citation format

**Issue:** OpenAI uses different message format
**Fix:** Adapter pattern handles provider-specific formats

**Issue:** Rate limit errors
**Fix:** Add retry logic with exponential backoff for both providers

### Model Selection Guide

For evaluation in Phase 11, test queries with all 4 models:
- **claude-sonnet-4.5**: Baseline (best quality)
- **claude-3.5-haiku**: Cost comparison (73% cheaper)
- **gpt-4o**: OpenAI comparison (similar quality)
- **gpt-4o-mini**: Budget option (95% cheaper)

---

## Phase 8: Connect Full RAG Pipeline

### Objective
Wire complete pipeline from query to answer.

### Prompt for Claude Code

```
Connect the full RAG pipeline to the /query endpoint.

Requirements:
1. Update backend/main.py POST /query endpoint
2. Pipeline flow:
   a. Receive question from request
   b. Run hybrid search (from Phase 5) → get top 5 chunks
   c. Pass chunks to RAGGenerator (from Phase 7)
   d. Get answer with sources
   e. Add metadata:
      - query_id (UUID)
      - response_time_ms (track latency)
   f. Return complete response
3. Add proper error handling:
   - Catch search errors → 500 with message
   - Catch Claude API errors → 500 with message
   - Log errors for debugging
4. Add logging:
   - Log each query received
   - Log retrieval results count
   - Log response time
   - Log errors
5. Response format:
   {
     "answer": "generated text with citations",
     "sources": [
       {"product": "...", "doc_type": "...", "page": N, "file": "..."}
     ],
     "query_id": "uuid",
     "response_time_ms": 1250,
     "chunks_retrieved": 5
   }
6. Add startup event to initialize:
   - HybridSearcher instance
   - RAGGenerator instance
   - Store as app state

Test with real questions and verify end-to-end flow.
```

### Your Validation Steps

1. **Restart server:**
```bash
uvicorn backend.main:app --reload
```

2. **Test with real questions:**
```bash
# Factual query
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question":"What is the battery life of Product A?"}'

# Comparison query
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question":"Which product is more durable for trail running?"}'

# Complex query
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question":"Compare the waterproof ratings and explain which is better for athletes"}'
```

3. **Validate responses:**
- Answer addresses the question?
- Citations are accurate?
- Sources list is populated?
- Response time reasonable? (2-5 seconds)

4. **Test error scenarios:**
```bash
# Gibberish question
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question":"asdfasdfasdf"}'
```
Should return graceful "no information found" response

5. **Check logs:**
- Query logged?
- Retrieval count logged?
- Response time logged?
- Any errors logged properly?

6. **Performance check:**
- Multiple queries in succession
- Response time consistent?
- No memory leaks?

### Success Criteria
- ✅ End-to-end query flow works
- ✅ Answers are relevant and cited
- ✅ Sources are accurate
- ✅ Response times acceptable
- ✅ Error handling works
- ✅ Logging provides useful info

### Common Issues & Fixes

**Issue:** Slow response times (>10s)
**Fix:** Check if indexes loading on each query (should be once at startup)

**Issue:** Generic answers without citations
**Fix:** Verify chunks are being passed to LLM correctly

**Issue:** Sources don't match answer
**Fix:** Check source extraction logic

---

## Phase 9: Frontend Chat Interface

### Objective
Build simple web UI for user interaction using the Verifyr design system for consistency with the landing page.

### Prompt for Claude Code

```
Create a simple HTML/JavaScript frontend for the RAG chatbot using the Verifyr design system.

Requirements:

1. Design System Integration:
   - Import the Verifyr design system: ../Verifyr/design-system/design-system.css
   - Use design tokens for colors, typography, spacing, shadows, borders
   - Reuse existing components (buttons, cards, forms, modals) where applicable
   - Apply existing animations (fadeInUp, slideUp, spin) for message transitions
   - Maintain visual consistency with landing page design

2. frontend/index.html:
   - Import design system CSS first, then chat-specific styles
   - Clean, centered layout using design system containers
   - Header: "Verifyr - Product Comparison Assistant" (use --font-display for heading)
   - Chat container (scrollable) using .content-container pattern
   - Input area at bottom:
     * Text input field (placeholder: "Ask about product features...")
     * Send button using .submit-btn class
   - Footer with note about data sources
   - Welcome message on initial load (from user story 2.1.1)

3. frontend/app.js:
   - sendMessage() function:
     * Get input value
     * Validate non-empty
     * Show user message in chat
     * Show loading indicator (use .loading class from design system)
     * POST to http://localhost:8000/query
     * Display assistant response
     * Show sources below answer
     * Hide loading
     * Clear input
     * Scroll to bottom
   - displayUserMessage(text)
   - displayAssistantMessage(answer, sources)
   - displayError(message) - use .form-message.error styling
   - Handle Enter key to send
   - Optional: Quick-reply button handlers (user story 2.1.2)

4. frontend/styles.css (chat-specific overrides):
   - Use design system CSS variables:
     * --primary-blue for user message bubbles
     * --light-gray for assistant message bubbles
     * --dark, --gray for text colors
     * --spacing-* for padding/margins
     * --radius-md for bubble border radius
     * --shadow-card for message elevation
   - Chat bubbles:
     * User: right-aligned, --primary-blue background, white text
     * Assistant: left-aligned, --light-gray background, --dark text
     * Both use --radius-md border radius
     * Animation: slideUp from design system
   - Source cards: small, below answer
     * Use --font-size-sm for citation text
     * Style similar to .trust-benefit cards
     * Border-left: 3px solid --primary-blue
   - Loading animation: use existing .loading class with spin animation
   - Quick-reply buttons (optional):
     * Style similar to .lang-option pattern
     * Use --light-gray background, hover to --primary-blue
     * Apply --transition-all for smooth interactions
   - Mobile-responsive using design system breakpoints
   - Max width: use --max-width-content (1000px) centered
   - Chat input area: use .email-form pattern as reference

5. Features:
   - Chat history stays visible
   - Auto-scroll to latest message
   - Loading state during API call (use .loading spinner)
   - Error messages displayed using .form-message.error styling
   - Sources displayed as cards:
     * Product name (bold, --font-weight-semibold)
     * Document type + page number
     * Use --gray color for secondary text
   - Welcome message on load (German/English):
     "Hallo! Wie kann ich dir helfen? Ich helfe dir gerne bei allen Fragen zu den Produkten. Was möchtest du wissen?"
     "Hello! How can I help you? I'm happy to help with all questions about products. What would you like to know?"
   - Optional: Quick-reply buttons for common questions (3-5 buttons)

6. Design System Components to Reuse:
   - Buttons: .submit-btn, .submit-btn:disabled, .submit-btn:hover
   - Forms: .email-input pattern for chat input
   - Cards: .comparison-card or .trust-benefit patterns for source citations
   - Animations: fadeInUp, slideUp, spin (from keyframes.css)
   - Transitions: --transition-all, --transition-opacity
   - Containers: .content-container for chat area
   - Typography: Use --font-primary for body, --font-display for headings

Keep design minimal and clean, but ensure it matches the Verifyr design system aesthetic.
Focus on functionality while maintaining visual consistency with landing page.
Test by serving with: python -m http.server 3000
```

### Your Validation Steps

1. **Start frontend server:**
```bash
cd frontend
python -m http.server 3000
```

2. **Open browser:**
- Navigate to `http://localhost:3000`
- Interface should load
- Verify design system is imported correctly (check styles match landing page)

3. **Design System Check:**
- Colors match landing page (--primary-blue, --light-gray, etc.)
- Typography uses correct fonts (DM Sans, Sora)
- Spacing and borders consistent with design system
- Animations work smoothly (message fade-in, button hover)
- Responsive breakpoints work correctly

4. **Test chat flow:**
- Type question: "What is the battery life?"
- Click Send (verify button uses .submit-btn styling)
- Watch for:
  * User message appears (right side, blue bubble)
  * Loading indicator shows (spinner animation)
  * Assistant response appears (left side, gray bubble)
  * Sources displayed below answer (styled like cards)
  * Input cleared and ready
  * Animations smooth (slideUp effect)

5. **Test multiple queries:**
- Ask 3-4 questions in succession
- Chat history preserved?
- Auto-scroll working?
- No UI glitches?
- Design consistency maintained?

6. **Test edge cases:**
- Empty input (should not send, button disabled)
- Very long question
- Special characters in query
- Backend down (error message using .form-message.error)
- Loading state during API call

7. **Mobile check:**
- Resize browser window
- Does layout adapt? (check breakpoints)
- Is text readable?
- Touch interactions work?

8. **User experience:**
- Is flow intuitive?
- Loading feedback clear?
- Sources easy to read?
- Design matches landing page aesthetic?
- Animations feel polished?

9. **Design System Integration:**
- All colors use CSS variables (--primary-blue, etc.)?
- Typography consistent with landing page?
- Components reuse design system classes?
- Animations use design system keyframes?
- Responsive behavior matches design system breakpoints?

### Success Criteria
- ✅ Chat interface loads correctly
- ✅ Design system integrated (styles match landing page)
- ✅ Messages send and display
- ✅ Sources render properly (styled as cards)
- ✅ Loading states work (using .loading spinner)
- ✅ Error handling works (using .form-message.error)
- ✅ Mobile-responsive (using design system breakpoints)
- ✅ Animations smooth (using design system keyframes)
- ✅ Visual consistency with Verifyr landing page
- ✅ Design tokens used throughout (no hardcoded colors/sizes)
- ✅ Components reuse design system classes where applicable
- ✅ Error handling displays nicely
- ✅ Mobile-responsive layout

### Common Issues & Fixes

**Issue:** CORS error in browser console
**Fix:** Verify backend CORS settings allow localhost:3000

**Issue:** Sources not displaying
**Fix:** Check JavaScript parsing of response.sources array

**Issue:** Chat doesn't scroll
**Fix:** Add scroll-to-bottom after message display

**Issue:** Send button doesn't work
**Fix:** Check JavaScript event listener attached correctly

---

## Phase 10: Chat History Storage with Conversation Management

### Objective
Add conversation history storage for context-aware follow-up responses, message persistence across page reloads, conversation management UI with sidebar, and backend storage for evaluations.

### Prompt for Claude Code

```
Add conversation history storage and conversation management sidebar to the RAG chat interface.

Requirements:

1. Backend Changes (backend/main.py):
   - Add to QueryRequest model:
     * conversation_history: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="Previous messages: [{'role': 'user', 'content': '...'}, {'role': 'assistant', 'content': '...'}]")
     * conversation_id: Optional[str] = Field(default=None, description="Conversation ID for tracking")
   - Update /query endpoint:
     * Pass conversation_history to generate_answer()
     * Save conversations to data/conversations/{conversation_id}.json if conversation_id provided
     * Wrap storage in try/except - failures don't affect query response
   - Add new endpoints:
     * GET /conversations/{conversation_id} - Get conversation by ID
     * GET /conversations - List all conversation IDs
   - Create data/conversations/ directory at startup (with error handling)

2. Backend LLM Client Changes (backend/generation/llm_client.py):
   - Update generate_answer() signature: add conversation_history: Optional[List[Dict[str, str]]] = None
   - Refactor _call_anthropic() to accept messages: List[Dict[str, str]] parameter
   - Refactor _call_openai() to accept messages: List[Dict[str, str]] parameter
   - Build messages array with:
     * Conversation history (limit to last 10 messages: 5 user + 5 assistant)
     * Current query with context formatted as before
   - If history is empty, use single-message format (maintains current behavior)

3. Frontend Conversation Storage (frontend/app.js):
   - Change localStorage structure to support multiple conversations:
     * Key: 'verifyr_conversations' - object mapping conversation_id → conversation data
     * Key: 'verifyr_active_conversation_id' - current conversation ID
     * Key: 'verifyr_conversations_list' - array of conversation IDs for easy sorting
   - Each conversation object contains:
     * id: string
     * title: string (first user message, truncated to 40 chars)
     * messages: array of message objects
     * createdAt: ISO timestamp
     * updatedAt: ISO timestamp
   - Functions needed:
     * saveConversation() - save current conversation to localStorage
     * loadConversation(conversationId) - load conversation by ID
     * createNewConversation() - create new conversation, clear chat area
     * listConversations() - get all conversations sorted by updatedAt
     * deleteConversation(conversationId) - optional: delete conversation
   - On page load:
     * Load conversation list
     * If active_conversation_id exists, load that conversation
     * Otherwise show welcome message
   - When sending messages:
     * Save to current conversation
     * Update conversation's updatedAt timestamp
     * Send conversation_history to API (format: array of {role, content} objects)

4. Frontend Conversation Sidebar UI (frontend/index.html and frontend/styles.css):
   - Add sidebar container:
     * Position: Fixed or sliding panel on left side (250-300px wide on desktop)
     * Background: Use design system --light-gray
     * Show/hide toggle button in header (☰ menu icon)
   - Sidebar content:
     * "New Conversation" button at top (prominent, uses .submit-btn styling)
     * Divider line
     * Scrollable conversation list
   - Conversation list items:
     * Display conversation title (truncated first message)
     * Display timestamp ("2h ago", "Yesterday", "3d ago" format)
     * Highlight active conversation (different background color)
     * Click to load conversation
     * Optional: Delete button (trash icon) on hover
   - Responsive behavior:
     * Desktop: Sidebar can be toggled visible/hidden
     * Mobile: Sidebar as overlay/modal (slides in from left when opened)
   - Styling:
     * Use design system tokens for colors, spacing, typography
     * Smooth transitions for sidebar show/hide
     * Hover effects on conversation items

5. Error Handling:
   - All localStorage operations wrapped in try/catch
   - If localStorage fails, app continues (sends empty conversation_history)
   - Backend storage failures logged but don't affect API response
   - Corrupt data: Clear and show welcome message

Test: Create multiple conversations, switch between them, verify history persists on page reload.
```

### Your Validation Steps

1. **Test backend API changes:**
```bash
# Test with conversation history
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Which is better?",
    "conversation_history": [
      {"role": "user", "content": "What is the battery life?"},
      {"role": "assistant", "content": "The Apple Watch has 18 hours..."}
    ],
    "conversation_id": "test_conv_123"
  }'
```

2. **Test conversation storage:**
```bash
# List conversations
curl http://localhost:8000/conversations

# Get specific conversation
curl http://localhost:8000/conversations/test_conv_123
```

3. **Test frontend conversation management:**
   - Open chat interface
   - Start a conversation (ask a question)
   - Click "New Conversation" button
   - Verify chat area clears and new conversation starts
   - Ask question in new conversation
   - Click previous conversation in sidebar
   - Verify previous messages load
   - Refresh page
   - Verify conversations persist and active conversation loads

4. **Test follow-up responses:**
   - Start conversation: "What is the battery life?"
   - Ask follow-up: "Which is better?"
   - Verify response understands context from first question
   - Check that conversation history is sent to backend

5. **Test error scenarios:**
   - Disable localStorage in browser dev tools
   - Verify app still works (sends empty history)
   - Test with corrupted localStorage data
   - Verify graceful fallback

6. **Test sidebar UI:**
   - Toggle sidebar visibility (desktop)
   - Create 5+ conversations
   - Verify list scrolls correctly
   - Test active conversation highlighting
   - Test mobile overlay behavior (resize window)

### Success Criteria
- ✅ Backend accepts conversation_history and stores conversations
- ✅ LLM uses conversation history for context-aware responses
- ✅ Frontend stores multiple conversations in localStorage
- ✅ Conversation sidebar displays list of conversations
- ✅ Users can switch between conversations
- ✅ Users can create new conversations
- ✅ Conversations persist across page reloads
- ✅ Follow-up questions work with context
- ✅ Error handling prevents storage failures from breaking queries
- ✅ Sidebar is responsive (works on mobile)

### Common Issues & Fixes

**Issue:** Conversation history not improving responses
**Fix:** Verify history is formatted correctly (role/content structure), check LLM API receives messages array

**Issue:** Sidebar not showing conversations
**Fix:** Check localStorage structure, verify conversation list is being loaded correctly

**Issue:** Conversations lost on page reload
**Fix:** Verify saveConversation() is called after each message, check localStorage is not being cleared

**Issue:** Token limit exceeded with long conversations
**Fix:** History is limited to last 10 messages, but verify this is working correctly

**Issue:** Sidebar breaks layout on mobile
**Fix:** Use overlay/modal pattern for mobile instead of fixed sidebar

---

## Phase 11: Evaluation Framework with Langfuse

### Objective
Build systematic testing and metrics collection using Langfuse for observability and evaluation, running locally via Docker.

### Prompt for Claude Code

```
Set up Langfuse for RAG system evaluation and observability, running locally via Docker.

Requirements:

1. Create docker-compose.yml in project root:
   - Langfuse service (ports 3000:3000)
   - PostgreSQL database for Langfuse
   - Redis for caching
   - Persistent volumes for data
   - Environment variables for configuration
   - Health checks for services

2. Create tests/test_cases.py:
   - Create TEST_CASES list with 15 test questions:
   
   Factual (5 questions):
   - "What is the battery life of the Apple Watch Series 11?" (en)
   - "Wie lange hält der Akku der Garmin Forerunner 970?" (de)
   - "What waterproof rating does the Apple Watch Series 11 have?" (en)
   - "Welches Gewicht hat die Garmin Forerunner 970?" (de)
   - "What materials is the Apple Watch Series 11 made from?" (en)
   
   Comparison (5 questions):
   - "Which watch has better battery life, Apple Watch Series 11 or Garmin Forerunner 970?" (en)
   - "Welche Uhr ist leichter?" (de)
   - "Compare the waterproof ratings of both watches" (en)
   - "Welche ist haltbarer für Trailrunning?" (de)
   - "Which offers better value for money, Apple Watch or Garmin?" (en)
   
   Complex (5 questions):
   - "Which product is better for marathon training and why?" (en)
   - "How do I set up GPS tracking on my Garmin Forerunner 970?" (en - post-purchase)
   - "Was bedeutet IP67 Wasserschutz für meine Nutzung beim Schwimmen?" (de - technical translation)
   - "I'm having trouble syncing my Apple Watch Series 11. How do I troubleshoot this?" (en - post-purchase troubleshooting)
   - "How do the products compare for outdoor use? What does GPS accuracy mean for trail running?" (en - technical translation)
   
   Each test case should be structured as a dict with:
   - question (string)
   - category (factual/comparison/complex)
   - language (string) - "en" or "de"

3. Update backend/main.py to integrate Langfuse:
   - Install langfuse package (add to requirements)
   - Initialize Langfuse client pointing to http://localhost:3000
   - Add tracing to /query endpoint:
     * Wrap query execution with langfuse.trace()
     * Create span for retrieval step (hybrid search)
     * Create generation span for LLM call
     * Log tokens, costs, latency automatically
   - Add environment variables:
     * LANGFUSE_SECRET_KEY
     * LANGFUSE_PUBLIC_KEY
     * LANGFUSE_HOST (default: http://localhost:3000)

4. Create tests/langfuse_evaluator.py:
   - Script to run batch evaluation:
     * Connect to Langfuse API
     * Create evaluation dataset with test cases from test_cases.py
     * Run each test case through /query endpoint
     * Use Langfuse to collect traces and metrics
     * Optional: Use RAGAS metrics via Langfuse integration
   - Script should:
     * Print progress to console
     * Generate summary report
     * Link to Langfuse dashboard for detailed analysis

5. Create .env.example:
   - Add Langfuse configuration variables
   - Document required API keys

6. Update documentation:
   - Add Langfuse setup instructions
   - Explain how to access dashboard (http://localhost:3000)
   - Document evaluation workflow

Use Langfuse's built-in evaluation features and RAGAS integration for metrics.
```

### Your Validation Steps

1. **Start Langfuse locally:**
```bash
# Start Docker services
docker-compose up -d

# Wait for services to be ready (30-60 seconds)
# Check logs: docker-compose logs -f langfuse
```

2. **Access Langfuse Dashboard:**
- Navigate to `http://localhost:3000` in browser
- Create admin account (first-time setup)
- Go to Settings → API Keys
- Copy Public Key and Secret Key
- Add to your `.env` file:
  ```
  LANGFUSE_PUBLIC_KEY=your-public-key
  LANGFUSE_SECRET_KEY=your-secret-key
  LANGFUSE_HOST=http://localhost:3000
  ```

3. **Install dependencies:**
```bash
pip install langfuse
```

4. **Test integration:**
```bash
# Start your FastAPI server
python backend/main.py
# Or: .\manage_server.ps1 -Action start

# Make a test query
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question":"What is the battery life of the Apple Watch Series 11?"}'
```

5. **Verify tracing in dashboard:**
- Open `http://localhost:3000`
- Go to "Traces" section
- You should see the query trace with:
  * Retrieval span (with chunks retrieved)
  * Generation span (with LLM call details)
  * Tokens, cost, latency automatically tracked

6. **Create evaluation dataset:**
```bash
# Run evaluation script
python tests/langfuse_evaluator.py
```
This should:
- Create dataset in Langfuse
- Run all 15 test cases
- Collect traces for each

7. **View evaluation results:**
- Go to Langfuse dashboard → "Datasets"
- Click on your evaluation dataset
- View results for each test case
- Check metrics (latency, tokens, cost)
- Filter by category (factual/comparison/complex)

8. **Run batch evaluation (optional):**
- Use Langfuse's evaluation features
- Integrate RAGAS metrics if desired
- Compare different models or prompts

9. **Check metrics in dashboard:**
- Go to "Analytics" section
- View aggregate metrics:
  * Average latency
  * Total cost
  * Token usage
  * Success rate

### Success Criteria
- ✅ Langfuse running locally on Docker
- ✅ Dashboard accessible at http://localhost:3000
- ✅ Traces being collected for all queries
- ✅ Evaluation dataset created with 15 test cases
- ✅ All test cases executed and traced
- ✅ Metrics visible in dashboard
- ✅ Can compare different runs/versions

### Common Issues & Fixes

**Issue:** Docker compose fails to start
**Fix:** 
- Check Docker Desktop is running
- Verify ports 3000, 5432 (PostgreSQL) are not in use
- Check docker-compose.yml syntax
- Review logs: `docker-compose logs`

**Issue:** Cannot connect to Langfuse from Python
**Fix:**
- Verify Langfuse is running: `docker-compose ps`
- Check LANGFUSE_HOST in .env (should be http://localhost:3000)
- Verify API keys are correct in dashboard settings

**Issue:** Traces not appearing in dashboard
**Fix:**
- Check API keys are set correctly
- Verify network connectivity (localhost:3000)
- Check backend logs for Langfuse errors
- Ensure langfuse package is installed correctly

**Issue:** Dashboard shows "Service Unavailable"
**Fix:**
- Check all Docker services are running: `docker-compose ps`
- Wait for full startup (PostgreSQL needs time)
- Check logs: `docker-compose logs langfuse`
- Verify database connection in logs

**Issue:** Evaluation script fails
**Fix:**
- Verify test_cases.py exists with correct structure
- Check API keys are loaded from .env
- Ensure FastAPI server is running
- Check that /query endpoint works independently

### Langfuse Dashboard Features

Once set up, you can use:
- **Traces**: View detailed pipeline execution for each query
- **Analytics**: Aggregate metrics (cost, latency, tokens)
- **Datasets**: Manage evaluation test cases
- **Evaluations**: Run batch evaluations
- **Prompts**: Version and manage your prompts
- **Scores**: Track custom evaluation scores
- **Search**: Search through all queries

### Evaluation Metrics Available

Langfuse provides:
- **Automatic**: Latency, tokens, cost per query
- **RAGAS Integration**: Faithfulness, answer relevance, context precision
- **Custom Scores**: Add your own evaluation metrics
- **LLM-as-Judge**: Use LLM to evaluate answer quality
- **Comparison**: Compare different models/prompts side-by-side

---

## 🎯 Next Steps After Phase 11

Once all phases complete:

### Iteration Loop
1. Review eval results
2. Identify lowest-scoring areas
3. Hypothesize improvements:
   - Adjust chunk size?
   - Different embedding model?
   - Better prompts?
   - Reranking layer?
4. Implement change
5. Re-run evaluation
6. Compare metrics
7. Keep if improved

### Production Preparation
- Add authentication
- Implement rate limiting
- Set up monitoring/logging
- Add caching for common queries
- Optimize for latency
- Deploy to cloud server

### Feature Enhancements
- Multi-turn conversations
- Filter by product/doc type
- Thumbs up/down feedback
- Export chat history
- Add more products
- PDF upload for new products

---

## 📋 Development Checklist

Use this to track your progress:

- [ ] Phase 0: Foundation Setup
- [ ] Phase 1: PDF Extraction
- [ ] Phase 2: Text Chunking
- [ ] Phase 3: Vector Embeddings
- [ ] Phase 4: BM25 Index
- [ ] Phase 5: Hybrid Search
- [ ] Phase 6: FastAPI Backend
- [ ] Phase 7: Claude Integration
- [ ] Phase 8: Full Pipeline
- [ ] Phase 9: Frontend UI
- [ ] Phase 10: Chat History Storage
- [ ] Phase 11: Evaluation

---

## 🚨 Important Reminders

1. **Test before moving forward**: Don't skip validation steps
2. **One phase at a time**: Complete fully before next phase
3. **Share errors with Claude**: Copy full error messages
4. **Ask for explanations**: Understand the code generated
5. **Commit working code**: Use git after each successful phase
6. **Document decisions**: Note what works and what doesn't
7. **Iterate on quality**: After basics work, improve prompts/retrieval
8. **Keep it simple**: Don't over-engineer early

---

## 📞 Getting Help

**If stuck on a phase:**
1. Share the specific error with Claude Code
2. Show what you've tried
3. Describe expected vs actual behavior
4. Ask for debugging suggestions

**If quality is poor:**
1. Share eval results with Claude
2. Show example queries that fail
3. Ask for specific improvements
4. Test changes systematically

**If confused about architecture:**
1. Ask Claude to explain the component
2. Request diagrams or examples
3. Break down into smaller pieces

---

## 🎉 Success Metrics

You'll know the system works when:
- ✅ Can query via web interface
- ✅ Answers cite specific sources
- ✅ Response time < 5 seconds
- ✅ Hit Rate @ 5 > 80%
- ✅ Users can compare products meaningfully
- ✅ Sources are accurate and traceable

**Now go build it! Start with Phase 1.**
