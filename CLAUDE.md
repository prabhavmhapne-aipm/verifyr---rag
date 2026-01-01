# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Verifyr** is a conversational AI assistant for health-tech product comparison, specifically targeting wearables (smartwatches, fitness trackers, health rings). The project helps users make confident purchasing decisions through neutral, source-backed product recommendations and a QA chatbot for both pre-purchase and post-purchase support.

**Tech Stack:**
- Backend: FastAPI (Python)
- Frontend: HTML/JavaScript with custom design system
- Vector DB: Qdrant (embedded mode)
- Keyword Search: BM25
- LLM: Claude Sonnet 4.5 / GPT-4o / GPT-4o Mini
- Embeddings: sentence-transformers (paraphrase-multilingual-MiniLM-L12-v2, optimized for German)
- Observability: Langfuse v3 (Docker) - Tracing, evaluation, and metrics tracking

## Project Structure

```
verifyr - rag/
├── backend/                    # FastAPI backend (Phases 1-9 complete)
│   ├── ingestion/              # PDF processing and chunking
│   ├── indexing/               # BM25 and vector store indexing
│   ├── retrieval/              # Hybrid search implementation
│   ├── generation/             # Claude API LLM integration
│   └── main.py                 # FastAPI app with static file serving
├── frontend/                   # Chat interface (served by FastAPI)
│   ├── index.html              # Chat UI
│   ├── app.js                  # JavaScript client
│   └── styles.css              # Chat-specific styles
├── Verifyr/                    # Frontend landing page & design system
│   ├── design-system/          # Custom design system (served by FastAPI)
│   ├── images/                 # Favicon and icons
│   ├── index.html              # Landing page
│   └── LOCAL-SERVER-README.md  # Instructions for running frontend locally
├── data/                       # RAG data storage
│   ├── raw/                    # Original PDFs with sources.json
│   ├── processed/              # Extracted text, chunks, BM25 index
│   └── qdrant_storage/         # Vector database storage
├── tests/                      # Evaluation framework (Phase 10)
│   ├── test_cases.py           # Test questions
│   └── evaluator.py            # Metrics and evaluation
├── Product-strategy/           # Product documentation and architecture
│   ├── pipelines/              # RAG pipeline documentation
│   ├── tech-architecture.md    # System architecture overview
│   ├── system-design-principles.md
│   └── dev_phases.md           # 10-phase development guide
├── manage_server.ps1           # Server management helper script
├── SERVER_MANAGEMENT.md        # Server management guide
├── Product.md                  # Product vision, USPs, target audience
├── Competitors.md              # Competitive analysis
└── QA-Chatbot-Backlog.md      # User stories for chatbot features
```

## Server Management Helper Script

**Quick Commands** (using `manage_server.ps1`):
```powershell
# Check if server is running
.\manage_server.ps1 -Action status

# Kill all Python processes (releases Qdrant locks)
.\manage_server.ps1 -Action kill

# Start the server
.\manage_server.ps1 -Action start

# Restart server (kill + start fresh)
.\manage_server.ps1 -Action restart
```

**Important**: Always run `kill` action before running indexing scripts to avoid Qdrant database locks. See `SERVER_MANAGEMENT.md` for detailed guide.

## Development Commands

### Backend (RAG System)
The full RAG system is implemented with FastAPI backend serving both the API and frontend.

**Start the FastAPI server:**
```bash
# Option 1: Using manage_server.ps1 (Recommended)
.\manage_server.ps1 -Action start
# Server runs at http://0.0.0.0:8000

# Option 2: Direct uvicorn command
cd backend
python main.py
# Or: uvicorn main:app --reload --port 8000
```

**Access points:**
- API Documentation: `http://localhost:8000/docs`
- Frontend Chat Interface: `http://localhost:8000/frontend/`
- Landing Page: `http://localhost:8000/Verifyr/` (or use standalone servers)
- Health Check: `http://localhost:8000/health`
- Query Endpoint: `POST http://localhost:8000/query`

**Important:** The FastAPI backend serves:
1. REST API endpoints at root (`/health`, `/query`, `/products`)
2. Chat frontend as static files at `/frontend/`
3. Verifyr design system CSS at `/Verifyr/design-system/`

This configuration is set in `backend/main.py` lines 94-110:
```python
# Mount frontend static files
project_root = Path(__file__).parent.parent
frontend_path = project_root / "frontend"
verifyr_path = project_root / "Verifyr"

app.mount("/frontend", StaticFiles(directory=str(frontend_path), html=True), name="frontend")
app.mount("/Verifyr", StaticFiles(directory=str(verifyr_path)), name="verifyr")
```

