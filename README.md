# Verifyr

**Conversational AI assistant for wearable health-tech purchasing decisions.**

Verifyr helps athletes, fitness enthusiasts, and health-conscious people find the right smartwatch, fitness tracker, or health ring — without spending hours comparing specs across countless reviews. It delivers neutral, source-backed recommendations and answers both pre- and post-purchase questions through a conversational RAG (Retrieval-Augmented Generation) pipeline.

> "Von Überforderung zu Kaufklarheit." — From overwhelm to purchase clarity.

---

## Why Verifyr

| Problem | Verifyr's Solution |
|---|---|
| Too many tabs, too many reviews | Curated answers from verified sources in one place |
| Biased affiliate rankings | 100% brand-agnostic recommendations |
| Confusing tech specs | Plain-language explanations with source citations |
| No post-purchase support | Built-in QA chat for setup, how-tos, and troubleshooting |

---

## Features

- **Conversational product comparison** — Ask naturally, get 3–4 ranked recommendations with transparent reasoning
- **Hybrid RAG retrieval** — BM25 keyword search + semantic vector search fused via RRF for maximum accuracy
- **Source-backed answers** — Every response cites `[Product, Document Type, Page X]`
- **Multilingual** — Optimized for German and English queries
- **Pre- & post-purchase QA** — One assistant for the full buyer journey
- **Observability** — Full tracing and evaluation via Langfuse

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI (Python) |
| LLM | Claude Sonnet 4.5, Haiku 4.5, GPT-5.1, GPT-5 Mini, Gemini 2.5 Flash/Pro |
| Vector Database | Qdrant (embedded mode) |
| Keyword Search | BM25 |
| Embeddings | `paraphrase-multilingual-MiniLM-L12-v2` (384 dims) |
| Retrieval Strategy | Hybrid search with RRF fusion, Top-5 chunks |
| Observability | Langfuse v3 |
| Frontend | HTML / JavaScript / CSS |

---

## Architecture

### System Layers

Verifyr is organized into seven layers, read top-to-bottom from the user's browser down to the offline indexing pipeline.

| Layer | Component | Description |
|---|---|---|
| 1 | **Frontend** | Vanilla HTML/CSS/JS served as static files by FastAPI. Landing page, chat interface, quiz/advisor, admin panel. No React/Next.js — minimal bundle, fast first paint, SEO-friendly. |
| 2 | **FastAPI Backend** | 18 async endpoints. JWT middleware via Supabase. Orchestrates all downstream components from `backend/main.py`. |
| 3 | **Recommendation Engine** | Two-tier quiz system. Tier 1: weighted metadata scorer (40% category / 35% use-cases / 25% features). Tier 2 (upcoming): RAG-enhanced "For You" bullet generation via Claude. |
| 4 | **Hybrid Retrieval Engine** | BM25 keyword search + Qdrant vector search run in parallel, fused via RRF. Product diversity guard ensures balanced context for comparison queries. |
| 5 | **LLM Generation** | Multi-provider: Claude Sonnet 4.5, Claude Haiku 4.5, GPT-5.1, GPT-5 Mini, Gemini 2.5 Flash, Gemini 2.5 Pro. Inline citation enforcement via system prompt + regex extraction post-generation. |
| 6 | **Shared Data Layer** | Qdrant (embedded SQLite, ~4k points) + BM25 (3.9 MB pickle, in-memory) + chunks.json (1.8 MB, ~4k chunks) + products_metadata.json (quiz ratings). |
| 7 | **Offline Ingestion** | Run once to rebuild: Raw PDFs → PyMuPDF extraction → Chunker → Embedder → Qdrant upload + BM25 build. |

---

### 7-Stage Query Pipeline

Every user query follows this path. Latency target: **under 3 seconds end-to-end**.

```
POST /query
    │
    ▼
[1] Query Received
    │
    ▼
[2] Query Analysis
    ├── Product Detection   — keyword map matches product names → sets target_products filter
    ├── Intent Classification — detects comparison (vs, compare) and complexity (how, why, explain)
    └── Adaptive Top-K     — Simple/Comparison → K=5 | Complex/Guides → K=8
    │
    ▼
[3] BM25 Search              — Exact keyword match, retrieves top-20 candidates
    │
[4] Vector Search            — 384-dim semantic embedding, retrieves top-20 candidates
    │
    ▼
[5] RRF Fusion + Diversity
    ├── RRF formula: score = 1/(60+bm25_rank) + 1/(60+vector_rank)
    └── Diversity guard: for comparisons, enforces ≥2 chunks per product
    │
    ▼
[6] LLM Generate             — Claude / GPT with structured system prompt, max 800 tokens
    │
    ▼
[7] Cited Answer             — Inline [1][2][3] → regex extraction → structured Source objects
```

