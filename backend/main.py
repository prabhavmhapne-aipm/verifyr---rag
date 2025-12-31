"""
FastAPI Backend - Phase 6

REST API for the RAG system.
Provides endpoints for health checks, queries, and product information.
"""

import sys
import uuid
import time
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Add current directory to path for imports
sys.path.append(str(Path(__file__).parent))

from retrieval.hybrid_search import HybridSearcher
from generation.llm_client import RAGGenerator

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')


# ============================================================================
# Pydantic Models
# ============================================================================

class QueryRequest(BaseModel):
    """Request model for query endpoint."""
    question: str = Field(..., min_length=1, description="User question")
    model: Optional[str] = Field(default="gpt-4o-mini", description="LLM model to use")
    language: Optional[str] = Field(default="en", description="Response language: 'en' or 'de'")
    conversation_history: Optional[List[Dict[str, str]]] = Field(
        default_factory=list,
        description="Previous messages: [{'role': 'user', 'content': '...'}, {'role': 'assistant', 'content': '...'}]"
    )
    conversation_id: Optional[str] = Field(default=None, description="Conversation ID for tracking")


class Source(BaseModel):
    """Source citation model with URL support."""
    citation_number: int
    product: str
    doc_type: str
    page: int
    file: str
    source_url: Optional[str] = None
    source_name: Optional[str] = None


class QueryResponse(BaseModel):
    """Response model for query endpoint."""
    answer: str
    sources: List[Source]
    query_id: str
    response_time_ms: int
    chunks_retrieved: Optional[int] = None
    model_used: Optional[str] = None
    provider: Optional[str] = None
    tokens_used: Optional[Dict[str, int]] = None
    cost_usd: Optional[float] = None


class HealthResponse(BaseModel):
    """Response model for health endpoint."""
    status: str
    indexes_loaded: bool


class ProductsResponse(BaseModel):
    """Response model for products endpoint."""
    products: List[str]


class ConversationResponse(BaseModel):
    """Response model for conversation endpoint."""
    conversation_id: str
    messages: List[Dict[str, Any]]
    created_at: str
    updated_at: str


class ConversationsListResponse(BaseModel):
    """Response model for conversations list endpoint."""
    conversations: List[Dict[str, Any]]


# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="Verifyr RAG API",
    description="Retrieval-Augmented Generation API for product comparison",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# Mount frontend static files
# frontend/ and Verifyr/ are at project root, main.py is in backend/
project_root = Path(__file__).parent.parent
frontend_path = project_root / "frontend"
verifyr_path = project_root / "Verifyr"

if frontend_path.exists():
    app.mount("/frontend", StaticFiles(directory=str(frontend_path), html=True), name="frontend")
    print(f"✅ Frontend mounted at /frontend from {frontend_path}")
else:
    print(f"⚠️  Frontend directory not found at {frontend_path}")

if verifyr_path.exists():
    app.mount("/Verifyr", StaticFiles(directory=str(verifyr_path)), name="verifyr")
    print(f"✅ Verifyr design system mounted at /Verifyr from {verifyr_path}")
else:
    print(f"⚠️  Verifyr directory not found at {verifyr_path}")

# Global state
hybrid_searcher: Optional[HybridSearcher] = None
rag_generator: Optional[RAGGenerator] = None
products_list: List[str] = []