**Run individual pipeline components:**
```bash
# IMPORTANT: Kill server first to avoid Qdrant locks
.\manage_server.ps1 -Action kill

# Then run indexing scripts
python backend/ingestion/pdf_processor.py
python backend/ingestion/chunker.py
python backend/indexing/vector_store.py
python backend/indexing/bm25_index.py

# Run evaluation
python tests/evaluator.py
```

### Frontend (Landing Page - Standalone)
For standalone frontend development (landing page only) from the `Verifyr/` directory:

**Option 1: VS Code Live Server**
1. Install "Live Server" extension (by Ritwick Dey) in VS Code/Cursor
2. Right-click on `index.html`
3. Select "Open with Live Server"
4. Opens at `http://127.0.0.1:5500`

**Option 2: PowerShell Server**
```powershell
cd Verifyr
.\start-server.ps1
# Opens at http://localhost:8000
```

**Note:** For the full chat interface, use the FastAPI backend at `http://localhost:8000/frontend/` instead.

## Architecture Overview

### RAG System Design (Implemented)

The system uses a **traditional RAG architecture** with three main pipelines:

#### Pipeline 1: Offline Indexing (Build Once, Update Periodically)
**Flow:** Raw PDFs → Text Extraction → Chunking → Embedding Generation → Dual Index Storage (Vector DB + BM25)

**Key Components:**
- PDF text extraction with PyMuPDF (fallback to Tesseract OCR)
- Chunking with LangChain RecursiveCharacterTextSplitter (800 tokens, 200 overlap)
- Vector embeddings using sentence-transformers
- Dual indexing: Qdrant for semantic search + BM25 for keyword search

#### Pipeline 2: Query-Time Retrieval (Per User Query)
**Flow:** User Query → Query Processing → Hybrid Search (BM25 + Vector) → Result Fusion (RRF) → Top-K Chunks

**Key Components:**
- Hybrid search combining BM25 and vector search
- Reciprocal Rank Fusion (RRF) for result merging
- Top-5 chunk retrieval by default

#### Pipeline 3: Generation (Per User Query)
**Flow:** User Query + Retrieved Chunks → Context Formatting → Claude API Call → Answer + Citations

**Key Components:**
- Source-attributed context formatting
- Claude Sonnet 4.5 for answer generation
- Citation extraction and verification
- Response structure includes sources, query_id, response_time_ms

#### Supporting Pipeline: Evaluation
**Flow:** Test Questions → Retrieval + Generation → Metrics Calculation → System Tuning

**Metrics:**
- Hit Rate @ 5 (>80% target)
- Mean Reciprocal Rank (MRR >0.7 target)
- Answer Relevance (>85% target)
- Citation Accuracy (>80% target)

### Backend Layer Structure

```
Layer 1: API Layer (FastAPI routes)
    ↓
Layer 2: Service Layer (Business logic)
    ↓
Layer 3: RAG Components (Hybrid search, context assembly, generation)
    ↓
Layer 4: Data Access (Qdrant, BM25, Claude API)
```

### Error Handling Strategy
- Empty query → 400 Bad Request
- No relevant results → 200 with "No information found"
- Qdrant connection fails → 503 Service Unavailable
- Claude API timeout → 504 Gateway Timeout

## Design System

The `Verifyr/design-system/` folder contains a comprehensive, modular CSS design system:

