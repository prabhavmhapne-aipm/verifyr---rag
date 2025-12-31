# RAG System Design Decisions

## Document Processing

### Chunk Size
- **Primary:** 800 tokens
- **Overlap:** 200 tokens
- **Rationale:** Balances context completeness with retrieval precision. 200-token overlap ensures important information isn't lost at chunk boundaries.

### Text Splitters
- **Separators:** `["\n\n", "\n", ". ", " ", ""]`
- **Tool:** LangChain RecursiveCharacterTextSplitter
- **Rationale:** Prioritizes natural document structure (paragraphs, sentences) over arbitrary splits.

## Embedding & Search

### Embedding Model
- **Model:** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- **Dimensions:** 384
- **Rationale:** Fast, efficient, optimized for multilingual content (including German). Better semantic understanding for German product documentation while maintaining same dimensions and speed as previous model.

### Vector Database
- **Database:** Qdrant (embedded mode)
- **Path:** `./data/qdrant_storage`
- **Collection Name:** `product_docs`
- **Distance Metric:** Cosine similarity
- **Rationale:** Easy local development, good performance, embedded mode requires no separate server.

### Keyword Search
- **Algorithm:** BM25 (BM25Okapi)
- **Storage:** Pickle file (`data/processed/bm25_index.pkl`)
- **Rationale:** Excellent for exact matches (model numbers, technical specs) that semantic search might miss.

## Retrieval Strategy

### Hybrid Search with Product Diversity
- **Method:** Reciprocal Rank Fusion (RRF) with diversity enhancement
- **BM25 Top-K:** 20 results
- **Vector Top-K:** 20 results
- **RRF Formula:** `score = 1 / (60 + rank)`
- **Final Top-K:** 5 chunks for answer generation
- **Rationale:** Combines strengths of both semantic and keyword search. RRF normalizes scores without needing weight tuning.

### Product Diversity Algorithm
**Problem Addressed:** Pure relevance ranking could return all chunks from one product, preventing meaningful comparisons.

**Solution:** `_ensure_product_diversity()` method ensures balanced representation:

1. **First Pass**: Select top-K chunks by RRF score
2. **Product Tracking**: Count chunks from each product
3. **Diversity Enforcement**:
   - Minimum: 1 chunk per product (or 1/3 of top-K, whichever is higher)
   - If product under-represented: replace lowest-scoring chunk from over-represented product
   - Maintains relevance while ensuring both products appear

**Example** (top-5 results):
- Without diversity: [Apple Watch × 5, Garmin × 0] ❌
- With diversity: [Apple Watch × 3-4, Garmin × 1-2] ✅

**Impact:**
- Enables true product comparisons
- LLM receives context from BOTH products
- Better comparative answers with balanced insights

## LLM Integration

### Supported Models
The system supports multiple LLM providers for flexibility in cost and quality trade-offs:

**Anthropic Claude:**
- **claude-sonnet-4.5** (`claude-sonnet-4-20250514`)
  - Cost: $0.003/1k input, $0.015/1k output
  - Max Tokens: 800
  - **Rationale:** State-of-the-art reasoning, excellent citation following, good at technical explanations. Best quality for complex comparisons.
  
- **claude-3.5-haiku** (`claude-3-5-haiku-20241022`)
  - Cost: $0.0008/1k input, $0.004/1k output
  - Max Tokens: 800
  - **Rationale:** Fast and cost-effective while maintaining good quality. Suitable for most queries.

**OpenAI GPT:**
- **gpt-4o** (`gpt-4o`)
  - Cost: $0.0025/1k input, $0.010/1k output
  - Max Tokens: 800
  - **Rationale:** Excellent balance of quality and cost. Strong reasoning capabilities.

- **gpt-4o-mini** (`gpt-4o-mini`)
  - Cost: $0.00015/1k input, $0.0006/1k output
  - Max Tokens: 800
  - **Rationale:** Most cost-effective option (37x cheaper than Claude Sonnet 4.5). Ideal for development/testing and simple queries.