# ============================================================================
# Startup Event
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize indexes and models on startup."""
    global hybrid_searcher, rag_generator, products_list

    print("\n" + "=" * 60)
    print("🚀 STARTING VERIFYR RAG API")
    print("=" * 60)

    try:
        # Initialize hybrid searcher (loads BM25 and Vector indexes)
        # Use absolute paths from project root
        project_root = Path(__file__).parent.parent
        bm25_path = str(project_root / "data" / "processed" / "bm25_index.pkl")
        qdrant_path = str(project_root / "data" / "qdrant_storage")

        print("\n📥 Loading indexes...")
        hybrid_searcher = HybridSearcher(
            bm25_index_path=bm25_path,
            qdrant_path=qdrant_path
        )

        # Initialize RAG generator with default model
        print("\n🤖 Initializing LLM (GPT-4o Mini)...")
        rag_generator = RAGGenerator(model_name="gpt-4o-mini")

        # Extract unique products from chunks
        if hybrid_searcher.bm25_index.chunks:
            products_set = set()
            for chunk in hybrid_searcher.bm25_index.chunks:
                products_set.add(chunk["product_name"])
            products_list = sorted(list(products_set))

        # Create conversations directory if it doesn't exist
        conversations_dir = project_root / "data" / "conversations"
        try:
            conversations_dir.mkdir(parents=True, exist_ok=True)
            print(f"\n✅ Conversations directory ready at {conversations_dir}")
        except Exception as e:
            print(f"\n⚠️  Warning: Could not create conversations directory: {e}")
            print("   Conversation storage will be disabled")

        print(f"\n✅ Indexes loaded successfully!")
        print(f"   Products available: {len(products_list)}")
        print(f"   Total chunks: {len(hybrid_searcher.bm25_index.chunks)}")
        print(f"   Default model: gpt-4o-mini")
        print("\n" + "=" * 60)
        print("✅ API ready to serve requests!")
        print("=" * 60 + "\n")

    except Exception as e:
        print(f"\n❌ Error during startup: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown."""
    global hybrid_searcher
    
    print("\n" + "=" * 60)
    print("🛑 SHUTTING DOWN VERIFYR RAG API")
    print("=" * 60)
    
    # Close Qdrant client to release file lock
    if hybrid_searcher and hybrid_searcher.vector_store and hybrid_searcher.vector_store.client:
        try:
            # Qdrant client doesn't have an explicit close method, but we can set it to None
            # The connection will be released when the object is garbage collected
            hybrid_searcher.vector_store.client = None
            print("✅ Qdrant client released")
        except Exception as e:
            print(f"⚠️  Error releasing Qdrant client: {e}")
    
    print("✅ Shutdown complete")
    print("=" * 60 + "\n")


