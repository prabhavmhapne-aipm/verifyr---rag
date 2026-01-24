# Evaluation Results Guide

This directory contains JSON files with evaluation results from running the RAG system evaluation script (`tests/langfuse_evaluator.py`).

## File Format

Each evaluation run creates a timestamped JSON file:
- **Format:** `eval_{model}_{timestamp}.json`
- **Example:** `eval_gpt-4o-mini_20260101_140005.json`

## File Structure

Each JSON file contains:

```json
{
  "metadata": {
    "timestamp": "ISO timestamp",
    "model": "gpt-4o-mini",
    "total_queries": 15,
    "api_base_url": "http://localhost:8000"
  },
  "metrics": {
    "total_queries": 15,
    "successful": 15,
    "failed": 0,
    "success_rate": 1.0,
    "avg_response_time_ms": 3564,
    "total_tokens": 17370,
    "total_cost_usd": 0.0036,
    "by_category": {...},
    "by_language": {...}
  },
  "results": [
    {
      "success": true,
      "question": "...",
      "answer": "...",
      "trace_id": "...",
      "sources": [...],
      "response_time_ms": 2091,
      "tokens_used": {...},
      "cost_usd": 0.000122
    }
  ]
}
```

## How to Use Evaluation Results Effectively

### 1. Review Metrics Summary

Start by checking the `metrics` section:
- **Success Rate:** Should be 100% (all queries completed without errors)
- **Response Times:** Average, min, max - helps identify slow queries
- **Cost Metrics:** Total cost and per-query cost - useful for model comparison
- **By Category:** See if factual/comparison/complex queries perform differently
- **By Language:** Check if English vs German queries have different success rates

### 2. Manual Review of Answers (Critical Step)

**The most important step is reviewing the actual answers, not just the metrics.**

For each evaluation run:

