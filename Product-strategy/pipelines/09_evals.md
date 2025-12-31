Evaluation Pipeline
Input: Test dataset (questions + expected answers)
Retrieval Evaluation Branch:

Retrieval Metrics Calculator:

Hit Rate @ K (relevance presence)
Mean Reciprocal Rank (ranking quality)
Context Precision (retrieval accuracy)


A/B Comparator: Tests different retrieval strategies

Generation Evaluation Branch:

Faithfulness Checker: Verifies answer grounding in context
Relevance Scorer: Measures answer-question alignment
Citation Validator: Confirms source accuracy
LLM-as-Judge: Uses Claude to evaluate answer quality

Output: Metrics dashboard + improvement recommendations