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
from generation.llm_client import MODEL_CONFIGS


SYSTEM_PROMPT = """You are a product recommendation expert. Generate concise, evidence-based bullet points based strictly on the provided document excerpts.

Rules:
1. ONE strength bullet and ONE weakness bullet — both must directly address the user's specific use cases and feature priorities
2. Each bullet: 1-2 sentences max, conversational tone
3. Ground every bullet in the provided excerpts — use specific numbers, feature names, or facts from the text
4. If the excerpts do not contain relevant data for the user's use case, return an empty string "" for that bullet — do not invent a fallback, generic claim, or explanatory note
   Example of what NOT to write: "This device offers an excellent balance between features and usability."
   Example of what TO write: "The Garmin Forerunner 970 offers up to 26 hours in GPS mode — enough for ultramarathons without recharging."
   Example of what TO write when no data: ""
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

    def enhance_reasoning_only(
        self,
        products: List[Dict[str, Any]],
        quiz_inputs: Dict[str, Any],
        top_n_offset: int = 3,
        language: str = "en",
        special_request: str = "",
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Generate reasoning text only (no RAG bullets) for products beyond the top-N.
        Used for products 4+ where full RAG enhancement is skipped.

        Returns:
            (enhanced_products, usage) where usage = {"input": N, "output": N, "cost_usd": N}
        """
        use_cases = quiz_inputs.get("useCases", [])
        features = quiz_inputs.get("features", [])
        total = top_n_offset + len(products)
        result = []
        total_input, total_output, total_cost = 0, 0, 0.0

        for i, product_match in enumerate(products):
            rank = top_n_offset + i + 1
            product_id = product_match["product_id"]
            product_name = self._get_display_name(product_id)

            try:
                reasoning, tokens, cost = self._generate_reasoning(
                    product_id=product_id,
                    product_name=product_name,
                    rank=rank,
                    total=total,
                    match_score=product_match["match_score"],
                    match_reasons=product_match.get("match_reasons", []),
                    use_cases=use_cases,
                    features=features,
                    special_request=special_request,
                    language=language,
                )
                total_input += tokens["input"]
                total_output += tokens["output"]
                total_cost += cost
            except Exception as e:
                print(f"WARNING: Reasoning generation failed for {product_name}: {e}")
                reasoning = ""

            result.append({
                **product_match,
                "dynamic_strength": "",
                "dynamic_weakness": "",
                "reasoning": reasoning,
            })

        return result, {"input": total_input, "output": total_output, "cost_usd": round(total_cost, 6)}

    def enhance_recommendations(
        self,
        top_products: List[Dict[str, Any]],
        quiz_inputs: Dict[str, Any],
        language: str = "en",
        special_request: str = "",
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Enhance top products with RAG-generated dynamic bullets.

        Returns:
            (enhanced_products, usage) where usage = {"input": N, "output": N, "cost_usd": N}
        """
        use_cases = quiz_inputs.get("useCases", [])
        features = quiz_inputs.get("features", [])
        total = len(top_products)
        enhanced = []
        total_input, total_output, total_cost = 0, 0, 0.0

        for rank, product_match in enumerate(top_products, start=1):
            product_id = product_match["product_id"]
            product_name = self._get_display_name(product_id)

            try:
                query = self._build_query(product_name, use_cases, features)
                chunks = self._retrieve_chunks(query, product_name)
                strength, weakness, b_tokens, b_cost = self._generate_bullets(
                    product_id=product_id,
                    product_name=product_name,
                    chunks=chunks,
                    use_cases=use_cases,
                    features=features,
                    language=language,
                    special_request=special_request,
                )
                total_input += b_tokens["input"]
                total_output += b_tokens["output"]
                total_cost += b_cost
            except Exception as e:
                print(f"WARNING: RAG enhancement failed for {product_name}: {e}")
                strength, weakness = "", ""

            try:
                reasoning, r_tokens, r_cost = self._generate_reasoning(
                    product_id=product_id,
                    product_name=product_name,
                    rank=rank,
                    total=total,
                    match_score=product_match["match_score"],
                    match_reasons=product_match.get("match_reasons", []),
                    use_cases=use_cases,
                    features=features,
                    special_request=special_request,
                    language=language,
                )
                total_input += r_tokens["input"]
                total_output += r_tokens["output"]
                total_cost += r_cost
            except Exception as e:
                print(f"WARNING: Reasoning generation failed for {product_name}: {e}")
                reasoning = ""

            enhanced.append({
                **product_match,
                "dynamic_strength": strength,
                "dynamic_weakness": weakness,
                "reasoning": reasoning,
            })

        return enhanced, {"input": total_input, "output": total_output, "cost_usd": round(total_cost, 6)}

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
        language: str,
        special_request: str = "",
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

        special_block = f"\nUser's Special Request: {special_request}" if special_request else ""

        user_prompt = f"""Product: {product_name}
User's Use Cases: {', '.join(use_case_names)}
User's Feature Priorities: {', '.join(feature_names)}{special_block}

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
                {"role": "developer", "content": SYSTEM_PROMPT},
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
        usage = response.usage
        tokens = {"input": usage.prompt_tokens if usage else 0, "output": usage.completion_tokens if usage else 0}
        cfg = MODEL_CONFIGS.get("gpt-5-mini", {})
        cost = (tokens["input"] / 1000 * cfg.get("cost_per_1k_input", 0)) + (tokens["output"] / 1000 * cfg.get("cost_per_1k_output", 0))
        return bullets.get("strength", "").strip(), bullets.get("weakness", "").strip(), tokens, cost

    def _generate_reasoning(
        self,
        product_id: str,
        product_name: str,
        rank: int,
        total: int,
        match_score: float,
        match_reasons: List[str],
        use_cases: List[str],
        features: List[str],
        special_request: str,
        language: str,
    ) -> str:
        """Call gpt-4o-mini to generate a personalised rank-aware recommendation sentence."""
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

        rank_label = {1: "the strongest match", 2: "the second strongest match", 3: "the third strongest match"}
        rank_desc = rank_label.get(rank, f"ranked {rank} out of {total}")

        special_block = f"\nUser's Special Request: {special_request}" if special_request else ""
        scoring_summary = "\n".join(f"- {r}" for r in match_reasons) if match_reasons else "- Partially matches requirements"
        lang_instruction = "Write in German." if language == "de" else "Write in English."
        product_context = self._get_product_context(product_id)

        system_prompt = """You are a product recommendation expert. Write 2-3 sentences explaining why this product is ranked where it is for this specific user.

Rules:
1. Be rank-aware — rank 1: emphasise it's the best fit; rank 2: strong alternative with slight trade-offs vs rank 1; rank 3+: worth considering but has clear limitations
2. Use the product context to make specific, concrete references — never be generic
3. Reference the user's actual use cases and feature priorities
4. If the product is over budget, acknowledge it honestly
5. If a special request is provided and relevant, reference it
6. Conversational, honest tone — like a knowledgeable friend
7. 2-3 sentences max
8. Plain text only — no markdown, no bullet points, no headers"""

        user_prompt = f"""Product: {product_name}
Rank: {rank_desc} (score: {round(match_score * 100)}%)
User's Use Cases: {', '.join(use_case_names)}
User's Feature Priorities: {', '.join(feature_names)}{special_block}

Product Context:
{product_context}

Scoring summary:
{scoring_summary}

{lang_instruction}"""

        response = self._openai.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=150,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )

        usage = response.usage
        tokens = {"input": usage.prompt_tokens if usage else 0, "output": usage.completion_tokens if usage else 0}
        cfg = MODEL_CONFIGS.get("gpt-4o-mini", {})
        cost = (tokens["input"] / 1000 * cfg.get("cost_per_1k_input", 0)) + (tokens["output"] / 1000 * cfg.get("cost_per_1k_output", 0))
        return (response.choices[0].message.content or "").strip(), tokens, cost

    def _get_product_context(self, product_id: str) -> str:
        """Extract pros, cons and key specs in English for use in the reasoning prompt."""
        product = next((p for p in self.products_metadata.get("products", []) if p["id"] == product_id), None)
        if not product:
            return ""

        lines = []

        pros = product.get("pros", {}).get("en") or []
        if pros:
            lines.append("Strengths: " + "; ".join(pros))

        cons = product.get("cons", {}).get("en") or []
        if cons:
            lines.append("Weaknesses: " + "; ".join(cons))

        specs = product.get("key_specs", {})
        for key, spec in specs.items():
            if not spec:
                continue
            value = spec.get("en") if isinstance(spec, dict) else str(spec)
            if value:
                lines.append(f"{key.replace('_', ' ').title()}: {value}")

        return "\n".join(lines)

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
