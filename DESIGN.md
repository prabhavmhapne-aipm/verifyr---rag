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

### Intelligent Query Analysis & Dynamic Retrieval
- **Method:** Query analysis → Product filtering → Hybrid search with adaptive diversity
- **Analysis:** Detects product mentions, comparison intent, and query complexity
- **Adaptive Top-K:** Dynamically adjusts chunk count based on query type:
  - **Complex queries:** 8 chunks (how-to, detailed explanations)
  - **Comparison queries:** 5 chunks (balanced product representation)
  - **Simple queries:** 5 chunks (factual, single-answer)
- **Rationale:** Optimizes retrieval based on query intent for better context and efficiency

### Query Analysis (`_analyze_query` method)
**Product Detection:**
- Identifies mentioned products via keyword matching (Apple Watch, Garmin, Series 11, Forerunner 970)
- Returns `target_products` list for filtering

**Comparison Detection:**
- Detects comparison intent via keywords: "compare", "versus", "difference", "better", "between"
- German equivalents: "vergleich", "unterschied", "besser", "zwischen"
- Both products mentioned = automatic comparison detection

**Complexity Detection:**
- Identifies complex queries: "how", "why", "explain", "guide", "setup"
- German equivalents: "wie", "warum", "erklären", "anleitung"
- Multiple questions or long queries (>15 words) = complex

**Retrieval Strategy Selection:**
- **Single product query:** Filters chunks to that product only, no diversity
- **Comparison query:** Retrieves from all products, applies diversity balancing
- **Complex query:** Retrieves more chunks (8) with diversity when multiple products present

### Hybrid Search with Product Diversity
- **Method:** Reciprocal Rank Fusion (RRF) with intelligent diversity enhancement
- **BM25 Top-K:** 20 results
- **Vector Top-K:** 20 results
- **RRF Formula:** `score = 1 / (60 + rank)`
- **Final Top-K:** Dynamic (5 for simple/comparison, 8 for complex)
- **Rationale:** Combines strengths of both semantic and keyword search. RRF normalizes scores without needing weight tuning.

### Product Diversity Algorithm
**Problem Addressed:** Pure relevance ranking could return all chunks from one product, preventing meaningful comparisons.

**Solution:** `_ensure_product_diversity()` method ensures balanced representation with intelligent application:

1. **Query-Based Application:**
   - Single product queries: Diversity disabled, only relevant product chunks
   - Comparison queries: Diversity enabled, balanced product representation
   - Complex queries: Diversity enabled when multiple products detected

2. **Diversity Enforcement** (when enabled):
   - **First Pass**: Select top-K chunks by RRF score
   - **Product Tracking**: Count chunks from each product
   - **Minimum Calculation**: `max(1, top_k // 2)` chunks per product
     - For top_k=5: ensures 2-3 split (at least 2 per product)
     - For top_k=8: ensures 3-4 split (at least 3 per product)
   - **Replacement Logic**: If product under-represented, replace lowest-scoring chunk from over-represented product
   - **Early Termination**: Stops when balance achieved

**Example** (top-5 comparison query):
- Without diversity: [Apple Watch × 5, Garmin × 0] ❌
- With diversity: [Apple Watch × 3, Garmin × 2] or [Apple Watch × 2, Garmin × 3] ✅

**Example** (single product query):
- Query: "Apple Watch battery life"
- Result: [Apple Watch × 5] ✅ (all chunks from Apple Watch, no Garmin)

**Impact:**
- Single product queries get focused, relevant chunks
- Comparison queries get balanced representation from both products
- Complex queries get sufficient context with proper diversity
- LLM receives optimal context for each query type

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

### Intelligent Retrieval Features
- **Query Analysis:** Automatic detection of product mentions, comparison intent, and complexity
- **Product Filtering:** Single-product queries only retrieve relevant product chunks
- **Adaptive Diversity:** Comparison queries ensure balanced 50/50 split (e.g., 3-2 or 2-3 for top_k=5)
- **Dynamic Chunk Count:** 5 chunks for simple/comparison queries, 8 chunks for complex queries
- **Improved Balance:** Minimum `top_k // 2` chunks per product (was `top_k // 3`)

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

## Evaluation Framework

### Overview

The project uses a **2-tier evaluation strategy**:
- **Phase 11:** Langfuse observability & tracing (infrastructure)
- **Phase 12:** Comprehensive RAG evaluation with RAGAS & retrieval metrics (quality measurement)

### Evaluation Tools & Infrastructure