1. **Open the JSON file** and review each answer in the `results` array
2. **Open Langfuse dashboard** (http://localhost:3000) → Navigate to your dataset
3. **Review each of the 15 test cases** and manually assess quality

**Quality Assessment:**

Label each test case as:
- ✅ **GOOD:** Answer is correct, complete, well-cited, relevant
- ⚠️ **PARTIAL:** Answer has correct info but missing details, incomplete citations, or minor issues
- ❌ **BAD:** Answer is wrong, irrelevant, hallucinated, or has serious citation errors

**What to Look For:**

- **Accuracy:** Is the answer factually correct?
- **Completeness:** Does it answer the question fully?
- **Citations:** Are sources properly cited [1], [2], [3]?
- **Relevance:** Is the answer relevant to the question?
- **Language:** Does the answer match the question language (EN/DE)?
- **Product Balance:** For comparison questions, are both products mentioned?

### 3. Identify Patterns

After reviewing all 15 cases, identify patterns:

**Good Patterns (what works):**
- "Factual questions about battery life work well"
- "Simple product-specific queries get good answers"
- "English queries are more consistent than German"

**Bad Patterns (what needs improvement):**
- "Comparison questions are missing one product"
- "Complex queries don't have enough context"
- "German answers have citation formatting issues"
- "Retrieval returns wrong chunks for technical questions"

### 4. Make Targeted Improvements

Based on your review, make **one change at a time**:

**If retrieval is poor:**
- Adjust chunk size or overlap
- Improve query analysis logic
- Tune hybrid search parameters
- Enhance product diversity algorithm

**If answers are incomplete:**
- Improve system prompt
- Retrieve more chunks (increase top_k)
- Better context formatting

**If citations are wrong:**
- Fix citation extraction logic
- Improve citation formatting in prompt
- Check source matching

**If language handling is poor:**
- Verify language parameter is passed correctly
- Improve language-specific prompt instructions
- Test with different models

**If comparisons are unbalanced:**
- Improve product diversity algorithm
- Adjust retrieval strategy for comparison queries
- Enhance query analysis for comparison detection

### 5. Re-run Evaluation

After making a change:

```bash
python tests/langfuse_evaluator.py --model gpt-4o-mini
```

This creates a **new** JSON file with a new timestamp.

### 6. Compare Results

**Compare JSON files:**

1. Open both JSON files side-by-side
2. Compare `metrics` section:
   - Did success rate improve?
   - Did response times change?
   - Did costs change?
3. Compare individual `results`:
   - Check if problematic cases improved
   - Verify good cases didn't regress

**Compare in Langfuse:**

1. Open Langfuse dashboard → Datasets section
2. Find both datasets (they'll have different timestamps)
3. Compare answers for the same test cases
4. See full execution traces for each query

**Regression Testing:**

⚠️ **Important:** When making improvements, always check:
- Did the **bad cases improve?**
- Did the **good cases stay good?** (regression check)
- Did you introduce **new problems?**

### 7. Iterate

Repeat the cycle:
1. Review → 2. Identify issues → 3. Make improvement → 4. Re-run → 5. Compare → 6. Repeat

**Stop iterating when:**
- All or most test cases are ✅ GOOD
- Remaining issues are edge cases (acceptable for MVP)
- Cost/quality tradeoff is acceptable
- Further improvements require major architectural changes

## Evaluation Workflow Summary

```
┌─────────────────┐
│  Run Evaluation │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Review Metrics  │  ← Check success rate, times, costs
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Review Answers  │  ← MOST IMPORTANT: Manual quality check
│  in Langfuse    │     Label: ✅ GOOD / ⚠️ PARTIAL / ❌ BAD
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Identify Issues │  ← Find patterns: what works, what doesn't
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Make Change    │  ← Fix ONE thing at a time
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Re-run Eval     │  ← Create new JSON file
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Compare        │  ← Did it improve? Any regressions?
└────────┬────────┘
         │
         └─────► Repeat if needed
```

## Example: Improving Comparison Questions

**Initial Evaluation:**
- Review shows: 5/5 comparison questions are ❌ BAD (missing one product)
- Pattern: Retrieval returns chunks from only one product
- Root cause: Product diversity algorithm not working for comparisons

**Make Improvement:**
- Fix: Improve `_ensure_product_diversity()` in `backend/retrieval/hybrid_search.py`
- Change: Increase minimum chunks per product from `top_k // 3` to `top_k // 2`

**Re-run Evaluation:**
- New file: `eval_gpt-4o-mini_20260101_150000.json`
- Review shows: 5/5 comparison questions now ✅ GOOD
- Regression check: Factual questions still ✅ GOOD

**Result:** Improvement successful, no regressions ✅

## Tips for Effective Evaluation

1. **Review answers, not just metrics** - Metrics tell you "what", review tells you "why"
2. **One change at a time** - Easier to identify what caused improvement/regression
3. **Keep good cases good** - Always check for regressions
4. **Document your findings** - Take notes on patterns and issues
5. **Compare systematically** - Use same test cases, compare side-by-side
6. **Use Langfuse traces** - Full execution details help debug issues
7. **Set quality targets** - Define acceptable quality level (e.g., 12/15 GOOD = 80%)

## Related Files

- **Test Cases:** `tests/test_cases.py` - Modify to add/remove test cases
- **Evaluation Script:** `tests/langfuse_evaluator.py` - Run this to generate results
- **Langfuse Dashboard:** http://localhost:3000 - View traces and datasets
- **Documentation:** `DEVELOPMENT_LOG.md` (Phase 11) - Full evaluation framework docs

## Questions?

- **How to add new test cases?** Edit `tests/test_cases.py`
- **How to compare models?** Run evaluation with different `--model` flags
- **How to view traces?** Open Langfuse dashboard → Traces section
- **How to view datasets?** Open Langfuse dashboard → Datasets section

---

**Remember:** Evaluation is not just about metrics - it's about **iterative improvement**. Use the results to guide your development, not just to measure performance.