**Default Model:** GPT-4o Mini (cost-effective, good quality)
**Temperature:** 0.3 (all models)

**Temperature Rationale:**
- **0.3 (Low)** chosen for deterministic, instruction-following behavior
- Ensures consistent citation format [1], [2], [3] in answers
- More reliable for factual product comparisons
- LLM follows system prompt instructions strictly
- Note: RAG grounding prevents hallucination regardless of temperature

**Note:** Default model changed from Claude Sonnet 4.5 to GPT-4o Mini in December 2025 to reduce costs during development and testing. Users can still select premium models (Claude Sonnet, GPT-4o) via model selector in frontend.

### Prompting Strategy

**System Prompt** (Aligned with verifyr product vision):
```
CRITICAL REQUIREMENT - CITATIONS:
You MUST include numbered citations [1], [2], [3] in your answer text. This is mandatory.
- Context sources are numbered as [1], [2], [3]
- After EVERY factual statement, add the source number in brackets
- Example: "Die Akkulaufzeit beträgt 18 Stunden [1]"
- DO NOT skip citations - every fact needs a number

You are verifyr's product comparison assistant - a trusted advisor for athletes,
fitness enthusiasts, and health-conscious people making smart wearable purchase decisions.

**Your Mission:**
Help users make confident, well-informed decisions by translating complex tech specs
into clear, understandable benefits - saving them from hours of research across
countless tabs and reviews.

**Core Principles:**
- Compare products objectively using ONLY provided documents
- Provide neutral, brand-independent recommendations you can trust
- Translate technical jargon and specs into clear benefits anyone can understand
- IMPORTANT: Always respond in the SAME LANGUAGE as the user's question
  (German question = German answer, English question = English answer)

**Product Coverage:**
- When comparing, always consider BOTH products
  (Apple Watch Series 11 AND Garmin Forerunner 970) if information is available
- Provide balanced insights highlighting key differences from BOTH products

**Response Style:**
- Do NOT include inline citations or source references in your answer text
  - sources will be shown separately at the end
- Match answer length to question complexity:
  * Simple facts: 1-3 sentences
  * Comparisons: 4-6 sentences with key differences from BOTH products
  * Step-by-step guides: Numbered steps, detailed as needed
  * How-to questions: Clear, actionable explanations
- Be concise but complete - include all relevant information from BOTH products
- Make technical information accessible - explain what features MEAN for the user's goals
- State clearly when information is missing for either product
- Write naturally without citation markers - the source cards will show document references

**Support Areas:**
- Pre-purchase: Product comparisons, feature explanations, buying advice, clarifying uncertainties
- Post-purchase: Setup help, how-to guides, troubleshooting, getting started with features

**Tone:**
Helpful, confident, and trustworthy - like a knowledgeable friend who wants you
to make the best choice for YOUR needs.
```

**Design Rationale:**
This prompt is carefully aligned with verifyr's Product.md to reflect the complete target audience and product vision:

1. **Target Audience Alignment**: Addresses all three segments (athletes, fitness enthusiasts, health-conscious people) instead of just athletes
2. **Mission Clarity**: Emphasizes confidence, clarity, and saving research time - core value propositions from Product.md
3. **Benefit Translation**: Instructs LLM to "explain what features MEAN for user's goals" - addresses the "Layman verständliche Nutzen" requirement
4. **Brand Independence**: Explicitly states "neutral, brand-independent recommendations" - matches USP 1
5. **Language Consistency**: Ensures responses match question language (German/English)
6. **Product Diversity**: Emphasis on considering BOTH products in comparisons
7. **Clean Output**: No inline citations - sources shown in separate cards
8. **Support Context**: Defines both pre-purchase (buying advice) and post-purchase (setup, troubleshooting) use cases
9. **Trust Building**: Tone emphasizes being "helpful, confident, and trustworthy" - addresses "Vertrauenswürdige Empfehlungen"