**Phase 11: Langfuse v3 (Observability Foundation - ✅ Implemented)**
- **Tool:** Langfuse v3 (open-source LLM observability platform)
- **Deployment:** Local Docker Compose (http://localhost:3000)
- **Services:**
  - Langfuse (port 3000) - Main platform
  - PostgreSQL (port 5432) - Transactional database
  - Redis (port 6379) - Cache and queue
  - ClickHouse (ports 8123, 9000) - Analytics database (required for v3)
  - MinIO (ports 9001, 9002) - S3-compatible blob storage (required for v3)
- **Rationale:**
  - Open-source and self-hosted (no external dependencies, data privacy)
  - Built-in tracing for RAG pipelines (retrieval + generation spans)
  - Automatic cost and token tracking across all LLM calls
  - Dataset management for test cases
  - Evaluation dashboard with comparison capabilities
  - Supports batch evaluation workflows
  - Integrates with RAGAS for automated metrics (future)
  - No vendor lock-in (runs locally, data stays local)

**Phase 11 Implementation Status:**
- ✅ Docker Compose infrastructure deployed
- ✅ Langfuse client integrated in backend (`backend/main.py`)
- ✅ Trace creation for each query
- ✅ Spans for retrieval and generation phases
- ✅ Metadata tracking (tokens, costs, response times)
- ✅ Batch evaluation script (`tests/langfuse_evaluator.py`)
- ✅ Langfuse Dataset creation (tested and working)
- ⚠️ **Trace-to-dataset linking** (uses manual `item.run()` approach - may fail if Langfuse server has connection issues)
- ✅ Command-line argument support for non-interactive evaluation
- ✅ Environment variable loading from .env file
- 📋 **Recommended Migration:** Switch to Experiment Runner (`dataset.run_experiment()`) for automatic trace linking and better reliability

**Phase 12: Comprehensive RAG Evaluation using Experiment Runner (Planned)**
- **Framework:** Langfuse Experiment Runner with RAGAS (Retrieval Augmented Generation Assessment)
- **Implementation Approach:** Infrastructure-first setup (task function with `@observe` decorator), then incremental evaluator addition
- **Scope:** 8 metrics across retrieval and generation
- **Test Dataset:** 50 cases (Phase 1) → 75 cases (Phase 2) → 150+ cases (Phase 3)
- **Timeline:**
  - Phase 1 (Baseline): 50 test cases, 8 metrics, baseline evaluation using Experiment Runner
  - Phase 2 (Expand): +25 RAGAS-generated synthetic cases, re-run with Experiment Runner
  - Phase 3 (Production): User feedback, weekly monitoring using Experiment Runner, grow to 150+ cases

**8 Metrics (Phase 12):**
1. **Retrieval Metrics (3):**
   - Hit Rate @ 5: Did we retrieve ≥1 relevant chunk? (Target: >85%)
   - MRR: Rank of first relevant chunk (Target: >0.7)
   - Precision @ 5: % of top-5 that are relevant (Target: >0.6)

2. **RAGAS Metrics (3):**
   - Faithfulness: No hallucinations (Target: >0.95)
   - Answer Relevancy: Answers the question (Target: >0.85)
   - Context Relevancy: Retrieved chunks useful (Target: >0.7)

3. **Custom Metrics (2):**
   - Citation Quality: Sources correctly cited (Target: >0.85)
   - Helpfulness: Clear & actionable (Target: >0.8)

**Rationale for RAGAS:**
- Industry-standard framework for RAG evaluation
- Automated quality metrics without manual labeling
- LLM-as-a-judge for generation quality
- Integrates with Langfuse for score logging
- Open-source and actively maintained

### Evaluation Structure

**Phase 11 Test Dataset (✅ Implemented):**
- **Size:** 15 test cases
- **Location:** `tests/test_cases.py`
- **Purpose:** Basic Langfuse infrastructure testing
- **Categories:** 5 factual, 5 comparison, 5 complex
- **Language Coverage:** 10 English, 5 German

**Phase 12 Test Dataset (Planned):**
- **Phase 1 (Baseline):** 50 hand-written test cases
  - Distribution: 30 German (60%), 20 English (40%)
  - Categories: 20 factual, 15 comparison, 10 complex, 3 edge cases, 2 adversarial
  - Ground Truth: 25 cases (50%) with expected answers
  - All 50 cases with expected chunks for retrieval metrics

- **Phase 2 (Expand):** 75 total test cases
  - Original 50 hand-written cases
  - +25 RAGAS-generated synthetic cases (reviewed and filtered)

- **Phase 3 (Production):** 150+ test cases
  - Grow organically by adding failing production queries
  - Target: 10-20 new cases per month
  - Maintain 60% German / 40% English split

**Test Case Structure (Phase 12):**
```python
{
    "question": "Was ist die Akkulaufzeit der Apple Watch Series 11?",
    "expected_answer": "18 Stunden bei normaler Nutzung",  # Ground truth
    "expected_chunks": ["apple_watch_manual_p5_c1"],  # For retrieval eval
    "category": "factual",
    "language": "de",
    "expected_products": ["Apple Watch Series 11"],
    "tags": ["battery", "specifications"]
}
```

**Phase 11 Workflow (✅ Implemented - Current Approach):**
1. **Dataset Creation:** Test cases → Langfuse Dataset
2. **Batch Execution:** `tests/langfuse_evaluator.py` runs 15 test cases
   - **Current:** Uses manual `item.run()` context manager
   - **Limitation:** Trace linking may fail if Langfuse server has connection issues
3. **Trace Collection:** Langfuse captures retrieval + generation spans
4. **Trace Linking:** Dataset runs linked to execution traces (when `item.run()` succeeds)
5. **Results Export:** JSON saved to `data/evaluation_results/`
6. **Dashboard:** View in Langfuse UI (http://localhost:3000)

**Recommended Workflow (Experiment Runner - Future Migration):**
1. **Dataset Creation:** Test cases → Langfuse Dataset
2. **Task Function:** Define RAG task with `@observe` decorator that calls backend API
   - Signature: `def rag_task(*, item, **kwargs)`
   - Returns: `{"answer": str, "sources": list, "retrieved_chunks": list}`
3. **Evaluators:** Define custom and RAGAS evaluators
   - Signature: `def evaluator(*, item, output, **kwargs)`
   - Return: `Evaluation(name="metric_name", value=score)`
4. **Experiment Execution:** `dataset.run_experiment(task=rag_task, evaluators=[...])`
   - **Benefits:** Automatic trace linking, error isolation, concurrent execution
   - **Evaluators:** Add custom metrics (retrieval + generation) and RAGAS evaluators
5. **Automatic Trace Linking:** Experiment Runner handles all trace-to-dataset linking
6. **Results:** Use `result.format()` to display, call `langfuse.flush()` to ensure data is sent
7. **View in Dashboard:** All metrics automatically attached to traces in Langfuse UI

**Phase 12 Workflow (Planned - Using Experiment Runner):**
1. **Test Case Creation:** 50 hand-written cases in `tests/test_cases_phase12.py`
2. **Experiment Runner Infrastructure Setup:** Create task function with `@observe` decorator that calls backend API
   - Signature: `def rag_task(*, item, **kwargs)`
   - Returns: `{"answer": str, "sources": list, "retrieved_chunks": list}`
3. **Incremental Evaluator Addition:**
   - **Step 1:** Add retrieval evaluators (Hit Rate, MRR, Precision) - no LLM cost
   - **Step 2:** Add custom evaluators (Citation Quality, Helpfulness) - LLM-as-a-judge
   - **Step 3:** Add RAGAS evaluators (Faithfulness, Answer Relevancy, Context Relevancy) - async evaluators
4. **Experiment Execution:** `dataset.run_experiment(task=rag_task, evaluators=[...])`
   - Combines all evaluators in single call
   - Automatic trace linking to dataset items
   - Error isolation (individual failures don't stop experiment)
5. **Results Processing:** Use `result.format()` to display, call `langfuse.flush()` to ensure data is sent
6. **Score Logging:** All 8 metrics automatically attached to traces in Langfuse UI
7. **Aggregate Analysis:** Calculate averages, pass rates, trends
8. **Results Export:** JSON + summary report
9. **Iteration:** Fix issues, re-run, compare metrics

**Evaluation Script:** `tests/evaluator_complete.py`
```bash
# Phase 12 usage
python tests/evaluator_complete.py --model claude-sonnet-4.5
python tests/evaluator_complete.py --model gpt-4o --max-tests 10
```

### Evaluation Metrics

**Phase 11 Metrics (✅ Implemented):**
- **Success Rate:** Percentage of queries that complete successfully
  - Current: 100% (15/15 test cases)
  - Tracked by: Evaluation script
- **Response Times:** End-to-end query latency
  - Average: ~3,704 ms (measured from initial evaluation)
  - Min: 1,737 ms
  - Max: 7,168 ms
  - Tracked by: Langfuse traces + evaluation script
- **Retrieval Metrics:**
  - Chunks Retrieved: Average number of chunks per query
    - Current: 2.4 chunks/query (measured)
  - Sources per Answer: Average number of cited sources
    - Current: 1.33 sources/answer (measured)
  - Tracked by: Evaluation script + Langfuse retrieval spans
- **Cost Metrics:**
  - Total Tokens: Sum of input + output tokens
  - Total Cost: Aggregate cost across all queries
  - Avg Cost/Query: Average cost per successful query
  - Current (GPT-4o Mini): $0.003662 total, $0.000244/query (15 queries)
  - Tracked by: Langfuse generation spans + evaluation script
- **Category Performance:** Success rate by query type
  - Factual: 100% (5/5)
  - Comparison: 100% (5/5)
  - Complex: 100% (5/5)
- **Language Performance:** Success rate by language
  - English: 100% (10/10)
  - German: 100% (5/5)

**Phase 12 Metrics (Planned - 8 Total):**

**1. Retrieval Metrics (3 - No LLM Cost):**
- **Hit Rate @ 5:** >85%
  - Measures: Did we retrieve ≥1 relevant chunk in top-5?
  - Implementation: Compare retrieved chunks to expected_chunks
  - Cost: Free (simple comparison)

- **Mean Reciprocal Rank (MRR):** >0.7
  - Measures: Rank of first relevant chunk
  - Formula: 1/rank (e.g., rank 2 = 0.5, rank 3 = 0.33)
  - Cost: Free

- **Precision @ 5:** >0.6
  - Measures: % of top-5 chunks that are relevant
  - Formula: (relevant chunks in top-5) / 5
  - Cost: Free

**2. RAGAS Metrics (3 - Uses GPT-4o for judging):**
- **Faithfulness:** >0.95
  - Measures: Answer grounded in retrieved chunks (no hallucinations)
  - Method: RAGAS LLM-as-a-judge
  - Cost: ~$0.015 per test case

- **Answer Relevancy:** >0.85
  - Measures: How well answer addresses the question
  - Method: RAGAS LLM-as-a-judge
  - Cost: ~$0.015 per test case

- **Context Relevancy:** >0.7
  - Measures: Are retrieved chunks useful for answering?
  - Method: RAGAS analysis
  - Cost: ~$0.015 per test case

**3. Custom Metrics (2 - Uses GPT-4o for judging):**
- **Citation Quality:** >0.85
  - Measures: Are sources correctly cited in answer?
  - Method: Custom LLM-as-a-judge prompt
  - Cost: ~$0.01 per test case

- **Helpfulness:** >0.8
  - Measures: Is answer clear, actionable, and useful?
  - Method: Custom LLM-as-a-judge prompt
  - Cost: ~$0.01 per test case

**Cost Estimation (Phase 12):**
- Per test case: ~$0.065 (3 RAGAS + 2 custom)
- 50 test cases: ~$3.25 per run
- 75 test cases: ~$4.90 per run
- Monthly (4 runs): ~$13-20/month

**Performance Metrics (Automatic via Langfuse):**
- **API Startup Time:** ~3 seconds (loads indexes)
- **Response Time:** 3-7 seconds (end-to-end query to answer, varies by query complexity)
- **Chunk Retrieval Time:** ~100-200ms (hybrid search, tracked in retrieval span)
- **LLM Generation Time:** ~2-6 seconds (varies by model, tracked in generation span)
- **Index Load Time:** 2.5 seconds (BM25 + Vector indexes)
- **Cost per Query:** Tracked automatically (varies by model: $0.000244 to ~$0.003468)

**Cost Tracking:**
- **Per-Query Cost:** Automatically calculated by Langfuse
- **Model Comparison:** Compare costs across 4 models (GPT-4o-mini, GPT-4o, Claude Haiku, Claude Sonnet)
- **Token Usage:** Input/output tokens tracked per query
- **Budget Management:** Aggregate costs visible in dashboard

### Evaluation Rationale

**Why 2-Tier Approach (Phase 11 + Phase 12):**
1. **Phase 11 (Langfuse):** Infrastructure for observability
   - Tracing every query in production
   - Cost and latency tracking
   - Error monitoring
   - Dataset management
   - **Current Implementation:** Manual `item.run()` approach
   - **Recommended:** Migrate to Experiment Runner for better reliability

2. **Phase 12 (RAGAS + Metrics):** Quality measurement
   - Systematic quality assessment
   - Retrieval quality (Hit Rate, MRR, Precision)
   - Generation quality (RAGAS metrics)
   - Custom domain-specific metrics
   - **Implementation:** Uses Experiment Runner as primary approach
     - Infrastructure-first: Set up task function with `@observe` decorator
     - Incremental evaluator addition: retrieval → custom → RAGAS
     - All evaluators combined in `dataset.run_experiment()` call
     - No manual loops or `item.run()` - Experiment Runner handles everything

**Why RAGAS:**
- Industry-standard RAG evaluation framework
- Automated LLM-as-a-judge (no manual labeling)
- Specifically designed for RAG systems
- Integrates with Langfuse for score logging
- Open-source and battle-tested

**Why Focus on 8 Metrics (Not More):**
- **Retrieval (3):** Essential for knowing if relevant info is retrieved
- **RAGAS (3):** Industry-standard generation quality
- **Custom (2):** Domain-specific (citations, helpfulness)
- Avoids metric overload while covering all critical dimensions

**Evaluation Frequency:**
- **Phase 11:** ✅ Completed (2026-01-01) - 15 test cases (manual `item.run()` approach)
- **Phase 12 Implementation:** ✅ Uses Experiment Runner as primary approach (infrastructure first, then evaluators)
- **Phase 12 Phase 1:** Baseline with 50 cases (using Experiment Runner)
- **Phase 12 Phase 2:** Expand to 75 cases (add synthetic, re-run with Experiment Runner)
- **Phase 12 Phase 3:** Grow to 150+ cases over 3 months (weekly monitoring using Experiment Runner)
- **Production:** Weekly monitoring + continuous test set growth (all using Experiment Runner)

**Experiment Runner Benefits:**
- **Automatic Trace Linking:** No manual `item.run()` context management
- **Error Isolation:** Individual failures don't stop entire experiment
- **Concurrent Execution:** Configurable parallel processing
- **Evaluator Support:** Easy integration of custom and RAGAS evaluators
- **Better Reliability:** Handles connection errors gracefully
- **Cleaner Code:** Less boilerplate, more maintainable

**Success Criteria (Phase 12):**
- ✅ All retrieval metrics >targets (Hit Rate >85%, MRR >0.7, Precision >0.6)
- ✅ All RAGAS metrics >targets (Faithfulness >0.95, Relevancy >0.85, Context >0.7)
- ✅ All custom metrics >targets (Citation >0.85, Helpfulness >0.8)
- ✅ Test set grows 10-20% per month
- ✅ Production metrics align with test set (±10%)

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
- **Design System:** Verifyr design system (`design-system/design-system.css`)
- **Server:** FastAPI on port 8000
- **Files:**
  - `frontend/index.html` - Landing page
  - `frontend/chat.html` - Chat interface
  - `frontend/app.js` - Chat logic and API integration
  - `frontend/styles.css` - Chat-specific styles with design system tokens
  - `frontend/design-system/` - Design tokens and components

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
- ✅ **Phase 1:** PDF Text Extraction (250 pages from 12 PDFs)
- ✅ **Phase 2:** Text Chunking (1,689 chunks created)
- ✅ **Phase 3:** Vector Embeddings & Qdrant (384-dim embeddings indexed)
- ✅ **Phase 4:** BM25 Keyword Index (159k tokens indexed)
- ✅ **Phase 5:** Hybrid Search with RRF (operational)
- ✅ **Phase 6:** FastAPI Backend (REST API operational)
- ✅ **Phase 7:** Multi-Model LLM Integration (4 models supported)
- ✅ **Phase 8:** Full Pipeline Integration (end-to-end RAG working)
- ✅ **Phase 9:** Frontend Chat Interface (web UI with design system integration)
- ✅ **Phase 10:** Conversation Management & Multi-Turn Support (conversation history, localStorage, sidebar UI)
- ✅ **Phase 11:** Evaluation Framework with Langfuse (15 test cases, batch evaluation, metrics tracking)

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
- 🧠 Intelligent query analysis (product detection, comparison intent, complexity)
- 🎯 Dynamic chunk retrieval (adaptive top_k based on query type)
- ⚖️ Improved product diversity (balanced 50/50 splits for comparisons)
- 🔍 Product filtering (single-product queries only retrieve relevant chunks)
- 💬 Multi-turn conversations with context retention (conversation history)
- 💾 Conversation persistence (localStorage + backend JSON storage)
- 🗂️ Conversation management (create, load, switch, list conversations)
- 📋 Conversation sidebar UI (responsive, design system integrated)
- 🔄 Follow-up question support (context-aware responses)
- 📡 Conversation API endpoints (GET /conversations, GET /conversations/{id})

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
- **Production Optimization:** Expand test dataset, implement RAGAS metrics, define success thresholds
- **Production Deployment:** Infrastructure setup, monitoring, scaling considerations

---

**Last Updated:** 2026-01-01
**Phase:** Phase 11 - Evaluation Framework with Langfuse (Completed)
