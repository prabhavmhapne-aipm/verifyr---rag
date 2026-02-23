"""
FastAPI Backend - Phase 6

REST API for the RAG system.
Provides endpoints for health checks, queries, and product information.
"""

import sys
import uuid
import time
import json
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

# Add backend directory to path for imports (must be before local imports)
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from auth_middleware import (
    AuthUser,
    get_current_user,
    get_optional_user,
    require_admin,
    get_config,
    get_supabase_admin_client
)

# Try to import Langfuse (optional - server works without it)
try:
    from langfuse import Langfuse
    LANGFUSE_AVAILABLE = True
except (ImportError, Exception) as e:
    LANGFUSE_AVAILABLE = False
    Langfuse = None
    # Use ASCII-safe warning message to avoid encoding issues
    print("WARNING: Langfuse not available - " + str(e))
    print("   Tracing will be disabled")
    print("   Server will continue without Langfuse observability")

# Load environment variables from .env file
load_dotenv()

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
    model: Optional[str] = Field(default="gpt-5-mini", description="LLM model to use")
    language: Optional[str] = Field(default="en", description="Response language: 'en' or 'de'")
    conversation_history: Optional[List[Dict[str, str]]] = Field(
        default_factory=list,
        description="Previous messages: [{'role': 'user', 'content': '...'}, {'role': 'assistant', 'content': '...'}]"
    )
    conversation_id: Optional[str] = Field(default=None, description="Conversation ID for tracking")
    skip_langfuse_trace: Optional[bool] = Field(default=False, description="Skip Langfuse trace creation (for experiment runs where trace is created externally)")


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
    retrieved_chunks: Optional[List[Dict[str, Any]]] = None  # For evaluation metrics
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


class QuizAnswers(BaseModel):
    """Request model for quiz scoring endpoint."""
    category: str = Field(..., description="Selected category ID")
    useCases: List[str] = Field(..., description="Selected use case IDs")
    features: List[str] = Field(..., description="Selected feature IDs (max 5)")


class MatchedProduct(BaseModel):
    """Model for a matched product with score and reasons."""
    product_id: str
    match_score: float = Field(..., ge=0, le=1, description="Match score between 0 and 1")
    match_reasons: List[str]


class QuizResultsResponse(BaseModel):
    """Response model for quiz scoring endpoint."""
    matched_products: List[MatchedProduct]
    quiz_summary: Dict[str, Any]


class ProductsMetadataResponse(BaseModel):
    """Response model for products metadata endpoint."""
    products: List[Dict[str, Any]]
    categories: Optional[Dict[str, Any]] = None
    use_cases_metadata: Optional[Dict[str, Any]] = None
    features_metadata: Optional[Dict[str, Any]] = None


class ProductRecommendationResponse(BaseModel):
    """Response model for product recommendation endpoint."""
    product: Dict[str, Any]


class InviteUserRequest(BaseModel):
    """Request model for inviting a user."""
    email: str = Field(..., description="Email address of the user to invite")


class InviteUserResponse(BaseModel):
    """Response model for user invitation."""
    success: bool
    message: str
    user_id: Optional[str] = None


# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="Verifyr RAG API",
    description="Retrieval-Augmented Generation API for product comparison",
    version="1.0.0"
)