**Expected Impact:**
- Answers explain benefits, not just technical specs
- More accessible to broader audience beyond just athletes
- Builds confidence and trust in recommendations
- Supports full customer journey (pre and post-purchase)

**User Prompt Template:**
```
Context: {formatted_chunks}

Question: {query}

CRITICAL INSTRUCTIONS:
1. You MUST respond in {language_instruction} language only.
2. Your answer MUST include numbered citations [1], [2], [3] after every factual statement.
Example format: "{example}"
Write your answer with citations now:
```

**Language Handling:**
- Frontend sends `language` parameter ("en" or "de") with each request
- Backend explicitly instructs LLM to respond in specified language
- Language-specific examples provided in prompt (English or German)
- Ensures consistent language matching regardless of question text ambiguity

**Rationale:**
- Explicit language instruction prevents LLM from choosing wrong language
- Language parameter from UI selector ensures user preference is respected
- Explicit citation requirement with concrete example
- "CRITICAL" emphasis ensures LLM compliance
- Concrete format shows exactly what's expected

### Context Formatting
- **Format:** Each chunk prefixed with numbered source marker: `[1] Product A, manual, page 5`
- **Rationale:**
  - Concise numbered format aligns with inline citation style
  - LLM can directly use [1], [2], [3] in answers
  - Makes citation extraction easier and provides clear context
  - Lowercase "page" for consistency with frontend display

### Citation Filtering & Source Matching
- **Problem Addressed:** Sources were listed even when not cited in the answer text (e.g., answer cites [1], [3], [5] but sources list shows [1], [2], [3], [4], [5])
- **Solution:** Automatic citation extraction and source filtering
  1. **Citation Extraction:** Regex pattern `\[(\d+)\]` extracts all citation numbers from answer text
  2. **Source Filtering:** Only sources matching extracted citation numbers are included in response
  3. **Citation Preservation:** Each source retains its original citation number (e.g., [1], [3], [5])
  4. **Frontend Display:** Sources displayed with preserved citation numbers matching answer text
- **Implementation:**
  - `_extract_cited_source_numbers()`: Parses answer text for citation patterns
  - `_extract_sources()`: Filters sources by cited numbers and preserves citation_number field
  - Frontend uses `citation_number` instead of array index for display
- **Result:** Sources list only contains sources actually referenced in the answer, with matching citation numbers

### Cost Tracking
- **Per-Query Cost Calculation:** Tracks input/output tokens and calculates cost based on model pricing
- **Token Usage:** Logs input and output tokens for each query
- **Cost Range:** $0.000092 (GPT-4o-mini) to $0.003468 (Claude Sonnet 4.5) per query
- **Rationale:** Enables cost optimization and budget management across different use cases.

## Data Organization

### Input Data Structure
```
data/raw/
├── product_a/
│   ├── manual.pdf
│   ├── specifications.pdf
│   └── reviews/
│       ├── review_source1.pdf
│       └── review_source2.pdf
├── product_b/
│   ├── manual.pdf
│   ├── specifications.pdf
│   └── reviews/
│       └── review_source1.pdf
└── sources.json
```

**Source URL Metadata (`sources.json`):**
- Optional JSON file mapping PDF files to their source URLs
- Format: `{product_name: {file_path: {source_url, source_name}}}`
- Supports subdirectories (e.g., `"reviews/review_file.pdf"`)
- Example file: `data/raw/sources.json.example`
- Used to make source citations clickable in the frontend

### Processed Data
- **Extracted Text:** `data/processed/{product}_{doctype}.json` (Note: Current implementation uses `extracted_pages.json`)
- **Chunks:** `data/processed/chunks.json` (single file, all chunks)
- **BM25 Index:** `data/processed/bm25_index.pkl`

