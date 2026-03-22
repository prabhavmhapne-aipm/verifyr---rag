<p align="center">
  <img src="frontend/images/apple-touch-icon.png" width="100" alt="Verifyr Logo"/>
</p>

<h1 align="center">Verifyr.de</h1>

<p align="center">
  <strong>Conversational AI assistant for wearable health-tech purchasing decisions.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-beta-orange" alt="Status"/>
  <img src="https://img.shields.io/badge/python-3.10+-3776AB?logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/vector%20DB-Qdrant-DC244C?logo=qdrant&logoColor=white" alt="Qdrant"/>
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="License"/>
</p>

<p align="center">
  🌐 <a href="https://verifyr.de">www.verifyr.de</a>
</p>

Verifyr is your brand-independent AI assistant that compares and recommends Health-Tech wearables (smartwatches, fitness trackers, rings), curates expert reviews, and guides you from pre-purchase questions to post-purchase support — neutral, transparent, and in seconds.

Powered by a **conversational RAG pipeline**, Verifyr covers the full buyer journey: a guided 4-step quiz recommends personalised product matches with a price history chart, Amazon sentiment analysis, and curated expert review summaries — while the chat interface handles pre and post-purchase support, all grounded in verified product documents and reviews.

<p align="center">
  <img src="frontend/images/app-preview-readme.png" width="900" alt="Verifyr – AI Health-Tech Advisor"/>
</p>

<p align="center">
  <img src="frontend/images/usecases-readme.png" width="900" alt="Verifyr – Use Cases"/>
</p>

<p align="center">
  <img src="frontend/images/loading-screen-readme.png" width="900" alt="Verifyr – Loading Screen"/>
</p>

<p align="center">
  <img src="frontend/images/results-sidebyside.png" width="900" alt="Verifyr – Quiz Results"/>
</p>

<p align="center">
  <img src="frontend/images/results-sentiment.png" width="900" alt="Verifyr – Price History, Amazon Reviews & Expert Reviews"/>
</p>

<p align="center">
  <img src="frontend/images/rag-chat-readme.png" width="900" alt="Verifyr – RAG Chat"/>
</p>

---

## Why Verifyr

| Problem | Verifyr's Solution |
|---|---|
| Too many tabs, too many reviews | Curated answers from verified sources in one place |
| Biased affiliate rankings | 100% brand-agnostic recommendations |
| Confusing tech specs | Plain-language explanations with source citations |
| No post-purchase support | Built-in QA chat for setup, how-tos, and troubleshooting |
| Scattered review sites | Aggregated expert review summaries with sentiment scores |

---

## Features

- **Guided quiz advisor** — 4-step quiz (category → use cases → feature priorities → budget) feeds a two-tier recommendation engine with RAG-enhanced personalised insights
- **Product comparison carousel** — Side-by-side scrollable cards (2 visible on desktop, swipeable on mobile) with dot indicators and arrow navigation
- **Price history chart** — Interactive SVG price chart with min/max markers and Idealo.de integration
- **Amazon Customer Reviews widget** — Aggregated star rating, sentiment bars (positive/neutral/negative %), summary, and top pros/cons — in German and English
- **Expert review boxes** — Curated summaries from tech publications (Chip.de, TechRadar, Heise, Computerbild, etc.) with sentiment % badges, publish date, and direct links
- **Conversational RAG chat** — Ask naturally, get source-cited answers grounded in product manuals and specifications
- **Hybrid RAG retrieval** — BM25 keyword search + semantic vector search fused via RRF for maximum accuracy
- **Source-backed answers** — Every response cites `[Product, Document Type, Page X]`
- **Multilingual** — Fully bilingual DE/EN with language toggle; optimized for German and English queries
- **Saved conversations** — Multi-turn chat with persistent conversation history
- **Auth & access control** — Supabase JWT authentication with invite-only access
- **Admin panel** — Stats, conversation viewer, user management, and content ingestion
- **Analytics & observability** — Google Analytics 4 funnel tracking + Langfuse tracing

---

## Supported Products

| Product | Category | Year |
|---|---|---|
| Apple Watch Series 11 | Smartwatch | 2025 |
| Garmin Fēnix 8 | Multisport GPS Watch | 2024 |
| Garmin Forerunner 970 | Running / Triathlon Watch | 2025 |