---

### Recommendation Engine

The quiz advisor runs a two-tier pipeline via `POST /quiz/score`:

```
Quiz UI (3 steps)
  category (single) + useCases[] (multi) + features[] (max 5)
    │
    ▼
Tier 1 — Metadata Scorer (~50 ms)
  score = 0.40 × category + 0.35 × avg(use_case_ratings) + 0.25 × avg(feature_ratings)
  Products with category = 0 are filtered out entirely.
  Rating ≥4 → "Excellent for…" | Rating ≤2 → weakness warning
    │
    ▼ (Top 3 products pass to Tier 2)
Tier 2 — RAG Enhancer [upcoming]  POST /quiz/score-with-rag
  Build semantic query per product → Hybrid retrieval (product-filtered) →
  Claude generates 1 personalised strength + 1 weakness per product →
  Appended to static bullets with "FOR YOU" badge
    │
    ▼
Ranked Results → Chat CTA (pre-seeded with product context)
```

---

### Offline Ingestion Pipeline

```
data/raw/            →  PDF Extractor     →  Chunker           →  Embedder
(PDFs by product)       (PyMuPDF + OCR)      (800 tok/200 ovlp)   (384-dim vectors)
                                                                        │
                                                        ┌───────────────┴────────────────┐
                                                        ▼                                ▼
                                                 Qdrant Upload                      BM25 Build
                                              (cosine + payload)              (tokenize + pickle)
```

---

### LLM Models

| Model | Provider | Input / Output | Use Case |
|---|---|---|---|
| Claude Sonnet 4.5 | Anthropic | $3.00 / $15.00 per 1M tokens | Best quality, complex reasoning |
| Claude Haiku 4.5 | Anthropic | $0.80 / $4.00 per 1M tokens | Fast, cost-effective |
| GPT-5.1 | OpenAI | $1.25 / $10.00 per 1M tokens | Balanced quality/cost |
| GPT-5 Mini | OpenAI | $0.25 / $2.00 per 1M tokens | Budget option |
| Gemini 2.5 Flash | Google | Free (250 req/day) | Free tier, fast, good quality |
| Gemini 2.5 Pro | Google | Free (100 req/day) | Free tier, highest Gemini quality |

---

### Key Design Decisions

**#1 — Why Hybrid Search over pure Vector?**
Product manuals contain exact model numbers and spec values. Vector search misses exact-match queries like "Garmin FR970 GPS accuracy". BM25 excels at these but fails at semantic paraphrases. Hybrid + RRF captures both signal types without score normalization complexity.

**#2 — Why 800-token chunks with 200-token overlap?**
Too small (200–400 tokens): single spec values without context, poor answer quality. Too large (1200+ tokens): context fills quickly, noisy retrieval. 800 tokens fits a complete spec section; the 200-token overlap prevents information loss at sentence boundaries.

**#3 — Why `multilingual-MiniLM` over `text-embedding-3`?**
60% of queries are German. `text-embedding-3` requires an API call per query (latency + cost). `paraphrase-multilingual-MiniLM-L12-v2` runs locally, supports 50+ languages, costs $0, and produces compact 384-dim vectors for fast Qdrant search.

**#4 — Why Qdrant embedded (SQLite) mode?**
A separate Docker service adds operational overhead for a single-developer product. Embedded mode stores everything in a local directory — zero infrastructure, same API surface, ~4,000 vectors fit comfortably. Trade-off: only one process can hold the lock at a time (kill server before re-indexing).

**#5 — Why Supabase Auth over custom JWT?**
Supabase provides email auth, OAuth, password reset, and invite flows out of the box — free up to 50,000 users. The backend only validates JWTs; it never stores passwords. Rolling custom auth introduces OWASP-class security risks.

**#6 — Why Langfuse for observability?**
Generic APM tools don't understand RAG-specific concepts: retrieval quality, chunk relevance, citation accuracy. Langfuse provides native LLM tracing with span-level drill-down, RAGAS eval runners, and cost tracking per query — self-hostable at zero ongoing cost.

