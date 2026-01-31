# CLAUDE.md

Guidance for Claude Code when working with the Verifyr RAG system.

## Project Overview

**Verifyr** is a health-tech product conversational AI comparison assistant (wearables: smartwatches, fitness trackers, rings) using RAG to provide neutral, source-backed recommendations and QA support. The project helps users make confident purchasing decisions through neutral, source-backed product recommendations and a QA chatbot for both pre-purchase and post-purchase support.

**Tech Stack:** FastAPI (Python) | Qdrant (vector DB) | BM25 (keyword search) | Claude Sonnet 4.5 | sentence-transformers (German-optimized) | Langfuse v3 (observability)

**Current Phase:** Phase 11-12 - Evaluation & Quality (Langfuse observability + comprehensive RAGAS metrics)

## Critical Gotchas

### 1. Always Use Virtual Environment
```powershell
# NEVER use system Python - always use venv
.\venv\Scripts\python.exe script.py

# Or activate first for multiple commands
.\venv\Scripts\Activate.ps1
python script.py
```

### 2. Qdrant Database Locks
```powershell
# ALWAYS kill server before running indexing scripts
.\manage_server.ps1 -Action kill

# Then run indexing
.\venv\Scripts\python.exe backend/indexing/vector_store.py
```

### 3. OneDrive Auto-Sync Issues
- Can cause Live Server constant refreshing
- Use PowerShell server or `.vscode/settings.json` exclusions

### 4. API Keys
- Never commit API keys
- Use environment variables: `ANTHROPIC_API_KEY`

## Quick Commands

### Server Management
```powershell
# Status check
.\manage_server.ps1 -Action status

# Start server (runs at http://0.0.0.0:8000)
.\manage_server.ps1 -Action start

# Kill all Python processes (releases Qdrant locks)
.\manage_server.ps1 -Action kill

# Restart (kill + start)
.\manage_server.ps1 -Action restart
```

### Access Points
- Landing Page: `http://localhost:8000/`
- Chat Interface: `http://localhost:8000/chat.html`
- API Docs: `http://localhost:8000/docs`
- Query Endpoint: `POST http://localhost:8000/query`

### Run Pipeline Components
```powershell
# Kill server first!
.\manage_server.ps1 -Action kill

# Indexing pipeline
.\venv\Scripts\python.exe backend/ingestion/pdf_processor.py
.\venv\Scripts\python.exe backend/ingestion/chunker.py
.\venv\Scripts\python.exe backend/indexing/vector_store.py
.\venv\Scripts\python.exe backend/indexing/bm25_index.py

# Evaluation (Phase 11)
.\venv\Scripts\python.exe tests/langfuse_evaluator.py

# Evaluation (Phase 12 - TBD)
# .\venv\Scripts\python.exe tests/evaluator_complete.py
```

## Key Architecture

### RAG Pipeline
1. **Offline Indexing:** PDFs → Text Extraction → Chunking (800 tokens, 200 overlap) → Dual Index (Qdrant + BM25)
2. **Query-Time Retrieval:** Hybrid Search (BM25 + Vector) → RRF Fusion → Top-5 chunks
3. **Generation:** Context Formatting → Claude Sonnet 4.5 → Answer + Citations

### FastAPI Backend Structure
```python
# backend/main.py serves:
# 1. REST API: /health, /query, /products, /conversations
# 2. Frontend (landing + chat): / (static files)

# Frontend mounted at root after all API routes
app.mount("/", StaticFiles(directory=str(frontend_path), html=True))
```

### Data Organization
```
data/
├── raw/                    # PDFs by product + sources.json
├── processed/              # chunks.json, bm25_index.pkl
└── qdrant_storage/         # Vector DB
```

## Key Design Decisions

### Chunking & Embeddings
- **Chunk Size:** 800 tokens, 200 overlap
- **Embedding Model:** paraphrase-multilingual-MiniLM-L12-v2 (384 dims, German-optimized)
- **Distance Metric:** Cosine similarity

