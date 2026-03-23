# -*- coding: utf-8 -*-
"""
quiz_permutations.py
--------------------
Generate every meaningful quiz input combination and score each product.

Inputs explored
  * Category:   smartwatch_fitness  (only active category)
  * Use cases:  all 63 non-empty subsets of 6 quiz IDs
  * Features:   all 1-5 feature combos (3,472 total)
  * Budget:     6 tiers (none / 200 / 350 / 500 / 650 / 1000)

Scope selected for this run (to keep output manageable):
  * All 63 use-case combos x 14 single features x 6 budgets = 5,292 rows
    -> also runs "no feature filter" (any 1 feature sends equal weight)

Outputs:
  data/evaluation_results/quiz_permutations.csv   -- full row-per-combo table
  data/evaluation_results/quiz_permutations_summary.json -- aggregate stats
"""

import sys, io
import json, csv, itertools
from pathlib import Path
from collections import Counter, defaultdict

# Force UTF-8 output on Windows
if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# -- Paths ------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
META_FILE  = ROOT / "data" / "products_metadata.json"
OUT_DIR    = ROOT / "data" / "evaluation_results"
OUT_CSV    = OUT_DIR / "quiz_permutations.csv"
OUT_JSON   = OUT_DIR / "quiz_permutations_summary.json"
OUT_DIR.mkdir(parents=True, exist_ok=True)

with open(META_FILE, encoding="utf-8") as f:
    METADATA = json.load(f)

PRODUCTS = METADATA["products"]

# IDs are now aligned between quiz JSON and products_metadata.json.
# No mapping needed -- use quiz data files as the source of truth.
QUIZ_USE_CASES = ["lifestyle_fitness", "running_cycling", "hiking", "swimming",
                  "health_wellbeing", "competition_performance"]
QUIZ_FEATURES  = ["light_comfortable", "long_battery", "water_resistance", "gps_accuracy",
                  "smartphone_independent", "app_ecosystem", "design_modern", "design_classic",
                  "with_display", "no_display", "sleep_monitor", "stress_monitor",
                  "ecg_hrv", "vo2_max"]

# Budget tiers: (label, budget_min, budget_max)
BUDGET_TIERS = [
    ("no_budget",    None, None),
    ("under_200",    0,    200),
    ("under_350",    0,    350),
    ("under_500",    0,    500),
    ("under_650",    0,    650),
    ("unlimited",    0,   1000),
]


# -- Scoring helpers --------------------------------------------------------

def _check_budget(product, budget_min, budget_max):
    if budget_max is None:
        return 1.0, "No budget filter"
    price = product.get("price")
    if price is None:
        return 1.0, "Price unknown"
    if price <= budget_max:
        return 1.0, "Within budget"
    return 0.70, "Over budget"


def score_product(product, quiz_use_cases: list[str], quiz_features: list[str],
                  budget_min, budget_max, weights: dict) -> float:
    """
    Score a single product against quiz answers. IDs are now aligned — direct lookup.
    Returns final_score (0-1).
    """
    scores = {"category": 0.0, "use_cases": 0.0, "features": 0.0}

    # 1. Category (40%)
    cat_data  = METADATA.get("categories", {}).get("smartwatch_fitness", {})
    cat_prods = cat_data.get("products", [])
    if product["category"] == "smartwatch_fitness" or product["id"] in cat_prods:
        scores["category"] = 1.0

    # 2. Use cases (35%) -- direct lookup, IDs now aligned
    uc_ratings = []
    for uc_id in quiz_use_cases:
        uc_data = product.get("use_cases", {}).get(uc_id, {})
        rating = uc_data.get("rating", 0)
        if rating > 0:
            uc_ratings.append(rating / 5.0)
    if uc_ratings:
        scores["use_cases"] = sum(uc_ratings) / len(uc_ratings)

    # 3. Features (25%) -- direct lookup, IDs now aligned
    feat_ratings = []
    for feat_id in quiz_features:
        feat_data = product.get("feature_priorities", {}).get(feat_id, {})
        rating = feat_data.get("rating", 0)
        if rating > 0:
            feat_ratings.append(rating / 5.0)
    if feat_ratings:
        scores["features"] = sum(feat_ratings) / len(feat_ratings)

    # Weighted sum
    final = (
        scores["category"] * weights["category"] +
        scores["use_cases"] * weights["use_cases"] +
        scores["features"]  * weights["features"]
    )

    # Budget multiplier
    multiplier, _ = _check_budget(product, budget_min, budget_max)
    return round(final * multiplier, 4)


def rank_products(quiz_use_cases, quiz_features, budget_min, budget_max):
    """Return list of (product_id, score) sorted descending."""
    weights = METADATA.get("scoring_weights", {
        "category": 0.40, "use_cases": 0.35, "features": 0.25
    })
    results = []
    for p in PRODUCTS:
        s = score_product(p, quiz_use_cases, quiz_features, budget_min, budget_max, weights)
        results.append((p["id"], s))
    results.sort(key=lambda x: -x[1])
    return results


# -- Generate combinations --------------------------------------------------

def all_use_case_combos():
    """All 63 non-empty subsets of 6 use cases."""
    for r in range(1, len(QUIZ_USE_CASES) + 1):
        for combo in itertools.combinations(QUIZ_USE_CASES, r):
            yield list(combo)

def single_feature_combos():
    """14 single-feature selections."""
    for f in QUIZ_FEATURES:
        yield [f]


print("Generating combinations…")
rows = []
winner_counter  = Counter()
score_by_winner = defaultdict(list)