New products can be added by dropping JSON review files and a specification PDF into `data/raw/{product_id}/` and updating `data/products_metadata.json`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI (Python) |
| LLM | Claude Sonnet 4.6, Claude Haiku 4.5, GPT-5 Mini, GPT-4o Mini, GPT-5.1, Gemini 2.5 Flash/Pro |
| Vector Database | Qdrant (embedded mode) |
| Keyword Search | BM25 |
| Embeddings | `intfloat/multilingual-e5-base` (multilingual, dims determined at runtime) |
| Retrieval Strategy | Hybrid search with RRF fusion, Top-5 chunks |
| Auth | Supabase (JWT RS256/ES256 + HS256 fallback) |
| Observability | Langfuse v3 (Docker, self-hosted) |
| Frontend | Vanilla HTML / JavaScript / CSS |

---

## Architecture

### System Layers

| Layer | Component | Description |
|---|---|---|
| 1 | **Frontend** | Vanilla HTML/CSS/JS served as static files by FastAPI. Landing page, chat interface, quiz/advisor, admin panel, auth. No framework — minimal bundle, fast first paint, SEO-friendly. |
| 2 | **FastAPI Backend** | 20+ async endpoints. JWT middleware via Supabase. `Cache-Control: no-cache` middleware ensures users always receive fresh HTML/JS/CSS without hard refreshes. |
| 3 | **Recommendation Engine** | Two-tier quiz system. Tier 1: weighted metadata scorer (40% category / 35% use-cases / 25% features). Tier 2: RAG-enhanced "For You" bullet generation via Claude — personalised strength + weakness per product. |
| 4 | **Hybrid Retrieval Engine** | BM25 keyword search + Qdrant vector search run in parallel, fused via RRF. Product diversity guard ensures balanced context for comparison queries. |
| 5 | **LLM Generation** | Multi-provider: Claude, OpenAI, Gemini. Inline citation enforcement via system prompt + regex extraction post-generation. |
| 6 | **Shared Data Layer** | Qdrant (embedded) + BM25 (in-memory) + chunks.json + products_metadata.json + review JSONs |
| 7 | **Offline Ingestion** | Run once to rebuild: Raw PDFs → PyMuPDF extraction → Chunker → Embedder → Qdrant upload + BM25 build |

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
    ├── Product Detection    — keyword map matches product names → sets target_products filter
    ├── Intent Classification — detects comparison (vs, compare) and complexity (how, why, explain)
    └── Adaptive Top-K      — Simple/Comparison → K=5 | Complex/Guides → K=8
    │
    ▼
[3] BM25 Search              — Exact keyword match, retrieves top-20 candidates
    │
[4] Vector Search            — Multilingual semantic embedding, retrieves top-20 candidates
    │
    ▼
[5] RRF Fusion + Diversity
    ├── RRF formula: score = 1/(60+bm25_rank) + 1/(60+vector_rank)
    └── Diversity guard: for comparisons, enforces ≥2 chunks per product
    │
    ▼
[6] LLM Generate             — Claude / GPT / Gemini with structured system prompt, max 800 tokens
    │
    ▼
[7] Cited Answer             — Inline [1][2][3] → regex extraction → structured Source objects
```

---

### Recommendation Engine

The quiz advisor runs a two-tier pipeline via `POST /quiz/score-with-rag`:

```
Quiz UI (4 steps)
  category (single) + useCases[] (multi) + features[] (max 10) + budget range + special request
    │
    ▼
Tier 1 — Metadata Scorer (~50 ms)
  score = 0.40 × category + 0.35 × avg(use_case_ratings) + 0.25 × avg(feature_ratings)
  Products with category = 0 are filtered out entirely.
  Rating ≥4 → "Excellent for…" | Rating ≤2 → weakness warning
    │
    ▼ (Top 3 products pass to Tier 2)
Tier 2 — RAG Enhancer
  Build semantic query per product → Hybrid retrieval (product-filtered) →
  Claude generates 1 personalised strength + 1 weakness per product →
  Appended to static bullets with "FOR YOU" badge
    │
    ▼
