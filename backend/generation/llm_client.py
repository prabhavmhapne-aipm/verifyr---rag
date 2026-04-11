"""
LLM Client - Phase 7

Multi-model LLM integration for RAG answer generation.
Supports Anthropic (Claude), OpenAI (GPT), and Google (Gemini) models.
"""

import sys
import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Try to import Langfuse for prompt management (optional)
try:
    from langfuse import Langfuse
    LANGFUSE_AVAILABLE = True
except ImportError:
    LANGFUSE_AVAILABLE = False

# Load fallback system prompt from file at import time
try:
    _FALLBACK_SYSTEM_PROMPT = (Path(__file__).parent.parent / "system_prompt.txt").read_text(encoding="utf-8")
except Exception:
    _FALLBACK_SYSTEM_PROMPT = ""

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Model configurations
MODEL_CONFIGS = {
    "claude-sonnet-4.5": {
        "provider": "anthropic",
        "model_id": "claude-sonnet-4-5-20250929",
        "max_tokens": 800,
        "cost_per_1k_input": 0.003,
        "cost_per_1k_output": 0.015
    },
    "claude-haiku-4.5": {
        "provider": "anthropic",
        "model_id": "claude-haiku-4-5-20251001",
        "max_tokens": 800,
        "cost_per_1k_input": 0.0008,
        "cost_per_1k_output": 0.004
    },
    "gpt-4o-mini": {
        "provider": "openai",
        "model_id": "gpt-4o-mini",
        "max_tokens": 800,
        "cost_per_1k_input": 0.00015,
        "cost_per_1k_output": 0.0006
    },
    "gpt-5.1": {
        "provider": "openai",
        "model_id": "gpt-5.1",
        "max_tokens": 800,
        "cost_per_1k_input": 0.00125,
        "cost_per_1k_output": 0.010
    },
    "gpt-5-mini": {
        "provider": "openai",
        "model_id": "gpt-5-mini",
        "max_tokens": 800,
        "cost_per_1k_input": 0.00025,
        "cost_per_1k_output": 0.002
    },
    "gemini-2.5-flash": {
        "provider": "google",
        "model_id": "gemini-2.5-flash",
        "max_tokens": 800,
        "cost_per_1k_input": 0.0,
        "cost_per_1k_output": 0.0
    },
    "gemini-2.5-pro": {
        "provider": "google",
        "model_id": "gemini-2.5-pro",
        "max_tokens": 800,
        "cost_per_1k_input": 0.0,
        "cost_per_1k_output": 0.0
    }
}