### Retrieval & Generation
- **Strategy:** Hybrid (BM25 + Vector) with RRF fusion
- **Top-K:** 5 chunks
- **LLM:** Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)
- **Max Tokens:** 800 (flexible for facts, comparisons, guides)

### Citation Format
Answers MUST cite sources: `[Product Name, Document Type, Page X]`

Example: "The Apple Watch Series 11 has 18 hours of battery life [Apple Watch Series 11, Manual, Page 5]."

### Chunk Metadata
Each chunk includes: `chunk_id`, `product_name`, `doc_type`, `page_num`, `source_file`, `source_url` (optional), `source_name` (optional), `chunk_index`, `text`

## Evaluation Targets (Phase 12)

**Retrieval:** Hit Rate @ 5 (>85%) | MRR (>0.7) | Precision @ 5 (>0.6)

**RAGAS:** Faithfulness (>0.95) | Answer Relevancy (>0.85) | Context Relevancy (>0.7)

**Custom:** Citation Quality (>0.85) | Helpfulness (>0.8)

**Performance:** Response time <5s | Cost tracking

**Implementation:** Langfuse Experiment Runner with `@observe` decorator and `dataset.run_experiment()` pattern

## Development Phase

**Status:** Phase 11-12 (Evaluation & Quality)
- Phase 11: Langfuse observability (tracing, basic metrics) - 15 test cases
- Phase 12: Comprehensive evaluation (RAGAS + retrieval metrics) - 50→75→150 cases over 3 months

**Test Dataset:** 60% German, 40% English

See `docs/03-development/dev-phases.md` for full 13-phase roadmap.

## File Structure Reference

```
verifyr - rag/
├── backend/                # FastAPI + RAG pipeline
│   ├── ingestion/          # PDF processing, chunking
│   ├── indexing/           # BM25, vector store
│   ├── retrieval/          # Hybrid search
│   ├── generation/         # Claude API integration
│   └── main.py             # FastAPI app
├── frontend/               # Landing page, chat UI, design system
│   ├── index.html          # Landing page
│   ├── chat.html           # Chat interface
│   ├── app.js              # Chat JavaScript
│   ├── styles.css          # Chat styles
│   └── design-system/      # Design tokens & components
├── docs/                   # Centralized documentation (see docs/README.md)
│   ├── 01-product/         # Product vision, competitors, KPIs
│   ├── 02-architecture/    # System design, pipelines
│   ├── 03-development/     # Dev phases, sprints, testing
│   ├── 04-operations/      # Server management, VPS guides
│   └── 05-features/        # Feature plans & specs
├── data/                   # PDFs, chunks, indices
├── tests/                  # Evaluation framework
└── manage_server.ps1       # Server helper script
```

## Coding Patterns to Follow

1. **Modularity:** Each pipeline component is independent and testable
2. **Observability:** Log intermediate outputs at each stage
3. **Error Handling:**
   - Empty query → 400 Bad Request
   - No results → 200 with "No information found"
   - Qdrant fail → 503 Service Unavailable
   - Claude timeout → 504 Gateway Timeout
4. **Source Transparency:** Every answer traces to specific documents

## Detailed Documentation

**For comprehensive guides, see:**
- Documentation hub & navigation: `docs/README.md`
- Server management, venv setup, Python paths: `docs/04-operations/server-management.md`
- Full architecture, layer structure: `docs/02-architecture/tech-architecture.md`
- 13-phase development guide: `docs/03-development/dev-phases.md`
- Pipeline architecture (9 stages): `docs/02-architecture/pipelines/README.md`
- Design system (colors, tokens, components): `frontend/design-system/README.md`
- Product vision, USPs, target audience: `docs/01-product/product-vision.md`
- Competitive analysis: `docs/01-product/competitors-analysis.md`
- QA chatbot user stories: `docs/01-product/qa-chatbot-backlog.md`