Ranked Results (carousel) → Chat CTA (pre-seeded with product context)
```

---

### Results Page — Data Sources per Card

Each product card on the results page pulls from three separate async data sources:

| Widget | Source | Backend Endpoint |
|---|---|---|
| Price history chart | `products_metadata.json` → `price_history[]` | Served inline with quiz results |
| Amazon Customer Reviews | `reviews/amazon*.json` per product | `GET /products/{id}/amazon-sentiment` |
| Expert review boxes | `reviews/review-results/*.json` per product | `GET /products/{id}/reviews` |

---

### Offline Ingestion Pipeline

```
data/raw/            →  PDF Extractor     →  Chunker           →  Embedder
(PDFs by product)       (PyMuPDF + OCR)      (800 tok/200 ovlp)   (multilingual-e5-base)
                                                                        │
                                                        ┌───────────────┴────────────────┐
                                                        ▼                                ▼
                                                 Qdrant Upload                      BM25 Build
                                              (cosine + payload)              (tokenize + pickle)
```

---

### LLM Models

| Model key | Provider | Use Case |
|---|---|---|
| `gpt-5-mini` | OpenAI | Default — fast, cost-effective |
| `gpt-4o-mini` | OpenAI | RAG Enhancer reasoning |
| `gpt-5.1` | OpenAI | Balanced quality/cost |
| `claude-sonnet-4.6` | Anthropic | Best quality, complex reasoning |
| `claude-haiku-4.5` | Anthropic | Fast Anthropic option |
| `gemini-2.5-flash` | Google | Free tier, fast |
| `gemini-2.5-pro` | Google | Free tier, highest Gemini quality |

---

### Key Design Decisions

**#1 — Why Hybrid Search over pure Vector?**
Product manuals contain exact model numbers and spec values. Vector search misses exact-match queries like "Garmin FR970 GPS accuracy". BM25 excels at these but fails at semantic paraphrases. Hybrid + RRF captures both signal types without score normalization complexity.

**#2 — Why 800-token chunks with 200-token overlap?**
Too small (200–400 tokens): single spec values without context, poor answer quality. Too large (1200+ tokens): context fills quickly, noisy retrieval. 800 tokens fits a complete spec section; the 200-token overlap prevents information loss at sentence boundaries.

**#3 — Why `multilingual-e5-base` over `text-embedding-3`?**
60% of queries are German. `text-embedding-3` requires an API call per query (latency + cost). `intfloat/multilingual-e5-base` runs locally, supports 100+ languages, costs $0, and produces compact vectors for fast Qdrant search.

**#4 — Why Qdrant embedded mode?**
A separate Docker service adds operational overhead for a single-developer product. Embedded mode stores everything in a local directory — zero infrastructure, same API surface. Trade-off: only one process can hold the lock at a time (kill server before re-indexing).

**#5 — Why Supabase Auth over custom JWT?**
Supabase provides email auth, OAuth, password reset, and invite flows out of the box — free up to 50,000 users. The backend only validates JWTs; it never stores passwords.

**#6 — Why Langfuse for observability?**
Generic APM tools don't understand RAG-specific concepts: retrieval quality, chunk relevance, citation accuracy. Langfuse provides native LLM tracing with span-level drill-down, RAGAS eval runners, and cost tracking per query — self-hostable at zero ongoing cost.

---

## Project Structure

```
verifyr - rag/
├── backend/
│   ├── main.py                 # FastAPI app — all routes + static file serving
│   ├── auth_middleware.py      # Supabase JWT validation (RS256/ES256 + HS256 fallback)
│   ├── recommendation/
│   │   └── rag_enhancer.py     # Tier 2 RAG — personalised strength/weakness generation
│   ├── ingestion/              # PDF processing, chunking, web scraper
│   ├── indexing/               # BM25 + Qdrant vector store indexing
│   ├── retrieval/              # Hybrid search (BM25 + Qdrant + RRF fusion)
│   └── generation/             # Multi-provider LLM client (Claude, GPT, Gemini)
├── frontend/
│   ├── index.html              # Landing page
│   ├── chat.html / app.js      # Chat interface with saved conversations
│   ├── auth.html / auth.js     # Login / signup
│   ├── admin.html / admin.js   # Admin panel (stats, users, ingestion)
│   ├── components/
│   │   └── auth-modal.js/.css  # Reusable auth modal
│   ├── quiz/                   # 4-step quiz advisor flow
│   │   ├── category.html       # Step 1 — product category
│   │   ├── use-case.html       # Step 2 — use cases
│   │   ├── features.html       # Step 3 — feature priorities (max 10)
│   │   ├── budget.html         # Step 4 — budget range + special request
│   │   ├── loading.html        # Animated loading screen
│   │   └── results.html/.js    # Ranked product carousel + review widgets
│   ├── images/products/        # Product images (referenced by products_metadata.json)
│   └── design-system/          # Design tokens, components, animations
├── data/
│   ├── raw/                    # Source documents organized by product
│   │   └── {product_id}/
│   │       ├── specification.pdf
│   │       └── reviews/
│   │           ├── amazon.de.manual_review_DDMMYYYY.json
│   │           └── review-results/
│   │               └── {source}_review_DDMMYYYY.json
│   ├── processed/              # chunks.json, bm25_index.pkl
│   ├── qdrant_storage/         # Vector database
│   ├── conversations/          # Saved conversation JSON files
│   └── products_metadata.json  # Product index (quiz ratings, images, price history)
├── docs/                       # Architecture, dev phases, operations docs
├── tests/                      # Evaluation framework (Langfuse + RAGAS)
├── manage_server.ps1           # Server management helper
├── requirements.txt
└── LICENSE
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Windows (PowerShell) or Linux/macOS
- At least one API key:
  - Anthropic API key — for Claude models
  - OpenAI API key — for GPT models (default)
  - Google API key — for Gemini models (free tier available)

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

# 4. Configure environment
copy .env.example .env
# Edit .env — required keys:
#   ANTHROPIC_API_KEY   — https://console.anthropic.com/settings/keys
#   OPENAI_API_KEY      — https://platform.openai.com/api-keys
#   GOOGLE_API_KEY      — https://aistudio.google.com/apikey (free)
#   SUPABASE_URL        — https://supabase.com/dashboard
#   SUPABASE_ANON_KEY
#   LANGFUSE_PUBLIC_KEY — https://cloud.langfuse.com
#   LANGFUSE_SECRET_KEY
```

### Run the Indexing Pipeline

```powershell
# Kill any running server first (releases Qdrant DB lock)
.\manage_server.ps1 -Action kill

.\venv\Scripts\python.exe backend/ingestion/pdf_processor.py
.\venv\Scripts\python.exe backend/ingestion/chunker.py
.\venv\Scripts\python.exe backend/indexing/vector_store.py
.\venv\Scripts\python.exe backend/indexing/bm25_index.py
```

### Start the Server

```powershell
.\manage_server.ps1 -Action start
```

| URL | Purpose |
|---|---|
| `http://localhost:8000/` | Landing page |
| `http://localhost:8000/chat.html` | Chat interface |
| `http://localhost:8000/auth.html` | Login / signup |
| `http://localhost:8000/admin.html` | Admin panel |
| `http://localhost:8000/docs` | FastAPI Swagger UI |
| `POST http://localhost:8000/query` | RAG query endpoint |
| `POST http://localhost:8000/quiz/score-with-rag` | Enhanced quiz scoring |
| `GET http://localhost:8000/products/{id}/amazon-sentiment` | Amazon review widget data |
| `GET http://localhost:8000/products/{id}/reviews` | Expert review boxes data |

### Server Management

```powershell
.\manage_server.ps1 -Action status    # Check status
.\manage_server.ps1 -Action start     # Start server (http://0.0.0.0:8000)
.\manage_server.ps1 -Action kill      # Kill all Python processes
.\manage_server.ps1 -Action restart   # Kill + start
.\manage_server.ps1 -Action port      # Show active port
```

---

## Adding a New Product

1. Create `data/raw/{product_id}/` with the following structure:
```
data/raw/{product_id}/
├── specification.pdf                              # For RAG indexing
└── reviews/
    ├── amazon.de.manual_review_DDMMYYYY.json      # Amazon sentiment widget
    └── review-results/
        └── {source}_review_DDMMYYYY.json          # Expert review boxes
```
2. Add a product entry to `data/products_metadata.json` (display name, price, images, price history, Amazon/Idealo URLs)
3. Drop product images into `frontend/images/products/`
4. Kill the server and re-run the indexing pipeline

No code changes required — review widgets and carousel load dynamically from the folder structure.

---

## API Usage

### Query Endpoint

```http
POST /query
Content-Type: application/json

{
  "query": "Welche Smartwatch ist besser für Schlaftracking, Garmin oder Apple Watch?",
  "model": "gpt-5-mini"
}
```

**Response:**

```json
{
  "answer": "Für Schlaftracking empfiehlt sich die Garmin Fenix 8 ... [Garmin Fenix 8, Manual, Page 12]",
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
| Precision @ 5 | > 0.6 |
| RAGAS Faithfulness | > 0.95 |
| Answer Relevancy | > 0.85 |
| Context Relevancy | > 0.7 |
| Citation Quality | > 0.85 |
| Response time | < 5s |

Evaluation is powered by **Langfuse** with a test dataset of 60% German / 40% English queries.

---

## License

Licensed under the [Apache License 2.0](LICENSE).

---

## Contact

**Verifyr** — [verifyr.de](https://verifyr.de)