total = 0
for uc_combo in all_use_case_combos():
    for feat_combo in single_feature_combos():
        for (budget_label, bmin, bmax) in BUDGET_TIERS:
            ranked = rank_products(uc_combo, feat_combo, bmin, bmax)
            r1, r2, r3 = (ranked + [("--", 0)] * 3)[:3]
            rows.append({
                "use_cases":     "|".join(uc_combo),
                "features":      "|".join(feat_combo),
                "budget":        budget_label,
                "rank1_product": r1[0],
                "rank1_score":   r1[1],
                "rank2_product": r2[0],
                "rank2_score":   r2[1],
                "rank3_product": r3[0],
                "rank3_score":   r3[1],
            })
            winner_counter[r1[0]] += 1
            score_by_winner[r1[0]].append(r1[1])
            total += 1

print(f"  Generated {total:,} combinations")

# -- Write CSV --------------------------------------------------------------
fieldnames = ["use_cases","features","budget",
              "rank1_product","rank1_score",
              "rank2_product","rank2_score",
              "rank3_product","rank3_score"]

with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=fieldnames)
    w.writeheader()
    w.writerows(rows)

print(f"  CSV saved -> {OUT_CSV}")

# -- Score breakdown per product --------------------------------------------

def product_score_breakdown():
    """Per-product ratings for all use cases and features."""
    weights = METADATA.get("scoring_weights", {
        "category": 0.40, "use_cases": 0.35, "features": 0.25
    })
    breakdown = {}
    for p in PRODUCTS:
        pid = p["id"]
        uc_scores = {}
        for qid in QUIZ_USE_CASES:
            uc_scores[qid] = p.get("use_cases", {}).get(qid, {}).get("rating", 0)
        feat_scores = {}
        for qid in QUIZ_FEATURES:
            feat_scores[qid] = p.get("feature_priorities", {}).get(qid, {}).get("rating", 0)
        breakdown[pid] = {
            "price":       p.get("price"),
            "category_score": 1.0 if p["category"] == "smartwatch_fitness" else 0.0,
            "use_case_ratings": uc_scores,
            "feature_ratings":  feat_scores,
        }
    return breakdown


breakdown = product_score_breakdown()

# -- What input combo gives each product the HIGHEST score? ----------------
best_per_product = {}
for row in rows:
    pid = row["rank1_product"]
    score = row["rank1_score"]
    if pid not in best_per_product or score > best_per_product[pid]["score"]:
        best_per_product[pid] = {
            "score":     score,
            "use_cases": row["use_cases"],
            "features":  row["features"],
            "budget":    row["budget"],
        }

# -- Summary JSON ----------------------------------------------------------
summary = {
    "meta": {
        "total_combinations": total,
        "category": "smartwatch_fitness",
        "use_case_count": len(QUIZ_USE_CASES),
        "feature_count":  len(QUIZ_FEATURES),
        "budget_tiers":   [t[0] for t in BUDGET_TIERS],
        "scope": "all 63 use-case subsets x 14 single features x 6 budget tiers",
    },
    "win_counts": dict(winner_counter),
    "win_percentage": {
        pid: round(cnt / total * 100, 2)
        for pid, cnt in winner_counter.items()
    },
    "avg_winning_score": {
        pid: round(sum(scores) / len(scores), 4)
        for pid, scores in score_by_winner.items()
    },
    "best_combo_per_product": best_per_product,
    "product_score_breakdown": breakdown,
}

with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(summary, f, indent=2, ensure_ascii=False)

print(f"  Summary JSON saved -> {OUT_JSON}")

# -- Console summary --------------------------------------------------------
print()
print("=" * 60)
print("RESULTS SUMMARY")
print("=" * 60)
print(f"{'Product':<40}  {'Wins':>6}  {'Win%':>6}  {'Avg Score':>10}")
print("-" * 60)
for pid, cnt in winner_counter.most_common():
    pct  = cnt / total * 100
    avg  = sum(score_by_winner[pid]) / len(score_by_winner[pid])
    print(f"{pid:<40}  {cnt:>6,}  {pct:>5.1f}%  {avg:>10.4f}")

print()
print("BEST COMBO PER PRODUCT (highest score achieved):")
print("-" * 60)
for pid, best in best_per_product.items():
    print(f"\n  {pid}")
    print(f"    Score:     {best['score']}")
    print(f"    Use cases: {best['use_cases']}")
    print(f"    Features:  {best['features']}")
    print(f"    Budget:    {best['budget']}")

print()
print("PER-PRODUCT RAW RATINGS (via ID mapping):")
print("-" * 60)
for pid, bd in breakdown.items():
    print(f"\n  {pid}  (price: €{bd['price']})")
    print(f"  Use case ratings (quiz ID -> score/5):")
    for qid, r in bd["use_case_ratings"].items():
        bar = "#" * r + "." * (5 - r)
        print(f"    {qid:<30} {bar}  {r}/5")
    print(f"  Feature ratings (quiz ID -> score/5):")
    for qid, r in bd["feature_ratings"].items():
        bar = "#" * r + "." * (5 - r)
        print(f"    {qid:<30} {bar}  {r}/5")

print()
print("BUDGET IMPACT (win% by tier, using all use-case combos):")
print("-" * 60)
budget_wins = defaultdict(Counter)
for row in rows:
    budget_wins[row["budget"]][row["rank1_product"]] += 1
for tier, (label, _, _) in zip(budget_wins.keys(), BUDGET_TIERS):
    tier_total = sum(budget_wins[label].values())
    if tier_total == 0: continue
    print(f"  {label}:")
    for pid, cnt in budget_wins[label].most_common():
        print(f"    {pid:<40} {cnt:>5} wins  ({cnt/tier_total*100:.1f}%)")