### Design Tokens
- **Colors:** Primary Blue (#3B82F6), Dark Blue (#1E40AF), Light Blue (#DBEAFE)
- **Typography:** DM Sans (body), Sora (headings)
- **Spacing:** rem-based scale (0.5rem to 8rem)
- **Borders:** 12px (small), 16px (medium), 24px (large), 50px (pill)
- **Shadows:** Subtle, medium, elevated, colored variants

### Component Structure
```
design-system/
├── tokens/          # Design primitives (colors, typography, spacing)
├── components/      # Reusable UI components (buttons, cards, forms)
├── animations/      # Keyframes and transitions
└── layout/          # Grid system and responsive utilities
```

### Responsive Breakpoints
- Mobile: max-width 768px
- Tablet: 769px - 1024px
- Desktop: 1025px+

### CSS Import Order
When using the design system, import CSS files in this order:
1. Tokens (colors, typography, spacing, shadows, borders)
2. Layout (grid, containers, responsive)
3. Components (buttons, cards, navigation, etc.)
4. Animations

## System Design Principles

When building the RAG system, follow these principles:

1. **Modularity:** Each pipeline component is independent and testable
2. **Observability:** Log intermediate outputs at each pipeline stage
3. **Iterative Improvement:** Evaluation pipeline feeds back into retrieval/generation tuning
4. **Scalability Readiness:** Architecture supports growing from 6 to 600 documents
5. **Quality First:** Emphasize retrieval quality before optimizing for speed
6. **Source Transparency:** Every answer traces back to specific document sources

## Development Workflow

### Phase-Based Development
The project follows a 10-phase development plan (see `Product-strategy/dev_phases.md`):

1. **Phase 0:** Foundation setup (project structure, design decisions)
2. **Phase 1:** PDF text extraction
3. **Phase 2:** Text chunking
4. **Phase 3:** Vector embeddings & Qdrant setup
5. **Phase 4:** BM25 keyword index
6. **Phase 5:** Hybrid search with RRF
7. **Phase 6:** FastAPI backend setup
8. **Phase 7:** Claude API integration
9. **Phase 8:** Full RAG pipeline connection
10. **Phase 10:** Evaluation framework

**Important:** Complete each phase fully and validate before moving to the next.

### Data Organization
```
data/
├── raw/                    # Original PDFs organized by product
│   ├── product_a/
│   │   ├── manual.pdf
│   │   ├── specifications.pdf
│   │   └── review.pdf
│   └── product_b/
│       └── ...
├── processed/              # Extracted and chunked data
│   ├── {product}_{doctype}.json
│   ├── chunks.json
│   └── bm25_index.pkl
└── qdrant_storage/        # Vector database storage
```

### Chunk Metadata Structure
Each chunk includes:
- `chunk_id`: "{product}_{doctype}_p{page}_c{chunk_index}"
- `product_name`: Derived from folder name
- `doc_type`: Inferred from filename (manual/specifications/review)
- `page_num`: Page in original document
- `source_file`: Original PDF filename
- `source_url`: Source URL from sources.json (optional, for clickable citations)
- `source_name`: Human-readable source name (optional, e.g., "Apple Support", "Chip.de")
- `chunk_index`: Position within document
- `text`: Chunk content

**Source URLs:** The system supports optional source URL metadata via `data/raw/sources.json`. This enables clickable citations in the frontend, linking back to the original source (e.g., official manuals, review websites).

## Product Context

### Vision
Help people make confident technical purchasing decisions quickly and securely - without information overload and hours of research.

### Target Audience
Athletes, fitness enthusiasts, and health-conscious people (21-50 years) who struggle to compare health-tech products and find the right model for their needs.

### Core Value Propositions
1. **Time Saving:** No need to browse 20 tabs, filters, and reviews
2. **Quick Follow-up Questions:** Ability to clarify uncertainties
3. **Complex Info Simplified:** Technical information condensed on one understandable page
4. **Trustworthy Recommendations:** Neutral, transparent recommendations not driven by ads or affiliate rankings

### QA Chat Features
The chatbot provides both **pre-purchase** (buying advice, product comparisons) and **post-purchase** support (product setup, how-to guides, troubleshooting).

**Key User Stories:**
- Open Q&A chat via chat icon in bottom navigation
- Click quick-reply buttons for common questions
- See source citations under every answer
- Receive answers in simple, layman terms
- Enter custom questions via text input
- Ask follow-up questions with context retention
- View full chat history within session

## Important Notes

### Environment-Specific Issues
- **OneDrive Auto-Sync:** Can cause Live Server constant refreshing. Use `.vscode/settings.json` exclusions or PowerShell server.
- **API Keys:** Never commit API keys. Use environment variables (`ANTHROPIC_API_KEY`).

### Design Choices
- **Chunk Size:** 800 tokens with 200 token overlap
- **Embedding Model:** paraphrase-multilingual-MiniLM-L12-v2 (384 dimensions, optimized for German)
- **Distance Metric:** Cosine similarity
- **Retrieval Strategy:** Hybrid (BM25 + Vector) with RRF fusion
- **Top-K:** 5 chunks for answer generation
- **LLM:** Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)
- **Max Tokens:** 800 for answer generation (flexible for simple facts, comparisons, and step-by-step guides)

### Citation Format
Answers must cite sources as: `[Product Name, Document Type, Page X]`

Example: "The Apple Watch Series 11 has 18 hours of battery life [Apple Watch Series 11, Manual, Page 5]."

### Evaluation Targets
- Hit Rate @ 5: >80%
- MRR: >0.7
- Answer Relevance: >85%
- Citation Accuracy: >80%
- Response Time: <5 seconds

## References

- **Product Strategy:** See `Product.md` for full product vision and USPs
- **Competitors:** See `Competitors.md` for competitive analysis
- **Pipeline Details:** See `Product-strategy/pipelines/` for detailed pipeline documentation
- **Development Guide:** See `Product-strategy/dev_phases.md` for step-by-step implementation guide
- **Design System:** See `Verifyr/design-system/README.md` for design principles and usage