### Current System Stats
- **Total PDFs:** 12 documents (Apple Watch Series 11: 6 docs, Garmin Forerunner 970: 6 docs)
- **Pages Extracted:** 250 pages
- **Chunks Created:** 1,689 chunks
- **BM25 Tokens:** 159,564 total tokens, 11,905 unique tokens
- **Vector Dimensions:** 384 (multilingual model)
- **Storage Size:** ~8 MB (3.81 MB BM25 + ~4 MB Qdrant)
- **Products:** Apple Watch Series 11 2025, Garmin Forerunner 970 2025
- **Source URLs:** 12 unique sources mapped in `sources.json`

### Metadata Schema
Each chunk contains:
- `chunk_id`: Unique identifier (`{product}_{doctype}_p{page}_c{chunk_index}`)
- `product_name`: Extracted from folder name
- `doc_type`: Inferred from filename (manual/specifications/review)
- `page_num`: Page number in original PDF (1-indexed)
- `source_file`: Original PDF filename
- `source_url`: Optional source URL from `sources.json` (for clickable links)
- `source_name`: Optional source name from `sources.json` (human-readable)
- `chunk_index`: Position within document
- `text`: Chunk content

**Source URL Support:**
- URLs are loaded from `data/raw/sources.json` during PDF processing
- Supports multiple reviews per product (one per source website)
- Subdirectories (e.g., `reviews/`) are supported for organization
- If no URL is provided, source citations still work but won't be clickable

## Evaluation Metrics

### Retrieval Quality
- **Hit Rate @ 5:** >80% (Is relevant chunk in top 5 results?)
- **Mean Reciprocal Rank (MRR):** >0.7 (Rank of first relevant result)
- **Source Coverage:** Both products covered in results?

### Generation Quality
- **Answer Relevance:** >85% (Addresses the question?)
- **Citation Accuracy:** >80% (Sources cited correctly?)
- **Product Coverage:** Expected products mentioned?

### Performance (Actual Measurements)
- **API Startup Time:** ~3 seconds (loads indexes)
- **Response Time:** 5-7 seconds (end-to-end query to answer)
- **Chunk Retrieval Time:** ~100-200ms (hybrid search)
- **LLM Generation Time:** ~4-6 seconds (varies by model)
- **Index Load Time:** 2.5 seconds (BM25 + Vector indexes)

## Development Approach

### Iteration Strategy
1. Build complete pipeline first (Phases 1-9)
2. Establish baseline metrics (Phase 10)
3. Iterate on weak areas identified by evaluation
4. Re-run evaluation after each change
5. Keep changes that improve metrics

### Quality First
- Prioritize retrieval quality over speed
- Ensure citations are accurate before optimizing latency
- Validate each pipeline component independently before integration

### Logging & Observability
- Log intermediate outputs at each pipeline stage
- Track query latency components (retrieval, generation)
- Log API costs (Claude API usage)
- Monitor retrieval quality per query type (factual, comparison, complex)

## API Implementation

### REST API (FastAPI)
- **Base URL:** `http://localhost:8000`
- **Documentation:** Interactive docs at `/docs` (Swagger UI)

**Endpoints:**
- `GET /` - API information and status
- `GET /health` - Health check (verifies indexes loaded)
- `POST /query` - Full RAG pipeline (retrieval + generation)
  - Request: `{ "question": str, "model": Optional[str], "language": Optional[str] }`
    - `model`: LLM model to use (default: "gpt-4o-mini")
    - `language`: Response language "en" or "de" (default: "en")
  - Response: `{ "answer": str, "sources": List[Source], "query_id": str, "response_time_ms": int, "model_used": str, "tokens_used": dict, "cost_usd": float }`
  - Source Model: `{ "product": str, "doc_type": str, "page": int, "file": str, "source_url": Optional[str], "source_name": Optional[str] }`
- `GET /products` - List available products in index

**Features:**
- CORS enabled for frontend (localhost:3000)
- Startup event loads indexes once (2-3 seconds)
- Global state management for hybrid searcher and RAG generator
- Query ID generation for tracking
- Response time measurement

