"""
RAG Enhancement Module - Recommendation System

Enhances top product recommendations with personalized, evidence-backed insights.
Adds 1 dynamic strength + 1 dynamic weakness bullet per top-3 product based on
the user's actual quiz selections and real product documentation.
"""

import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Tuple

sys.path.insert(0, str(Path(__file__).parent.parent))

from openai import OpenAI


SYSTEM_PROMPT = """You are a product recommendation expert. Generate concise, evidence-based bullet points based strictly on the provided document excerpts.

Rules:
1. ONE strength bullet and ONE weakness bullet — both must directly address the user's specific use cases and feature priorities
2. Each bullet: 1-2 sentences max, conversational tone
3. Ground every bullet in the provided excerpts — use specific numbers, feature names, or facts from the text
4. If the excerpts do not contain relevant data for the user's use case, say so honestly instead of inventing a generic claim
   Example of what NOT to write: "This device offers an excellent balance between features and usability."
   Example of what TO write: "The Garmin Forerunner 970 offers up to 26 hours in GPS mode — enough for ultramarathons without recharging."
5. Be honest about real limitations — do not soften weaknesses
6. Do NOT duplicate points already listed under static strengths/weaknesses
7. Output ONLY valid JSON with "strength" and "weakness" keys — no markdown, no preamble"""


class RAGEnhancer:
    """Enhances product recommendations with RAG-based personalized insights."""

    def __init__(self, searcher, products_metadata: Dict[str, Any]):
        """
        Args:
            searcher: Initialized HybridSearcher instance (from main.py global state)
            products_metadata: Full products_metadata dict (from data/products_metadata.json)
        """
        self.searcher = searcher
        self.products_metadata = products_metadata
        self._openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    # -------------------------------------------------------------------------
    # Public API
    # -------------------------------------------------------------------------

    def enhance_recommendations(
        self,
        top_products: List[Dict[str, Any]],
        quiz_inputs: Dict[str, Any],
        language: str = "en"
    ) -> List[Dict[str, Any]]:
        """
        Enhance top products with RAG-generated dynamic bullets.

        Args:
            top_products: List of scored product dicts (product_id, match_score, match_reasons)
            quiz_inputs: Dict with keys: category, useCases, features
            language: "en" or "de"

        Returns:
            Same list with added dynamic_strength and dynamic_weakness fields.
            Falls back to empty strings if RAG step fails for any product.
        """
        use_cases = quiz_inputs.get("useCases", [])
        features = quiz_inputs.get("features", [])
        enhanced = []

        for product_match in top_products:
            product_id = product_match["product_id"]
            product_name = self._get_display_name(product_id)

            try:
                query = self._build_query(product_name, use_cases, features)
                chunks = self._retrieve_chunks(query, product_name)
                strength, weakness = self._generate_bullets(
                    product_id=product_id,
                    product_name=product_name,
                    chunks=chunks,
                    use_cases=use_cases,
                    features=features,
                    language=language
                )
            except Exception as e:
                print(f"WARNING: RAG enhancement failed for {product_name}: {e}")
                strength, weakness = "", ""

            enhanced.append({
                **product_match,
                "dynamic_strength": strength,
                "dynamic_weakness": weakness,
            })

        return enhanced

    # -------------------------------------------------------------------------
    # Private helpers
    # -------------------------------------------------------------------------

    def _build_query(
        self,
        product_name: str,
        use_cases: List[str],
        features: List[str]
    ) -> str:
        """Transform quiz selections into a semantic retrieval query."""
        use_case_names = [
            self.products_metadata.get("use_cases_metadata", {})
                .get(uc, {}).get("name", {}).get("en", uc.replace("_", " "))
            for uc in use_cases
        ]
        feature_names = [
            self.products_metadata.get("features_metadata", {})
                .get(f, {}).get("name", {}).get("en", f.replace("_", " "))
            for f in features
        ]

        query = f"{product_name} for {', '.join(use_case_names)}"
        if feature_names:
            query += f" with emphasis on {', '.join(feature_names)}"
        return query

    def _retrieve_chunks(
        self,
        query: str,
        product_name: str,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Retrieve relevant chunks for the given product using hybrid search."""
        results = self.searcher.search_hybrid(
            query=query,
            top_k=top_k,
            target_products=[product_name],
            apply_diversity=False
        )
        return [r["chunk"] for r in results]

    def _generate_bullets(
        self,
        product_id: str,
        product_name: str,
        chunks: List[Dict[str, Any]],
        use_cases: List[str],
        features: List[str],
        language: str
    ) -> Tuple[str, str]:
        """Call GPT-5 Mini to generate 1 strength + 1 weakness bullet."""
        use_case_names = [
            self.products_metadata.get("use_cases_metadata", {})
                .get(uc, {}).get("name", {}).get("en", uc.replace("_", " "))
            for uc in use_cases
        ]
        feature_names = [
            self.products_metadata.get("features_metadata", {})
                .get(f, {}).get("name", {}).get("en", f.replace("_", " "))
            for f in features
        ]

        static_pros, static_cons = self._get_static_bullets(product_id, language)
        chunks_text = self._format_chunks(chunks)

        lang_instruction = (
            "Write the bullets in German." if language == "de"
            else "Write the bullets in English."
        )

        user_prompt = f"""Product: {product_name}
User's Use Cases: {', '.join(use_case_names)}
User's Feature Priorities: {', '.join(feature_names)}

Relevant excerpts from product documentation:
{chunks_text}

Static strengths already shown to user (do not repeat):
{chr(10).join(f'- {s}' for s in static_pros) if static_pros else 'None'}

Static weaknesses already shown to user (do not repeat):
{chr(10).join(f'- {c}' for c in static_cons) if static_cons else 'None'}

Generate ONE additional strength and ONE additional weakness bullet, each specific to the user's use cases and feature priorities above. {lang_instruction}

Output as JSON only:
{{"strength": "...", "weakness": "..."}}"""

        response = self._openai.chat.completions.create(
            model="gpt-5-mini",
            max_completion_tokens=4096 + 400,  # +4096 for reasoning model internal tokens
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ]
        )

        content = (response.choices[0].message.content or "").strip()

        # Strip markdown code fences if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        bullets = json.loads(content)
        return bullets.get("strength", "").strip(), bullets.get("weakness", "").strip()

    def _format_chunks(self, chunks: List[Dict[str, Any]]) -> str:
        if not chunks:
            return "No relevant documentation available."
        parts = []
        for i, chunk in enumerate(chunks, 1):
            doc_type = chunk.get("doc_type", "document").title()
            page = chunk.get("page_num", "?")
            text = chunk.get("text", "").strip()
            parts.append(f"[{i}] {doc_type}, page {page}:\n{text}")
        return "\n\n".join(parts)

    def _get_display_name(self, product_id: str) -> str:
        for product in self.products_metadata.get("products", []):
            if product["id"] == product_id:
                name = product.get("display_name", {})
                return name.get("en") or name.get("de") or product_id
        return product_id

    def _get_static_bullets(
        self,
        product_id: str,
        language: str = "en"
    ) -> Tuple[List[str], List[str]]:
        for product in self.products_metadata.get("products", []):
            if product["id"] == product_id:
                pros_obj = product.get("pros", {})
                cons_obj = product.get("cons", {})
                pros = pros_obj.get(language) or pros_obj.get("en") or []
                cons = cons_obj.get(language) or cons_obj.get("en") or []
                return pros, cons
        return [], []
