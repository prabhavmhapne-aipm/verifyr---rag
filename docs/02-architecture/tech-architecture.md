Layer 1: Document Processing
Layer 2: Embedding & Search
Layer 3: Storage & Indexing
Layer 4: LLM Integration
Layer 5: Evaluation
Layer 6: Orchestration & Utilities



FastAPI Backend + HTML Frontend ArchitectureSystem Architecture OverviewUser Browser (Frontend)
    ↕ HTTP Requests (JSON)
FastAPI Backend Server
    ↕ Function Calls
RAG Pipeline (Python Modules)
    ↕ API Calls
External Services (Qdrant + Claude API)



Backend Layers
Layer 1: API Layer (FastAPI routes)

Receives HTTP requests
Validates input
Calls service layer
Formats responses

Layer 2: Service Layer (Business logic)

Query processing orchestration
RAG pipeline coordination
Error handling and logging
Response formatting

Layer 3: RAG Components (Your pipelines)

Hybrid search execution
Context assembly
LLM generation
Source attribution

Layer 4: Data Access (Database interactions)

Qdrant vector search
BM25 index queries
Claude API calls

Error Handling Strategy
Expected Errors:

Empty query → 400 Bad Request
No relevant results found → 200 with "No information found"
Qdrant connection fails → 503 Service Unavailable
Claude API timeout → 504 Gateway Timeout