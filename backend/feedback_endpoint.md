# Backend Feedback Endpoint Implementation

## Overview
Add a `/feedback` endpoint to collect user feedback (thumbs up/down) and log it to Langfuse.

## Implementation

### Add to `backend/main.py`

Add this code after the `/query` endpoint (around line 150):

```python
from pydantic import BaseModel

# Feedback request model
class FeedbackRequest(BaseModel):
    query_id: str
    score: int  # 1 for positive, 0 for negative
    timestamp: str

@app.post("/feedback")
async def submit_feedback(feedback: FeedbackRequest):
    """
    Collect user feedback on a query response.

    This endpoint receives thumbs up/down feedback from users and logs it to Langfuse
    as a score attached to the original query trace.

    Args:
        feedback: FeedbackRequest with query_id, score (1=positive, 0=negative), and timestamp

    Returns:
        Success status

    Logs to Langfuse:
        - Score type: NUMERIC (0 or 1)
        - Score name: "user_feedback"
        - Links to original query trace via query_id
    """
    try:
        # Get Langfuse client
        langfuse_client = get_langfuse_client()

        if langfuse_client:
            # Send score to Langfuse
            # This will be linked to the trace created during query
            langfuse_client.score(
                trace_id=feedback.query_id,
                name="user_feedback",
                value=feedback.score,
                data_type="NUMERIC",
                comment=f"User feedback: {'positive' if feedback.score == 1 else 'negative'}"
            )

            # Flush to ensure score is sent
            langfuse_client.flush()

            logger.info(
                f"User feedback recorded: query_id={feedback.query_id}, "
                f"score={feedback.score} ({'positive' if feedback.score == 1 else 'negative'})"
            )
        else:
            logger.warning("Langfuse client not available, feedback not logged")

        return {
            "status": "success",
            "message": "Feedback recorded",
            "query_id": feedback.query_id,
            "score": feedback.score
        }

    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to record feedback: {str(e)}")
```

## Verification

### 1. Test with curl:

```bash
# Positive feedback
curl -X POST http://localhost:8000/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "query_id": "your-query-id-here",
    "score": 1,
    "timestamp": "2026-01-01T12:00:00Z"
  }'

# Negative feedback
curl -X POST http://localhost:8000/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "query_id": "your-query-id-here",
    "score": 0,
    "timestamp": "2026-01-01T12:00:00Z"
  }'
```

### 2. Check Langfuse Dashboard:

1. Go to `http://localhost:3000/traces`
2. Find your query trace by `query_id`
3. You should see a new score: `user_feedback` with value 0 or 1
4. The score will be linked to the original query trace

### 3. View in Langfuse:

Scores appear in:
- **Trace detail page** - Shows individual feedback score
- **Scores tab** - All user feedback scores across traces
- **Analytics** - Can aggregate feedback scores to see % positive/negative

## Analytics Queries in Langfuse

Once you have feedback data, you can analyze it:

### Positive Feedback Rate:
```
Filter traces where user_feedback == 1
Calculate: (positive_count / total_count) * 100
```

### Correlation with LLM Judge Scores:
Compare `user_feedback` vs `answer_relevance`, `faithfulness`, etc. to see if LLM judge agrees with users.

### Identify Failure Patterns:
Filter traces with `user_feedback == 0` to analyze:
- Which questions get negative feedback?
- Which models perform poorly?
- Which topics need improvement?

## Error Handling

The endpoint handles:
- ✅ Invalid query_id (Langfuse handles gracefully)
- ✅ Langfuse unavailable (logs warning, returns success)
- ✅ Network errors (returns 500)
- ✅ Duplicate feedback (Langfuse allows multiple scores per trace)

## Security Considerations

For production:

1. **Rate Limiting**: Add rate limiting to prevent spam
   ```python
   from slowapi import Limiter
   limiter = Limiter(key_func=get_remote_address)

   @app.post("/feedback")
   @limiter.limit("10/minute")
   async def submit_feedback(...):
       ...
   ```

2. **Validation**: Ensure query_id exists before accepting feedback
   ```python
   # Optional: Verify query_id exists in database/logs
   if not is_valid_query_id(feedback.query_id):
       raise HTTPException(status_code=404, detail="Query not found")
   ```

3. **CORS**: Already configured in main.py for localhost

## Next Steps

1. Add feedback button analytics in frontend
2. Create dashboard to view feedback trends
3. Use feedback to retrain/improve the model
4. Send negative feedback alerts to developers