# Configure CORS - Allow all origins for local development
# This enables dev-tools.html to work when opened directly from file system
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local dev (file://, localhost, etc.)
    allow_credentials=False,  # Must be False when using allow_origins=["*"]
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Mount frontend static files at root
# frontend/ is at project root, main.py is in backend/
project_root = Path(__file__).parent.parent
frontend_path = project_root / "frontend"

# Mount static files (this will handle /chat.html, /design-system/, /images/, etc.)
if frontend_path.exists():
    print(f"✅ Frontend directory found at {frontend_path}")
else:
    print(f"⚠️  Frontend directory not found at {frontend_path}")

# Global state
hybrid_searcher: Optional[HybridSearcher] = None
rag_generator: Optional[RAGGenerator] = None
products_list: List[str] = []
langfuse_client: Optional[Langfuse] = None
products_metadata: Optional[Dict[str, Any]] = None


# ============================================================================
# Startup Event
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize indexes and models on startup."""
    global hybrid_searcher, rag_generator, products_list, langfuse_client, products_metadata

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
        print("\n🤖 Initializing LLM (GPT-5 Mini)...")
        rag_generator = RAGGenerator(model_name="gpt-5-mini")

        # Initialize Langfuse client (Phase 11)
        langfuse_client = None
        if LANGFUSE_AVAILABLE:
            try:
                langfuse_host = os.getenv("LANGFUSE_HOST", "http://localhost:3000")
                langfuse_public_key = os.getenv("LANGFUSE_PUBLIC_KEY")
                langfuse_secret_key = os.getenv("LANGFUSE_SECRET_KEY")

                if langfuse_public_key and langfuse_secret_key:
                    langfuse_client = Langfuse(
                        host=langfuse_host,
                        public_key=langfuse_public_key,
                        secret_key=langfuse_secret_key
                    )
                    print(f"\n📊 Langfuse initialized successfully!")
                    print(f"   Host: {langfuse_host}")
                else:
                    print("\n⚠️  Langfuse API keys not found in environment")
                    print("   Tracing will be disabled")
                    print("   Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY to enable")
            except Exception as e:
                print(f"\n⚠️  Could not initialize Langfuse: {e}")
                print("   Tracing will be disabled")
                langfuse_client = None
        else:
            print("\n⚠️  Langfuse SDK not available (import failed)")
            print("   Tracing will be disabled")
            print("   Server will continue without Langfuse observability")

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

        # Load products metadata for quiz functionality
        products_metadata_path = project_root / "data" / "products_metadata.json"
        try:
            if products_metadata_path.exists():
                with open(products_metadata_path, 'r', encoding='utf-8') as f:
                    products_metadata = json.load(f)
                print(f"\n✅ Products metadata loaded!")
                print(f"   Products: {len(products_metadata.get('products', []))}")
                print(f"   Categories: {len(products_metadata.get('categories', {}))}")
                print(f"   Use cases: {len(products_metadata.get('use_cases_metadata', {}))}")
                print(f"   Features: {len(products_metadata.get('features_metadata', {}))}")
            else:
                print(f"\n⚠️  Products metadata file not found at {products_metadata_path}")
                print("   Quiz endpoints will not be available")
                products_metadata = None
        except Exception as e:
            print(f"\n⚠️  Error loading products metadata: {e}")
            print("   Quiz endpoints will not be available")
            products_metadata = None

        print(f"\n✅ Indexes loaded successfully!")
        print(f"   Products available: {len(products_list)}")
        print(f"   Total chunks: {len(hybrid_searcher.bm25_index.chunks)}")
        print(f"   Default model: gpt-5-mini")
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

@app.get("/api", tags=["Root"])
async def api_info():
    """API information endpoint."""
    return {
        "message": "Verifyr RAG API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "config": "/config",
            "query": "/query",
            "products": "/products",
            "products_metadata": "/products/metadata",
            "quiz_score": "/quiz/score",
            "product_recommendation": "/products/recommendations/{product_id}",
            "conversations": "/conversations",
            "admin": "/admin/*",
            "docs": "/docs"
        }
    }


@app.get("/config", tags=["Config"])
async def get_public_config():
    """
    Get public configuration for the frontend.

    Returns Supabase URL, anon key, and signup enabled flag.
    This endpoint is public and does not require authentication.
    """
    return get_config()


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
async def query(
    request: QueryRequest,
    user: AuthUser = Depends(get_current_user)
):
    """
    Query endpoint - Full RAG Pipeline.

    Requires authentication.

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

    # Initialize Langfuse trace if available
    # Skip trace creation if called from evaluator (trace will be created by item.run())
    trace = None
    retrieval_span = None
    generation_span = None

    try:
        if langfuse_client and not request.skip_langfuse_trace:
            trace_metadata = {
                "conversation_id": request.conversation_id,
                "has_history": len(request.conversation_history) > 0
            }
            
            trace = langfuse_client.trace(
                name="rag_query",
                input={"question": request.question, "model": request.model, "language": request.language},
                metadata=trace_metadata
            )
    except Exception as e:
        print(f"⚠️  Langfuse trace creation failed: {e}")
        trace = None

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
        retrieval_start = time.time()

        try:
            if trace:
                retrieval_span = trace.span(
                    name="hybrid_search",
                    input={"query": request.question, "top_k": top_k, "target_products": target_products}
                )
        except Exception as e:
            print(f"⚠️  Langfuse retrieval span creation failed: {e}")
            retrieval_span = None

        search_results = hybrid_searcher.search_hybrid(
            query=request.question,
            top_k=top_k,
            retrieve_k=20,
            target_products=target_products,
            apply_diversity=apply_diversity
        )

        # Extract chunks for LLM
        retrieved_chunks = [result["chunk"] for result in search_results]

        retrieval_time_ms = int((time.time() - retrieval_start) * 1000)

        try:
            if retrieval_span:
                retrieval_span.end(
                    output={"chunks_retrieved": len(retrieved_chunks), "retrieval_time_ms": retrieval_time_ms},
                    metadata={"top_scores": [r.get("rrf_score", 0) for r in search_results[:3]]}
                )
        except Exception as e:
            print(f"⚠️  Langfuse retrieval span end failed: {e}")

        # Step 2: Generate answer using LLM
        generation_start = time.time()

        try:
            if trace:
                generation_span = trace.span(
                    name="llm_generation",
                    input={"question": request.question, "chunks_count": len(retrieved_chunks), "model": request.model}
                )
        except Exception as e:
            print(f"⚠️  Langfuse generation span creation failed: {e}")
            generation_span = None

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

        generation_time_ms = int((time.time() - generation_start) * 1000)

        try:
            if generation_span:
                generation_span.end(
                    output={"answer": llm_result["answer"], "sources_count": len(llm_result["sources"])},
                    metadata={
                        "model_used": llm_result["model_used"],
                        "provider": llm_result["provider"],
                        "tokens_used": llm_result["tokens_used"],
                        "cost_usd": llm_result["cost_usd"],
                        "generation_time_ms": generation_time_ms
                    }
                )
        except Exception as e:
            print(f"⚠️  Langfuse generation span end failed: {e}")

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

        # Complete Langfuse trace
        try:
            if trace:
                trace.update(
                    output={
                        "answer": llm_result["answer"],
                        "sources": [s for s in llm_result["sources"]],
                        "query_id": query_id
                    },
                    metadata={
                        "response_time_ms": response_time_ms,
                        "chunks_retrieved": len(retrieved_chunks),
                        "model_used": llm_result["model_used"],
                        "provider": llm_result["provider"],
                        "tokens_used": llm_result["tokens_used"],
                        "cost_usd": llm_result["cost_usd"]
                    }
                )
        except Exception as e:
            print(f"⚠️  Langfuse trace update failed: {e}")

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
                        "user_id": user.id,
                        "user_email": user.email,
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
            retrieved_chunks=retrieved_chunks,  # Include for evaluation metrics
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


@app.get("/products/metadata", response_model=ProductsMetadataResponse, tags=["Products"])
async def get_products_metadata(
    category: Optional[str] = None,
    user: AuthUser = Depends(get_optional_user)
):
    """
    Get structured product metadata for quiz and comparison.

    Requires authentication (optional - returns limited data for anonymous users).

    Returns:
    - Full product specifications
    - Use case ratings
    - Feature priority ratings
    - Categories, use cases, and features metadata

    Optional query parameter:
    - category: Filter products by category ID
    """
    if products_metadata is None:
        raise HTTPException(
            status_code=503,
            detail="Service unavailable: Products metadata not loaded"
        )

    # Filter products by category if specified
    if category:
        filtered_products = [
            p for p in products_metadata["products"]
            if p["category"] == category
        ]
    else:
        filtered_products = products_metadata["products"]

    return ProductsMetadataResponse(
        products=filtered_products,
        categories=products_metadata.get("categories"),
        use_cases_metadata=products_metadata.get("use_cases_metadata"),
        features_metadata=products_metadata.get("features_metadata")
    )


@app.post("/quiz/score", response_model=QuizResultsResponse, tags=["Quiz"])
async def score_quiz(
    quiz_answers: QuizAnswers,
    user: Optional[AuthUser] = Depends(get_optional_user)
):
    """
    Score user's quiz answers and return ranked product matches.

    Authentication is OPTIONAL. Anonymous users can submit quiz.
    If authenticated, user_id is tracked for analytics.

    Scoring algorithm:
    - Category match: 40% weight (binary: matches or doesn't)
    - Use cases: 35% weight (average rating of selected use cases)
    - Features: 25% weight (average rating of selected features)

    Input:
    - category: Single category ID (e.g., "smartwatch", "running_watch")
    - useCases: Array of use case IDs (e.g., ["running", "swimming", "health_tracking"])
    - features: Array of feature IDs, max 5 (e.g., ["long_battery", "health_sensors", "gps_accuracy"])

    Returns:
    - Ranked list of products with match scores (0-1)
    - Match reasons for each product
    - Quiz summary
    """
    # Track user (authenticated or anonymous)
    user_id = user.id if user else "anonymous"
    print(f"Quiz submission from user: {user_id}")

    if products_metadata is None:
        raise HTTPException(
            status_code=503,
            detail="Service unavailable: Products metadata not loaded"
        )

    # Validate inputs
    if not quiz_answers.category:
        raise HTTPException(status_code=400, detail="Category is required")

    if not quiz_answers.useCases or len(quiz_answers.useCases) == 0:
        raise HTTPException(status_code=400, detail="At least one use case is required")

    if not quiz_answers.features or len(quiz_answers.features) == 0:
        raise HTTPException(status_code=400, detail="At least one feature is required")

    if len(quiz_answers.features) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 features allowed")

    # Get scoring weights
    weights = products_metadata.get("scoring_weights", {
        "category": 0.40,
        "use_cases": 0.35,
        "features": 0.25
    })

    matched_products = []

    # Score each product
    for product in products_metadata["products"]:
        product_id = product["id"]
        scores = {"category": 0, "use_cases": 0, "features": 0}
        reasons = []

        # 1. Category Match (40% weight)
        product_category = product["category"]
        # Check if product's category matches OR if product is in the selected category's products list
        category_data = products_metadata.get("categories", {}).get(quiz_answers.category, {})
        category_products = category_data.get("products", [])

        if product_category == quiz_answers.category or product_id in category_products:
            scores["category"] = 1.0
            reasons.append(f"Matches your selected category: {category_data.get('name', {}).get('en', quiz_answers.category)}")
        else:
            scores["category"] = 0.0

        # 2. Use Cases Match (35% weight)
        use_case_ratings = []
        use_case_details = []
        for use_case_id in quiz_answers.useCases:
            if use_case_id in product.get("use_cases", {}):
                use_case_data = product["use_cases"][use_case_id]
                rating = use_case_data.get("rating", 0)
                use_case_ratings.append(rating / 5.0)  # Normalize to 0-1

                # Add reason if rating is high (4 or 5)
                if rating >= 4:
                    use_case_name = products_metadata.get("use_cases_metadata", {}).get(use_case_id, {}).get("name", {}).get("en", use_case_id)
                    use_case_details.append(f"{use_case_name} ({rating}/5 rating)")

        if use_case_ratings:
            scores["use_cases"] = sum(use_case_ratings) / len(use_case_ratings)
            if scores["use_cases"] >= 0.8:  # 4+ average rating
                reasons.append(f"Excellent for: {', '.join(use_case_details)}")
            elif scores["use_cases"] >= 0.6:  # 3+ average rating
                reasons.append(f"Good for: {', '.join(use_case_details)}")

        # 3. Features Match (25% weight)
        feature_ratings = []
        feature_details = []
        for feature_id in quiz_answers.features:
            if feature_id in product.get("feature_priorities", {}):
                feature_data = product["feature_priorities"][feature_id]
                rating = feature_data.get("rating", 0)
                feature_ratings.append(rating / 5.0)  # Normalize to 0-1

                # Add reason if rating is high (4 or 5)
                if rating >= 4:
                    feature_name = products_metadata.get("features_metadata", {}).get(feature_id, {}).get("name", {}).get("en", feature_id)
                    feature_value = feature_data.get("value", "")
                    feature_details.append(f"{feature_name}: {feature_value}")
                elif rating <= 2:  # Low rating - mention as weakness
                    feature_name = products_metadata.get("features_metadata", {}).get(feature_id, {}).get("name", {}).get("en", feature_id)
                    feature_value = feature_data.get("value", "")
                    feature_details.append(f"⚠️ {feature_name}: {feature_value}")

        if feature_ratings:
            scores["features"] = sum(feature_ratings) / len(feature_ratings)
            if feature_details:
                reasons.append(f"Key features: {', '.join(feature_details)}")

        # Calculate weighted final score
        final_score = (
            scores["category"] * weights["category"] +
            scores["use_cases"] * weights["use_cases"] +
            scores["features"] * weights["features"]
        )

        # Add product to results if category matches (don't show products from wrong categories)
        if scores["category"] > 0:
            matched_products.append({
                "product_id": product_id,
                "match_score": round(final_score, 3),
                "match_reasons": reasons if reasons else ["Partially matches your requirements"]
            })

    # Sort by match score (highest first)
    matched_products.sort(key=lambda x: x["match_score"], reverse=True)

    # Create quiz summary
    quiz_summary = {
        "category": quiz_answers.category,
        "use_cases": quiz_answers.useCases,
        "features": quiz_answers.features,
        "primary_use_case": quiz_answers.useCases[0] if quiz_answers.useCases else None,
        "priorities": quiz_answers.features[:3]  # Top 3 feature priorities
    }

    return QuizResultsResponse(
        matched_products=[MatchedProduct(**p) for p in matched_products],
        quiz_summary=quiz_summary
    )


@app.get("/products/recommendations/{product_id}", response_model=ProductRecommendationResponse, tags=["Products"])
async def get_product_recommendation(
    product_id: str,
    user: AuthUser = Depends(get_optional_user)
):
    """
    Get detailed product recommendation including full specs, pros, cons, and best-for.

    Requires authentication (optional - returns limited data for anonymous users).

    Returns:
    - Full product details
    - Key specifications with citations
    - Use case ratings
    - Feature priority ratings
    - Pros and cons
    - Best-for descriptions
    - Ecosystem and compatibility info
    """
    if products_metadata is None:
        raise HTTPException(
            status_code=503,
            detail="Service unavailable: Products metadata not loaded"
        )

    # Find product by ID
    product = None
    for p in products_metadata["products"]:
        if p["id"] == product_id:
            product = p
            break

    if not product:
        raise HTTPException(
            status_code=404,
            detail=f"Product {product_id} not found"
        )

    return ProductRecommendationResponse(product=product)


@app.get("/conversations", response_model=ConversationsListResponse, tags=["Conversations"])
async def list_conversations(user: AuthUser = Depends(get_current_user)):
    """
    List conversation IDs for the current user.

    Requires authentication.
    - Regular users see only their own conversations
    - Admin users see all conversations

    Returns a list of conversation IDs and metadata.
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

                # Filter by user ownership (admins see all)
                conv_user_id = data.get("user_id", "anonymous")
                if not user.is_admin and conv_user_id != user.id and conv_user_id != "anonymous":
                    continue

                conversations.append({
                    "conversation_id": data.get("conversation_id", conv_file.stem),
                    "user_id": conv_user_id,
                    "user_email": data.get("user_email"),
                    "created_at": data.get("created_at", ""),
                    "updated_at": data.get("updated_at", ""),
                    "message_count": len(data.get("messages", []))
                })
            except Exception as e:
                print(f"Warning: Error loading conversation {conv_file}: {e}")
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
async def get_conversation(
    conversation_id: str,
    user: AuthUser = Depends(get_current_user)
):
    """
    Get a specific conversation by ID.

    Requires authentication.
    - Users can only access their own conversations
    - Admins can access any conversation

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

        # Check ownership (admins can access any, users only their own)
        conv_user_id = conversation_data.get("user_id", "anonymous")
        if not user.is_admin and conv_user_id != user.id and conv_user_id != "anonymous":
            raise HTTPException(
                status_code=403,
                detail="Access denied: You can only view your own conversations"
            )

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
# Admin Endpoints (Requires Admin Role)
# ============================================================================

@app.get("/admin/conversations", tags=["Admin"])
async def admin_list_all_conversations(user: AuthUser = Depends(require_admin)):
    """
    List all conversations (admin only).

    Returns all conversations regardless of ownership.
    """
    try:
        project_root = Path(__file__).parent.parent
        conversations_dir = project_root / "data" / "conversations"

        if not conversations_dir.exists():
            return {"conversations": []}

        conversations = []
        for conv_file in conversations_dir.glob("*.json"):
            try:
                with open(conv_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                conversations.append({
                    "conversation_id": data.get("conversation_id", conv_file.stem),
                    "user_id": data.get("user_id", "anonymous"),
                    "user_email": data.get("user_email"),
                    "created_at": data.get("created_at", ""),
                    "updated_at": data.get("updated_at", ""),
                    "message_count": len(data.get("messages", []))
                })
            except Exception as e:
                print(f"Warning: Error loading conversation {conv_file}: {e}")
                continue

        # Sort by updated_at descending (most recent first)
        conversations.sort(key=lambda x: x.get("updated_at", ""), reverse=True)

        return {"conversations": conversations}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error listing conversations: {str(e)}"
        )


@app.get("/admin/users", tags=["Admin"])
async def admin_list_users(user: AuthUser = Depends(require_admin)):
    """
    List all users from Supabase (admin only).

    Returns user list from Supabase auth.users table.
    """
    try:
        supabase = get_supabase_admin_client()

        if not supabase:
            # Fallback: Extract unique users from conversations
            project_root = Path(__file__).parent.parent
            conversations_dir = project_root / "data" / "conversations"

            users_map = {}
            if conversations_dir.exists():
                for conv_file in conversations_dir.glob("*.json"):
                    try:
                        with open(conv_file, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        user_id = data.get("user_id", "anonymous")
                        if user_id not in users_map:
                            users_map[user_id] = {
                                "id": user_id,
                                "email": data.get("user_email"),
                                "conversation_count": 0
                            }
                        users_map[user_id]["conversation_count"] += 1
                    except Exception:
                        continue

            return {"users": list(users_map.values()), "source": "conversations"}

        # Use Supabase admin API to list users
        response = supabase.auth.admin.list_users()
        users = []
        for u in response:
            users.append({
                "id": u.id,
                "email": u.email,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_sign_in_at": u.last_sign_in_at.isoformat() if u.last_sign_in_at else None,
                "is_admin": u.user_metadata.get("is_admin", False) if u.user_metadata else False
            })

        return {"users": users, "source": "supabase"}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error listing users: {str(e)}"
        )


@app.post("/admin/invite-user", response_model=InviteUserResponse, tags=["Admin"])
async def admin_invite_user(
    request: InviteUserRequest,
    user: AuthUser = Depends(require_admin)
):
    """
    Invite a new user via email (admin only).

    Sends an invitation email to the user with a link to set their password.
    The link redirects to the reset-password page.
    """
    try:
        supabase = get_supabase_admin_client()

        if not supabase:
            raise HTTPException(
                status_code=503,
                detail="Supabase admin client not available"
            )

        # Determine redirect URL based on environment
        # In production, use the actual domain
        import os
        base_url = os.getenv("BASE_URL", "http://localhost:8000")
        redirect_url = f"{base_url}/reset-password.html"

        # Invite user with custom redirect URL
        response = supabase.auth.admin.invite_user_by_email(
            request.email,
            options={
                "redirect_to": redirect_url
            }
        )

        if response and response.user:
            return InviteUserResponse(
                success=True,
                message=f"Invitation sent to {request.email}",
                user_id=response.user.id
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to invite user"
            )

    except Exception as e:
        error_msg = str(e)

        # Handle duplicate email
        if "already registered" in error_msg.lower() or "duplicate" in error_msg.lower():
            raise HTTPException(
                status_code=409,
                detail=f"User with email {request.email} already exists"
            )

        # Handle other errors
        raise HTTPException(
            status_code=500,
            detail=f"Error inviting user: {error_msg}"
        )


@app.get("/admin/stats", tags=["Admin"])
async def admin_get_stats(user: AuthUser = Depends(require_admin)):
    """
    Get system statistics (admin only).

    Returns counts of users, conversations, messages, and other metrics.
    """
    try:
        project_root = Path(__file__).parent.parent
        conversations_dir = project_root / "data" / "conversations"

        stats = {
            "total_conversations": 0,
            "total_messages": 0,
            "unique_users": set(),
            "products_available": len(products_list),
            "chunks_indexed": len(hybrid_searcher.bm25_index.chunks) if hybrid_searcher else 0
        }

        if conversations_dir.exists():
            for conv_file in conversations_dir.glob("*.json"):
                try:
                    with open(conv_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    stats["total_conversations"] += 1
                    stats["total_messages"] += len(data.get("messages", []))
                    user_id = data.get("user_id", "anonymous")
                    stats["unique_users"].add(user_id)
                except Exception:
                    continue

        # Convert set to count
        stats["unique_users"] = len(stats["unique_users"])

        return stats

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting stats: {str(e)}"
        )


# ============================================================================
# Static File Mounting (Must be last to not interfere with API routes)
# ============================================================================

# Mount frontend at root - serves landing page (index.html) and chat interface (chat.html)
app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="frontend")
print(f"✅ Frontend mounted at / from {frontend_path}")


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