## Infrastructure

### Development Environment
- **Execution:** Local machine
- **Storage:** File-based (JSON, pickle)
- **Vector DB:** Qdrant embedded mode (no separate server)
- **API Server:** FastAPI with uvicorn
- **Startup Time:** ~3 seconds (loads BM25 + Vector indexes)

### Dependencies
Core libraries:
- `PyMuPDF` (fitz) - PDF text extraction
- `pytesseract` - OCR fallback
- `Pillow` - Image processing
- `sentence-transformers` - Embeddings
- `qdrant-client` - Vector database
- `rank-bm25` - Keyword search
- `langchain` - Text splitting
- `anthropic` - Claude API
- `openai` - GPT API
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `pydantic` - Data validation
- `python-dotenv` - Environment variable management

### Future Considerations
- **Caching:** Cache embeddings and common query responses
- **Data Versioning:** Track document versions and index versions
- **Scalability:** Architecture supports 6 → 600 documents
- **Reranking:** Optional reranking layer for improved precision

## Design Principles

1. **Modularity:** Each pipeline component is independent and testable
2. **Observability:** Log intermediate outputs for debugging
3. **Iterative Improvement:** Use evaluation to guide optimization
4. **Quality First:** Correct results before fast results
5. **Source Transparency:** Every answer traces to specific sources
6. **Simplicity:** Avoid over-engineering; add complexity only when needed

## Frontend Implementation

### Web Chat Interface
- **Framework:** Vanilla HTML/JavaScript (no frameworks)
- **Design System:** Verifyr design system (`../Verifyr/design-system/design-system.css`)
- **Server:** Python HTTP server on port 3000
- **Files:**
  - `frontend/index.html` - Main HTML structure
  - `frontend/app.js` - Chat logic and API integration
  - `frontend/styles.css` - Chat-specific styles with design system tokens