---

## Project Structure

```
verifyr - rag/
├── backend/
│   ├── ingestion/          # PDF processing, chunking
│   ├── indexing/           # BM25 + vector store indexing
│   ├── retrieval/          # Hybrid search (BM25 + Qdrant + RRF)
│   ├── generation/         # Multi-provider LLM integration (Claude, GPT, Gemini)
│   └── main.py             # FastAPI app + static file serving
├── frontend/
│   ├── index.html          # Landing page
│   ├── chat.html           # Chat interface
│   ├── app.js              # Chat logic
│   ├── styles.css          # Styles
│   └── design-system/      # Design tokens & components
├── data/
│   ├── raw/                # Source PDFs organized by product
│   ├── processed/          # chunks.json, bm25_index.pkl
│   └── qdrant_storage/     # Vector database
├── docs/                   # Product, architecture & dev documentation
├── tests/                  # Evaluation framework (Langfuse + RAGAS)
├── manage_server.ps1       # Server management helper
├── requirements.txt
└── LICENSE
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Windows (PowerShell) or Linux/macOS
- API keys (at least one required):
  - Anthropic API key — for Claude models
  - OpenAI API key — for GPT models
  - Google API key — for Gemini models (free, no credit card needed)

### Installation

```powershell
# 1. Clone the repository
git clone https://github.com/your-org/verifyr.git
cd "verifyr - rag"

# 2. Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1       # Windows
# source venv/bin/activate         # Linux/macOS

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure API keys
copy .env.example .env
# Edit .env and add your API keys:
#   ANTHROPIC_API_KEY  — https://console.anthropic.com/settings/keys
#   OPENAI_API_KEY     — https://platform.openai.com/api-keys
#   GOOGLE_API_KEY     — https://aistudio.google.com/apikey (free)
```

### Run the Indexing Pipeline

```powershell
# Kill any running server first (releases Qdrant DB lock)
.\manage_server.ps1 -Action kill

# Run indexing steps in order
.\venv\Scripts\python.exe backend/ingestion/pdf_processor.py
.\venv\Scripts\python.exe backend/ingestion/chunker.py
.\venv\Scripts\python.exe backend/indexing/vector_store.py
.\venv\Scripts\python.exe backend/indexing/bm25_index.py
```

### Start the Server

```powershell
.\manage_server.ps1 -Action start
```

| Endpoint | URL |
|---|---|
| Landing page | `http://localhost:8000/` |
| Chat interface | `http://localhost:8000/chat.html` |
| API docs | `http://localhost:8000/docs` |
| Query API | `POST http://localhost:8000/query` |

### Server Management

```powershell
.\manage_server.ps1 -Action status    # Check status
.\manage_server.ps1 -Action start     # Start server
.\manage_server.ps1 -Action kill      # Kill all Python processes
.\manage_server.ps1 -Action restart   # Kill + start
```

---

## API Usage

### Query Endpoint

```http
POST /query
Content-Type: application/json

{
  "query": "Welche Smartwatch ist besser für Schlaftracking, Garmin oder Apple Watch?"
}
```

**Response:**

```json
{
  "answer": "Für Schlaftracking empfiehlt sich die Garmin Fenix 8, da sie ...[Garmin Fenix 8, Manual, Page 12]",
  "sources": [
    {
      "product_name": "Garmin Fenix 8",
      "doc_type": "Manual",
      "page_num": 12
    }
  ]
}
```

---

## Evaluation Targets

| Metric | Target |
|---|---|
| Hit Rate @ 5 | > 85% |
| MRR | > 0.7 |
| RAGAS Faithfulness | > 0.95 |
| Answer Relevancy | > 0.85 |
| Citation Quality | > 0.85 |
| Response time | < 5s |

Evaluation is powered by **Langfuse** with a test dataset of 60% German / 40% English queries.

---

## Data Sources

Product documents are organized under `data/raw/` by product name and include:

- Official manuals
- Technical specifications
- Curated expert reviews

Each chunk carries full metadata: `product_name`, `doc_type`, `page_num`, `source_file`, `source_url`.

---

## License

Licensed under the [Apache License 2.0](LICENSE).

---

## Contact

**Verifyr** — [verifyr.de](https://verifyr.de)
