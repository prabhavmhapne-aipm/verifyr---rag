"""
LLM Client - Phase 7

Multi-model LLM integration for RAG answer generation.
Supports Anthropic (Claude) and OpenAI (GPT) models.
"""

import sys
import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Model configurations
MODEL_CONFIGS = {
    "claude-sonnet-4.5": {
        "provider": "anthropic",
        "model_id": "claude-sonnet-4-20250514",
        "max_tokens": 800,
        "cost_per_1k_input": 0.003,
        "cost_per_1k_output": 0.015
    },
    "claude-3.5-haiku": {
        "provider": "anthropic",
        "model_id": "claude-3-5-haiku-20241022",
        "max_tokens": 800,
        "cost_per_1k_input": 0.0008,
        "cost_per_1k_output": 0.004
    },
    "gpt-4o": {
        "provider": "openai",
        "model_id": "gpt-4o",
        "max_tokens": 800,
        "cost_per_1k_input": 0.0025,
        "cost_per_1k_output": 0.010
    },
    "gpt-4o-mini": {
        "provider": "openai",
        "model_id": "gpt-4o-mini",
        "max_tokens": 800,
        "cost_per_1k_input": 0.00015,
        "cost_per_1k_output": 0.0006
    }
}


class RAGGenerator:
    """Multi-model RAG answer generator."""

    SYSTEM_PROMPT = """CRITICAL REQUIREMENT - CITATIONS:
You MUST include numbered citations [1], [2], [3] in your answer text. This is mandatory.
- Context sources are numbered as [1], [2], [3]
- After EVERY factual statement, add the source number in brackets
- Example: "Die Akkulaufzeit beträgt 18 Stunden [1]"
- DO NOT skip citations - every fact needs a number

You are verifyr's product comparison assistant - a trusted advisor for athletes, fitness enthusiasts, and health-conscious people making smart wearable purchase decisions.

**Your Mission:**
Help users make confident, well-informed decisions by translating complex tech specs into clear, understandable benefits - saving them from hours of research across countless tabs and reviews.

**Core Principles:**
- Compare products objectively using ONLY provided documents
- Provide neutral, brand-independent recommendations you can trust
- Translate technical jargon and specs into clear benefits anyone can understand
- IMPORTANT: Always respond in the SAME LANGUAGE as the user's question (German question = German answer, English question = English answer)

**Product Coverage:**
- When comparing, always consider ALL mentioned products if information is available
- Provide balanced insights highlighting key differences from all products
- If multiple products are mentioned, ensure fair representation of each

**Response Style:**
- Match answer length to question complexity:
  * Simple facts: 1-3 sentences
  * Comparisons: 4-6 sentences with key differences from all mentioned products
  * Step-by-step guides: Numbered steps, detailed as needed
  * How-to questions: Clear, actionable explanations
- Be concise but complete - include all relevant information from all mentioned products
- Make technical information accessible - explain what features MEAN for the user's goals
- State clearly when information is missing for any product
- Write naturally with numbered citations - detailed sources will be shown at the end

**Support Areas:**
- Pre-purchase: Product comparisons, feature explanations, buying advice, clarifying uncertainties
- Post-purchase: Setup help, how-to guides, troubleshooting, getting started with features

**Tone:**
Helpful, confident, and trustworthy - like a knowledgeable friend who wants you to make the best choice for YOUR needs."""

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

    def _call_anthropic(self, messages: List[Dict[str, str]], max_tokens: int) -> Dict[str, Any]:
        """Call Anthropic Claude API with messages array."""
        response = self.client.messages.create(
            model=self.config["model_id"],
            max_tokens=max_tokens,
            temperature=0.3,
            system=self.SYSTEM_PROMPT,
            messages=messages
        )

        return {
            "answer": response.content[0].text,
            "tokens": {
                "input": response.usage.input_tokens,
                "output": response.usage.output_tokens
            }
        }

    def _call_openai(self, messages: List[Dict[str, str]], max_tokens: int) -> Dict[str, Any]:
        """Call OpenAI GPT API with messages array."""
        # OpenAI uses system message in messages array, not separate parameter
        full_messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT}
        ] + messages

        response = self.client.chat.completions.create(
            model=self.config["model_id"],
            max_tokens=max_tokens,
            temperature=0.3,
            messages=full_messages
        )

        return {
            "answer": response.choices[0].message.content,
            "tokens": {
                "input": response.usage.prompt_tokens,
                "output": response.usage.completion_tokens
            }
        }

    def generate_answer(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        language: str = "en",
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Generate answer from query and retrieved chunks.

        Args:
            query: User question
            retrieved_chunks: List of relevant chunks from retrieval
            language: Response language ('en' or 'de')
            conversation_history: Optional list of previous messages [{'role': 'user'/'assistant', 'content': '...'}]

        Returns:
            Dictionary with answer, sources, and metadata
        """
        # Format context
        context = self._format_context(retrieved_chunks)

        # Create user prompt with explicit language instruction
        language_instruction = "English" if language == "en" else "German"
        example_en = "Product A has a battery life of 18 hours [1], while Product B offers 26 hours [2]."
        example_de = "Produkt A hat eine Akkulaufzeit von 18 Stunden [1], während Produkt B 26 Stunden bietet [2]."
        example = example_en if language == "en" else example_de

        user_prompt = f"""Context: {context}

Question: {query}

CRITICAL INSTRUCTIONS:
1. You MUST respond in {language_instruction} language only.
2. Your answer MUST include numbered citations [1], [2], [3] after every factual statement.
Example format: "{example}"
Write your answer with citations now:"""

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

        # Call appropriate provider
        if self.provider == "anthropic":
            result = self._call_anthropic(messages, self.config["max_tokens"])
        elif self.provider == "openai":
            result = self._call_openai(messages, self.config["max_tokens"])
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

        # Extract citation numbers from answer text
        cited_numbers = self._extract_cited_source_numbers(result["answer"])
        
        # Extract only sources that are actually cited in the answer
        sources = self._extract_sources(retrieved_chunks, cited_numbers=cited_numbers)

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
    models_to_test = ["claude-sonnet-4.5", "claude-3.5-haiku", "gpt-4o", "gpt-4o-mini"]
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