# ============================================================================
# Endpoints
# ============================================================================

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {
        "message": "Verifyr RAG API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "query": "/query",
            "products": "/products",
            "docs": "/docs"
        }
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint.

    Returns the status of the API and whether indexes are loaded.
    """
    indexes_loaded = hybrid_searcher is not None

    return HealthResponse(
        status="healthy" if indexes_loaded else "degraded",
        indexes_loaded=indexes_loaded
    )


@app.post("/query", response_model=QueryResponse, tags=["Query"])
async def query(request: QueryRequest):
    """
    Query endpoint - Full RAG Pipeline.

    Performs:
    1. Hybrid search (BM25 + Vector) to retrieve relevant chunks
    2. LLM answer generation with citations
    3. Source extraction and formatting

    Supports multiple models via request.model parameter.
    """
    start_time = time.time()

    # Validate question
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Check if components are loaded
    if hybrid_searcher is None or rag_generator is None:
        raise HTTPException(
            status_code=503,
            detail="Service unavailable: RAG components not loaded"
        )

    try:
        # Step 0: Analyze query to determine retrieval strategy
        query_analysis = hybrid_searcher._analyze_query(request.question)
        
        # Determine retrieval parameters based on analysis
        target_products = query_analysis["target_products"] if query_analysis["target_products"] else None
        apply_diversity = query_analysis["is_comparison"]  # Apply diversity only for comparisons
        top_k = query_analysis["top_k"]
        
        print(f"\n📊 Query Analysis:")
        print(f"   Products: {target_products if target_products else 'All'}")
        print(f"   Type: {'Comparison' if query_analysis['is_comparison'] else 'Single Product'}")
        print(f"   Complexity: {query_analysis['complexity']}")
        print(f"   Top-K: {top_k}")
        
        # Step 1: Perform hybrid search with intelligent parameters
        search_results = hybrid_searcher.search_hybrid(
            query=request.question,
            top_k=top_k,
            retrieve_k=20,
            target_products=target_products,
            apply_diversity=apply_diversity
        )

        # Extract chunks for LLM
        retrieved_chunks = [result["chunk"] for result in search_results]

        # Step 2: Generate answer using LLM
        # Create generator with requested model if different from default
        if request.model and request.model != rag_generator.model_name:
            generator = RAGGenerator(model_name=request.model)
        else:
            generator = rag_generator

        llm_result = generator.generate_answer(
            request.question,
            retrieved_chunks,
            language=request.language or "en",
            conversation_history=request.conversation_history or []
        )

        # Step 3: Format sources
        sources = [
            Source(
                citation_number=s["citation_number"],
                product=s["product"],
                doc_type=s["doc_type"],
                page=s["page"],
                file=s["file"],
                source_url=s.get("source_url"),
                source_name=s.get("source_name")
            )
            for s in llm_result["sources"]
        ]

        # Calculate total response time
        response_time_ms = int((time.time() - start_time) * 1000)

        # Generate query ID
        query_id = str(uuid.uuid4())

        # Step 4: Save conversation to disk (if conversation_id provided)
        if request.conversation_id:
            try:
                project_root = Path(__file__).parent.parent
                conversations_dir = project_root / "data" / "conversations"
                conversation_file = conversations_dir / f"{request.conversation_id}.json"

                # Load existing conversation or create new one
                if conversation_file.exists():
                    with open(conversation_file, 'r', encoding='utf-8') as f:
                        conversation_data = json.load(f)
                else:
                    conversation_data = {
                        "conversation_id": request.conversation_id,
                        "messages": [],
                        "created_at": datetime.now().isoformat(),
                        "updated_at": datetime.now().isoformat()
                    }

                # Append new messages
                conversation_data["messages"].append({
                    "role": "user",
                    "content": request.question,
                    "timestamp": datetime.now().isoformat()
                })
                conversation_data["messages"].append({
                    "role": "assistant",
                    "content": llm_result["answer"],
                    "timestamp": datetime.now().isoformat(),
                    "metadata": {
                        "query_id": query_id,
                        "model_used": llm_result["model_used"],
                        "chunks_retrieved": len(retrieved_chunks)
                    }
                })
                conversation_data["updated_at"] = datetime.now().isoformat()

                # Save to disk
                with open(conversation_file, 'w', encoding='utf-8') as f:
                    json.dump(conversation_data, f, ensure_ascii=False, indent=2)

            except Exception as e:
                # Log error but don't fail the request
                print(f"⚠️  Warning: Could not save conversation {request.conversation_id}: {e}")

        return QueryResponse(
            answer=llm_result["answer"],
            sources=sources,
            query_id=query_id,
            response_time_ms=response_time_ms,
            chunks_retrieved=len(retrieved_chunks),
            model_used=llm_result["model_used"],
            provider=llm_result["provider"],
            tokens_used=llm_result["tokens_used"],
            cost_usd=llm_result["cost_usd"]
        )

    except Exception as e:
        print(f"❌ Error processing query: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.get("/products", response_model=ProductsResponse, tags=["Products"])
async def get_products():
    """
    Get list of available products.

    Returns the list of unique product names in the knowledge base.
    """
    if hybrid_searcher is None:
        raise HTTPException(
            status_code=503,
            detail="Service unavailable: Indexes not loaded"
        )

    return ProductsResponse(products=products_list)


@app.get("/conversations", response_model=ConversationsListResponse, tags=["Conversations"])
async def list_conversations():
    """
    List all conversation IDs.

    Returns a list of conversation IDs and metadata for all saved conversations.
    """
    try:
        project_root = Path(__file__).parent.parent
        conversations_dir = project_root / "data" / "conversations"

        if not conversations_dir.exists():
            return ConversationsListResponse(conversations=[])

        conversations = []
        for conv_file in conversations_dir.glob("*.json"):
            try:
                with open(conv_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                conversations.append({
                    "conversation_id": data.get("conversation_id", conv_file.stem),
                    "created_at": data.get("created_at", ""),
                    "updated_at": data.get("updated_at", ""),
                    "message_count": len(data.get("messages", []))
                })
            except Exception as e:
                print(f"⚠️  Error loading conversation {conv_file}: {e}")
                continue

        # Sort by updated_at descending (most recent first)
        conversations.sort(key=lambda x: x.get("updated_at", ""), reverse=True)

        return ConversationsListResponse(conversations=conversations)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error listing conversations: {str(e)}"
        )


@app.get("/conversations/{conversation_id}", response_model=ConversationResponse, tags=["Conversations"])
async def get_conversation(conversation_id: str):
    """
    Get a specific conversation by ID.

    Returns the full conversation history including all messages.
    """
    try:
        project_root = Path(__file__).parent.parent
        conversations_dir = project_root / "data" / "conversations"
        conversation_file = conversations_dir / f"{conversation_id}.json"

        if not conversation_file.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Conversation {conversation_id} not found"
            )

        with open(conversation_file, 'r', encoding='utf-8') as f:
            conversation_data = json.load(f)

        return ConversationResponse(
            conversation_id=conversation_data["conversation_id"],
            messages=conversation_data["messages"],
            created_at=conversation_data["created_at"],
            updated_at=conversation_data["updated_at"]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading conversation: {str(e)}"
        )


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    print("\n" + "=" * 60)
    print("🚀 PHASE 6: FASTAPI BACKEND SETUP")
    print("=" * 60)
    print("\nStarting server on http://localhost:8000")
    print("API documentation: http://localhost:8000/docs")
    print("=" * 60 + "\n")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