### Design System Integration
**Color Tokens:**
- `--primary-blue` (#3B82F6) - User messages, buttons, accents
- `--light-gray` (#F1F5F9) - Assistant messages, backgrounds
- `--dark` (#0F172A) - Primary text
- `--gray` (#64748B) - Secondary text, metadata

**Typography:**
- `--font-display` (Sora) - Headings
- `--font-primary` (DM Sans) - Body text
- Font sizes use `--font-size-*` variables

**Components Reused:**
- `.submit-btn` - Send button with hover effects
- `.email-input` - Chat input field pattern
- `.form-message.error` - Error message styling
- `.loading` - Spinner animation
- `.trust-benefit` - Pattern for source cards

**Animations:**
- `slideUp` - Message fade-in (0.3s)
- `spin` - Loading spinner rotation
- `bounce` - Loading dots animation (1.4s)

### UI Features

**Language Switcher (EN/DE):**
- Located in header (top-right, next to title)
- Matches landing page design (`.lang-switch` + `.lang-option`)
- Active state with blue background
- Dynamically updates all UI text:
  - Welcome message
  - Subtitle
  - Input placeholder
  - Quick-reply buttons
  - Input note
- Translations stored in `TRANSLATIONS` object (EN/DE)

**Model Selector:**
- Dropdown menu next to language switcher
- 4 LLM options:
  - GPT-4o-mini (Default - Cost-Effective)
  - Claude Sonnet 4.5 (Best Quality)
  - Claude 3.5 Haiku (Fast)
  - GPT-4o (Balanced)
- Updates input note to show selected model
- Selected model sent with each API request
- JavaScript state synced with dropdown value on page load

**Bilingual Welcome (Language-Aware):**
- English: "Hello! How can I help you? I'm happy to help with all questions about products. What would you like to know?"
- German: "Hallo! Wie kann ich dir helfen? Ich helfe dir gerne bei allen Fragen zu den Produkten. Was möchtest du wissen?"

**Quick-Reply Buttons (Language-Aware):**
- **English:**
  1. "Battery Life" → "What is the battery life comparison?"
  2. "Best for Running" → "Which watch is better for running?"
  3. "Waterproof Ratings" → "Compare the waterproof ratings"
  4. "Key Differences" → "What are the key differences?"
- **German:**
  1. "Akkulaufzeit" → "Welche Uhr hat eine längere Akkulaufzeit?"
  2. "Beste fürs Laufen" → "Welche Uhr ist besser zum Laufen?"
  3. "Wasserdichtigkeit" → "Vergleiche die Wasserdichtigkeit"
  4. "Hauptunterschiede" → "Was sind die Hauptunterschiede?"

**Message Display:**
- User messages: Right-aligned, blue bubble with white text
- Assistant messages: Left-aligned, gray bubble with dark text
- Answer text: Natural language with inline citations [1], [2], [3]
  - Example: "Die Apple Watch hält 18 Stunden durch [1], während die Garmin 26 Stunden bietet [2]."
- Source citations: Simplified compact design below answer with:
  - Numbered references: `[1]`, `[2]`, `[3]` etc.
  - Transparent background (no card effect)
  - Simple gray text (not bold) with monospace font
  - Minimal padding (2px) for compact appearance
  - Single-line format: `[N] Product Name • Document Type • Page X`
  - Example: `[1] Apple Watch Series 11 • specifications • Page 9`
  - **Clickable links:** When `source_url` is provided in metadata, sources display as clickable links with link icon (🔗)
  - **Source names:** Optional source name displayed in parentheses when available (e.g., "(TechCrunch)")
  - Links open in new tab with `rel="noopener noreferrer"` for security
  - Efficient horizontal space usage (no wasted whitespace)
  - Bullet separators for readability
  - Matches metadata styling for consistency
  - Separate from answer text for readability
- Metadata: Model used, response time (ms), chunks retrieved

**Interaction:**
- Enter key to send
- Send button disabled when input empty or loading
- Auto-scroll to latest message
- Loading dots animation during API calls
- XSS protection (HTML escaping)

**Responsive Breakpoints:**
- Desktop: > 768px (full layout)
- Tablet: 768px (adjusted spacing)
- Mobile: < 480px (stacked quick replies)

### API Integration
- **Endpoint:** `http://localhost:8000/query`
- **Method:** POST
- **Request:** `{ "question": string, "model": string, "language": string }`
  - `model`: Selected LLM model (e.g., "gpt-4o-mini", "claude-sonnet-4.5")
  - `language`: Response language preference ("en" or "de")
- **Response:** `{ "answer": string, "sources": [Source], "query_id": string, "response_time_ms": int, "model_used": string, "tokens_used": {...}, "cost_usd": float }`
  - **Source Model:** `{ "product": string, "doc_type": string, "page": int, "file": string, "source_url": string|null, "source_name": string|null }`
- **Error Handling:** Displays error messages using `.form-message.error` styling

## Implementation Status

### Completed Phases
- ✅ **Phase 0:** Foundation Setup
- ✅ **Phase 1:** PDF Text Extraction (225 pages from 5 PDFs)
- ✅ **Phase 2:** Text Chunking (846 chunks created)
- ✅ **Phase 3:** Vector Embeddings & Qdrant (384-dim embeddings indexed)
- ✅ **Phase 4:** BM25 Keyword Index (79k tokens indexed)
- ✅ **Phase 5:** Hybrid Search with RRF (operational)
- ✅ **Phase 6:** FastAPI Backend (REST API operational)
- ✅ **Phase 7:** Multi-Model LLM Integration (4 models supported)
- ✅ **Phase 8:** Full Pipeline Integration (end-to-end RAG working)
- ✅ **Phase 9:** Frontend Chat Interface (web UI with design system integration)

### Current Capabilities
- 📄 5 PDF documents indexed and searchable
- 🔍 Hybrid search (BM25 + Vector with RRF + Product Diversity)
- 🤖 4 LLM models available (2 Claude, 2 GPT)
- 🌐 REST API with full RAG pipeline
- 💰 Cost tracking per query
- 🌍 Multilingual support (German/English tested)
- ⚡ Query response in 5-7 seconds
- 🎨 Web chat interface with Verifyr design system
- 🌐 Language switching (EN ↔ DE) with full UI translation
- 🔀 Model selection (4 models, user-selectable)
- 🗣️ Language-consistent responses (matches question language)
- ⚖️ Product diversity enforcement (BOTH products in comparisons)
- 🔢 Inline citations [1], [2], [3] in answer text (academic format)
- 📚 Numbered source list matching inline citations
- 🎯 Bilingual quick-reply buttons (dynamic per language)
- 📱 Responsive design (desktop, tablet, mobile)
- 💡 Benefit-focused explanations (aligned with Product.md vision)
- 🎚️ Temperature-controlled (0.3) for consistent, reliable responses
- 🔗 Clickable source links (when URLs provided in sources.json)
- 📝 Source URL metadata support (source_url and source_name fields)
- ✅ Citation filtering (only cited sources appear in sources list)
- 🔢 Preserved citation numbers (sources match answer text citations)

### User Feedback Improvements (Post-Phase 9)
**Issues Resolved:**
1. ✅ Added language switching and model selection controls
2. ✅ Fixed language inconsistency (LLM now matches question language)
3. ✅ Implemented product diversity algorithm (ensures both products appear)
4. ✅ Simplified source citation cards (compact design, no bold text)
5. ✅ Changed default model to GPT-4o Mini (cost optimization)
6. ✅ Optimized source citation layout (single-line format, better space usage)
7. ✅ Aligned system prompt with Product.md (broader audience, benefit-focused)
8. ✅ Added numbered source references at end (professional citation format)
9. ✅ Implemented inline citations [1], [2], [3] in answer text (academic format)
10. ✅ Added temperature control (0.3) for consistent citation behavior
11. ✅ Added source URL support (clickable source links in frontend)
12. ✅ Enhanced metadata schema with `source_url` and `source_name` fields
13. ✅ Support for multiple reviews per product (subdirectory structure)
14. ✅ Manual source URL management via `sources.json` file
15. ✅ Citation filtering (only sources cited in answer appear in sources list)
16. ✅ Preserved citation numbers (sources display with original citation numbers from answer)
17. ✅ Fixed model selection sync bug (dropdown value now matches JavaScript state on page load)
18. ✅ Added explicit language parameter enforcement (UI language selector now respected by backend)
19. ✅ Aligned backend default model with frontend (gpt-4o-mini for consistency)

**Impact:**
- Better user control (language + model choice)
- Consistent multilingual experience
- Balanced product comparisons
- Improved readability (clean, benefit-focused answers)
- Lower operational costs (37x cheaper default model)
- Cleaner visual design (simplified source cards)
- Efficient space utilization (no wasted whitespace)
- Full target audience coverage (athletes, fitness enthusiasts, health-conscious people)
- Benefit-focused explanations (not just technical specs)
- Trust and confidence building tone
- Pre and post-purchase support clarity
- Professional inline citation system (verify facts immediately)
- Traceability: which statement comes from which source
- Consistent LLM behavior (temperature 0.3 ensures instruction-following)
- Clickable source links (users can verify original documents)
- Multiple reviews per product (diverse perspectives from different sources)
- Source transparency (users can access original URLs for verification)
- Accurate source attribution (only cited sources shown, matching citation numbers)
- Reliable model selection (dropdown and backend state always in sync)
- Enforced language preference (UI selector respected by LLM)
- Consistent defaults across frontend and backend

### Next Steps
- **Phase 10:** Evaluation Framework (not started)

---

**Last Updated:** 2025-01-15
**Phase:** Phase 9 - Frontend Chat Interface (Completed + Source URL Support + Citation Filtering)