class RAGGenerator:
    """Multi-model RAG answer generator."""

    SYSTEM_PROMPT = _FALLBACK_SYSTEM_PROMPT

    def __init__(self, model_name: str = "claude-sonnet-4.5", api_key: Optional[str] = None):
        """
        Initialize RAG generator.

        Args:
            model_name: Model to use (see MODEL_CONFIGS)
            api_key: Optional API key (otherwise reads from environment)
        """
        if model_name not in MODEL_CONFIGS:
            raise ValueError(
                f"Unknown model: {model_name}. "
                f"Supported models: {list(MODEL_CONFIGS.keys())}"
            )

        self.model_name = model_name
        self.config = MODEL_CONFIGS[model_name]
        self.provider = self.config["provider"]

        # Initialize provider-specific client
        if self.provider == "anthropic":
            from anthropic import Anthropic
            api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError(
                    "ANTHROPIC_API_KEY not found in environment variables. "
                    "Please set it in .env file or pass as parameter."
                )
            self.client = Anthropic(api_key=api_key)

        elif self.provider == "openai":
            from openai import OpenAI
            api_key = api_key or os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError(
                    "OPENAI_API_KEY not found in environment variables. "
                    "Please set it in .env file or pass as parameter."
                )
            self.client = OpenAI(api_key=api_key)

        elif self.provider == "google":
            from google import genai
            api_key = api_key or os.getenv("GOOGLE_API_KEY")
            if not api_key:
                raise ValueError(
                    "GOOGLE_API_KEY not found in environment variables. "
                    "Please set it in .env file or pass as parameter."
                )
            self.client = genai.Client(api_key=api_key)

        # Initialize Langfuse client for prompt management (optional)
        self.langfuse_client = None
        if LANGFUSE_AVAILABLE:
            try:
                lf_public = os.getenv("LANGFUSE_PUBLIC_KEY")
                lf_secret = os.getenv("LANGFUSE_SECRET_KEY")
                lf_host = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")
                if lf_public and lf_secret:
                    self.langfuse_client = Langfuse(
                        public_key=lf_public,
                        secret_key=lf_secret,
                        host=lf_host
                    )
            except Exception:
                self.langfuse_client = None

    def _format_context(self, chunks: List[Dict[str, Any]]) -> str:
        """
        Format retrieved chunks as context for LLM.

        Args:
            chunks: List of chunk dictionaries

        Returns:
            Formatted context string
        """
        formatted_chunks = []

        for i, chunk in enumerate(chunks, 1):
            product = chunk.get("product_name", "Unknown")
            doc_type = chunk.get("doc_type", "Unknown")
            page = chunk.get("page_num", "?")
            text = chunk.get("text", "")

            formatted_chunk = f"[{i}] {product}, {doc_type}, page {page}\n{text}"
            formatted_chunks.append(formatted_chunk)

        return "\n\n".join(formatted_chunks)

    def _format_product_context(self, product_context: List[Dict[str, Any]], language: str) -> str:
        """
        Format structured product metadata as a context block for the LLM.

        Args:
            product_context: List of product metadata dicts (key_specs, pros, cons, best_for)
            language: 'de' or 'en'

        Returns:
            Formatted product summary string, or empty string if no context
        """
        if not product_context:
            return ""

        lang = "de" if language == "de" else "en"
        blocks = []

        for p in product_context:
            name = p.get("display_name", {}).get(lang) or p.get("id", "Unknown Product")
            lines = [f"### {name}"]

            price = p.get("price")
            if price:
                lines.append(f"Price: {price}€")

            # Key specs — only simple string/number values, skip nested dicts
            key_specs = p.get("key_specs", {})
            if key_specs:
                spec_lines = []
                for k, v in key_specs.items():
                    if v is not None and not isinstance(v, dict):
                        spec_lines.append(f"  - {k}: {v}")
                if spec_lines:
                    lines.append("Key Specs:")
                    lines.extend(spec_lines)

            # Pros
            pros = p.get("pros", {}).get(lang, [])
            if pros:
                lines.append("Strengths:")
                lines.extend(f"  + {x}" for x in pros)

            # Cons
            cons = p.get("cons", {}).get(lang, [])
            if cons:
                lines.append("Weaknesses:")
                lines.extend(f"  - {x}" for x in cons)

            # Best for
            best_for = p.get("best_for", {}).get(lang, [])
            if best_for:
                lines.append("Best for: " + ", ".join(best_for))

            blocks.append("\n".join(lines))

        return "## Product Summary\n\n" + "\n\n---\n\n".join(blocks)

    def _extract_cited_source_numbers(self, answer_text: str) -> set:
        """
        Extract citation numbers from answer text.
        
        Args:
            answer_text: The generated answer text
            
        Returns:
            Set of citation numbers found in the answer (e.g., {1, 2, 3})
        """
        # Find all citation patterns like [1], [2], [3], etc.
        # Pattern matches [number] where number is 1 or more digits
        citation_pattern = r'\[(\d+)\]'
        matches = re.findall(citation_pattern, answer_text)
        
        # Convert to set of integers and return
        return {int(num) for num in matches}

    def _extract_sources(self, chunks: List[Dict[str, Any]], cited_numbers: Optional[set] = None) -> List[Dict[str, Any]]:
        """
        Extract source metadata from chunks, preserving citation numbers.
        
        Args:
            chunks: List of chunk dictionaries
            cited_numbers: Optional set of citation numbers that appear in the answer.
                         If provided, only sources matching these numbers will be included.
        
        Returns:
            List of source dictionaries with citation_number field
        """
        sources = []
        seen = set()

        for idx, chunk in enumerate(chunks, 1):  # Start indexing at 1 to match citation format
            # Only include sources that are actually cited in the answer
            if cited_numbers is not None and idx not in cited_numbers:
                continue
                
            source_key = (
                chunk.get("product_name"),
                chunk.get("doc_type"),
                chunk.get("page_num"),
                chunk.get("source_file")
            )

            if source_key not in seen and all(source_key):
                sources.append({
                    "citation_number": idx,  # Preserve original citation number
                    "product": chunk["product_name"],
                    "doc_type": chunk["doc_type"],
                    "page": chunk["page_num"],
                    "file": chunk.get("source_file", "unknown.pdf"),
                    "source_url": chunk.get("source_url"),
                    "source_name": chunk.get("source_name")
                })
                seen.add(source_key)

        return sources

    def _call_anthropic(self, messages: List[Dict[str, str]], max_tokens: int, system_prompt: str) -> Dict[str, Any]:
        """Call Anthropic Claude API with messages array."""
        response = self.client.messages.create(
            model=self.config["model_id"],
            max_tokens=max_tokens,
            temperature=0.3,
            system=system_prompt,
            messages=messages
        )

        return {
            "answer": response.content[0].text,
            "tokens": {
                "input": response.usage.input_tokens,
                "output": response.usage.output_tokens
            }
        }

    def _call_openai(self, messages: List[Dict[str, str]], max_tokens: int, system_prompt: str) -> Dict[str, Any]:
        """Call OpenAI GPT API with messages array."""
        # OpenAI uses system message in messages array, not separate parameter
        full_messages = [
            {"role": "system", "content": system_prompt}
        ] + messages

        response = self.client.chat.completions.create(
            model=self.config["model_id"],
            max_completion_tokens=max_tokens + 4096,
            messages=full_messages
        )


        answer = response.choices[0].message.content or ""

        return {
            "answer": answer,
            "tokens": {
                "input": response.usage.prompt_tokens,
                "output": response.usage.completion_tokens
            }
        }

    def _call_google(self, messages: List[Dict[str, str]], max_tokens: int, system_prompt: str) -> Dict[str, Any]:
        """Call Google Gemini API with messages array."""
        from google.genai.types import GenerateContentConfig

        # Convert messages to Gemini content format
        contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})

        response = self.client.models.generate_content(
            model=self.config["model_id"],
            contents=contents,
            config=GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=max_tokens,
                temperature=0.3
            )
        )

        # Extract token usage from response metadata
        usage = response.usage_metadata
        return {
            "answer": response.text or "",
            "tokens": {
                "input": getattr(usage, "prompt_token_count", 0) or 0,
                "output": getattr(usage, "candidates_token_count", 0) or 0
            }
        }

    def generate_answer(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        language: str = "en",
        conversation_history: Optional[List[Dict[str, str]]] = None,
        quiz_profile: Optional[str] = None,
        product_context: Optional[List[Dict[str, Any]]] = None,
        available_products: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate answer from query and retrieved chunks.

        Args:
            query: User question
            retrieved_chunks: List of relevant chunks from retrieval
            language: Response language ('en' or 'de')
            conversation_history: Optional list of previous messages [{'role': 'user'/'assistant', 'content': '...'}]
            quiz_profile: Optional user quiz profile string
            product_context: Optional list of product metadata dicts (key_specs, pros, cons, best_for)
            available_products: Optional comma-separated string of all product display names in the knowledge base

        Returns:
            Dictionary with answer, sources, and metadata
        """
        # Format product summary block (only present when specific products detected)
        product_summary = self._format_product_context(product_context or [], language)

        # Format RAG chunks
        chunks_context = self._format_context(retrieved_chunks)

        # Combine: product summary first (if any), then retrieved sources
        if product_summary:
            context = f"{product_summary}\n\n## Retrieved Sources\n\n{chunks_context}"
        else:
            context = chunks_context

        # Create user prompt with explicit language instruction
        language_instruction = "English" if language == "en" else "German"
        profile_block = f"User Profile: {quiz_profile}\n\n" if quiz_profile else ""
        catalog_block = f"Verifyr's knowledge base covers: {available_products}\n\n" if available_products else ""

        user_prompt = f"""{profile_block}{catalog_block}Context:
{context}

Question: {query}

IMPORTANT: Respond in {language_instruction} only."""

        # Build messages array
        messages = []

        # Add conversation history (limit to last 10 messages: 5 user + 5 assistant)
        if conversation_history:
            # Take last 10 messages
            recent_history = conversation_history[-10:] if len(conversation_history) > 10 else conversation_history
            for msg in recent_history:
                # Only add messages with 'role' and 'content' keys
                if 'role' in msg and 'content' in msg:
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })

        # Add current query with context as the final user message
        messages.append({
            "role": "user",
            "content": user_prompt
        })

        # Fetch system prompt from Langfuse (falls back to hardcoded if unavailable)
        try:
            prompt_obj = self.langfuse_client.get_prompt("SYSTEM PROMPT - RAGGenerator", label="production")
            system_prompt = prompt_obj.compile()
        except Exception:
            system_prompt = self.SYSTEM_PROMPT

        # Call appropriate provider
        if self.provider == "anthropic":
            result = self._call_anthropic(messages, self.config["max_tokens"], system_prompt)
        elif self.provider == "openai":
            result = self._call_openai(messages, self.config["max_tokens"], system_prompt)
        elif self.provider == "google":
            result = self._call_google(messages, self.config["max_tokens"], system_prompt)
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

        # Show sources only for products mentioned in the answer
        # Use first 3 words of display name to handle variants like "Apple Watch Series 11 GPS 42mm" vs "Apple Watch Series 11"
        answer_lower = result["answer"].lower()
        if product_context:
            id_to_name = {
                p.get("id", ""): " ".join((
                    p.get("display_name", {}).get("en") or
                    p.get("display_name", {}).get("de") or ""
                ).lower().split()[:3])
                for p in product_context
            }
            filtered_chunks = [
                c for c in retrieved_chunks
                if id_to_name.get(c.get("product_name", ""), "") in answer_lower
            ]
            sources = self._extract_sources(filtered_chunks) if filtered_chunks else []
        else:
            sources = self._extract_sources(retrieved_chunks)

        # Calculate costs
        cost_input = (result["tokens"]["input"] / 1000) * self.config["cost_per_1k_input"]
        cost_output = (result["tokens"]["output"] / 1000) * self.config["cost_per_1k_output"]
        total_cost = cost_input + cost_output

        return {
            "answer": result["answer"],
            "sources": sources,
            "retrieved_chunks": retrieved_chunks,
            "model_used": self.model_name,
            "provider": self.provider,
            "tokens_used": result["tokens"],
            "cost_usd": round(total_cost, 6)
        }


def main():
    """Test script for all models."""
    print("\n" + "=" * 80)
    print("🚀 PHASE 7: MULTI-MODEL LLM TESTING")
    print("=" * 80)

    # Mock chunks for testing
    mock_chunks = [
        {
            "chunk_id": "test_1",
            "product_name": "Apple Watch Series 11",
            "doc_type": "specifications",
            "page_num": 9,
            "source_file": "specifications.pdf",
            "text": "Die Apple Watch Series 11 (GPS) bietet bis zu 18 Stunden Batterielaufzeit bei gemischter Nutzung."
        },
        {
            "chunk_id": "test_2",
            "product_name": "Garmin Forerunner 970",
            "doc_type": "specifications_manual",
            "page_num": 167,
            "source_file": "specifications_manual.pdf",
            "text": "GNSS-Modus: Nur GPS - Bis zu 26 Stunden Akkulaufzeit. GNSS-Modus: Automatische Auswahl - Bis zu 23 Stunden."
        },
        {
            "chunk_id": "test_3",
            "product_name": "Apple Watch Series 11",
            "doc_type": "specifications",
            "page_num": 10,
            "source_file": "specifications.pdf",
            "text": "Die Apple Watch Series 11 ist wassergeschützt bis 50 Meter nach ISO Norm 22810:2010."
        }
    ]

    test_query = "Welche Uhr hat eine längere Akkulaufzeit?"

    # Test all models
    models_to_test = ["claude-sonnet-4.5", "claude-haiku-4.5", "gpt-5.1", "gpt-5-mini", "gemini-2.5-flash", "gemini-2.5-pro"]
    results = {}

    for model_name in models_to_test:
        print(f"\n{'=' * 80}")
        print(f"🧪 Testing: {model_name}")
        print("=" * 80)

        try:
            generator = RAGGenerator(model_name=model_name)
            result = generator.generate_answer(test_query, mock_chunks)

            results[model_name] = result

            print(f"\n✅ Success!")
            print(f"   Provider: {result['provider']}")
            print(f"   Tokens: {result['tokens_used']['input']} input + {result['tokens_used']['output']} output")
            print(f"   Cost: ${result['cost_usd']:.6f}")
            print(f"\n   Answer:\n   {result['answer']}")
            print(f"\n   Sources: {len(result['sources'])} unique documents")

        except Exception as e:
            print(f"\n❌ Failed: {e}")
            results[model_name] = {"error": str(e)}

    # Summary
    print("\n" + "=" * 80)
    print("📊 COMPARISON SUMMARY")
    print("=" * 80)

    successful_models = [m for m, r in results.items() if "error" not in r]

    if successful_models:
        print(f"\n✅ Successful models: {len(successful_models)}/{len(models_to_test)}")

        # Cost comparison
        print("\n💰 Cost Comparison (per query):")
        for model in successful_models:
            cost = results[model]["cost_usd"]
            tokens = results[model]["tokens_used"]
            print(f"   {model:20s}: ${cost:.6f} ({tokens['input']}+{tokens['output']} tokens)")

        # Quality comparison
        print("\n📝 Answer Length Comparison:")
        for model in successful_models:
            answer_len = len(results[model]["answer"])
            print(f"   {model:20s}: {answer_len} characters")

    else:
        print("\n❌ All models failed. Please check your API keys in .env file.")

    print("\n" + "=" * 80)
    print("✅ Phase 7 testing complete!")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
