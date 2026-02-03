# RAG-Enhanced Recommendation System - Implementation Plan

## Overview
Enhance the existing quiz-based product recommendation system by integrating RAG (Retrieval-Augmented Generation) to provide personalized, evidence-backed insights. The system will maintain current dynamic scoring while adding one context-specific bullet point each to strengths and weaknesses for the top 3 products.

---

## 1. System Architecture

### 1.1 High-Level Flow
```
User Completes Quiz
    ↓
Frontend submits: {category, useCases[], features[]}
    ↓
Backend: POST /quiz/score-with-rag
    ↓
┌─────────────────────────────────────┐
│  PARALLEL PROCESSING                │
├─────────────────────────────────────┤
│  1. Metadata Scoring (existing)     │ → Scores all products (0-1)
│  2. Rank products by score          │ → Sorted list
│  3. Select top 3                    │ → [Product A, B, C]
└─────────────────────────────────────┘
    ↓
For each top-3 product (sequential):
    ↓
┌─────────────────────────────────────┐
│  RAG ENHANCEMENT                    │
├─────────────────────────────────────┤
│  1. Build context query             │
│  2. Retrieve relevant chunks        │
│  3. Generate dynamic bullets        │
│     • 1 strength (personalized)     │
│     • 1 weakness (personalized)     │
└─────────────────────────────────────┘
    ↓
Merge: Static bullets + Dynamic bullets
    ↓
Return enhanced results to frontend
    ↓
Results page renders hybrid recommendations
```

### 1.2 Component Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                             │
│  • quiz/results.html - Results page UI                       │
│  • quiz/results.js - Fetches & renders results               │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    API LAYER (FastAPI)                        │
│  • POST /quiz/score-with-rag - New RAG-enhanced endpoint     │
│  • POST /quiz/score - Existing metadata-only (keep as backup)│
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  1. Quiz Scorer (existing)                              │ │
│  │     • Calculates match scores (metadata-based)          │ │
│  │     • Weights: 40% category, 35% use cases, 25% features│ │
│  │     • Returns ranked products                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  2. RAG Enhancer (NEW)                                  │ │
│  │     • Query builder                                     │ │
│  │     • Retrieval coordinator                             │ │
│  │     • Bullet generator                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER                          │
│  • products_metadata.json - Product specs & static bullets   │
│  • Qdrant Vector DB - Document embeddings                    │
│  • BM25 Index - Keyword search                               │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                          │
│  • Claude Sonnet 4.5 API - LLM for bullet generation         │
│  • Langfuse - Observability & tracing                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Design

### 2.1 RAG Enhancement Module

**File:** `backend/recommendation/rag_enhancer.py` (NEW)

**Responsibilities:**
1. Transform quiz inputs into semantic queries
2. Retrieve relevant document chunks per product
3. Generate personalized strength/weakness bullets
4. Return structured enhancement data

**Key Functions:**

```python
class RAGEnhancer:
    """Enhances product recommendations with RAG-based insights"""

    def enhance_recommendations(
        self,
        top_products: List[ProductScore],
        quiz_inputs: QuizAnswers
    ) -> List[EnhancedProduct]:
        """
        Main entry point: Enhance top 3 products with RAG

        Args:
            top_products: Top 3 products from metadata scoring
            quiz_inputs: User's quiz selections

        Returns:
            Products with added dynamic bullets
        """

    def _build_query(
        self,
        product_name: str,
        use_cases: List[str],
        features: List[str]
    ) -> str:
        """
        Build semantic query for retrieval

        Example output:
        "Apple Watch Series 11 features for running, swimming
         with focus on battery life and GPS accuracy"
        """

    def _retrieve_chunks(
        self,
        query: str,
        product_name: str,
        top_k: int = 5
    ) -> List[Chunk]:
        """
        Retrieve relevant chunks using hybrid search

        - Filters by product_name metadata
        - Uses existing hybrid retrieval (BM25 + Vector)
        - Returns top-5 chunks
        """

    def _generate_bullets(
        self,
        product: Product,
        chunks: List[Chunk],
        quiz_inputs: QuizAnswers
    ) -> Tuple[str, str]:
        """
        Generate 1 strength + 1 weakness bullet

        Returns:
            (strength_bullet, weakness_bullet)
        """
```

### 2.2 Query Generation Strategy

**Template-Based Approach** (simple, effective):

```python
def _build_query(self, product_name: str, use_cases: List[str], features: List[str]) -> str:
    # Map IDs to readable names
    use_case_names = self._translate_use_cases(use_cases)
    feature_names = self._translate_features(features)

    # Build query
    query = f"{product_name} for {', '.join(use_case_names)}"
    if features:
        query += f" with emphasis on {', '.join(feature_names)}"

    return query

# Example outputs:
# "Apple Watch Series 11 for running, swimming with emphasis on battery life, GPS accuracy"
# "Garmin Forerunner 970 for hiking with emphasis on offline maps, durability"
```

### 2.3 Retrieval Strategy

**Reuse Existing Hybrid Search:**
- Use `backend/retrieval/hybrid_retriever.py` (existing)
- Add product filter: `product_name == "Apple Watch Series 11"`
- Top-K: 5 chunks per product
- Retrieval time: ~0.5-1s per product

**Chunk Metadata Used:**
```json
{
  "product_name": "Apple Watch Series 11",
  "doc_type": "manual",
  "page_num": 5,
  "text": "The Apple Watch Series 11 features multi-band GPS..."
}
```

### 2.4 Bullet Generation Strategy

**LLM Prompt Structure:**

```python
SYSTEM_PROMPT = """You are a product recommendation expert. Generate concise,
evidence-based bullet points for product recommendations.

Rules:
1. ONE strength bullet that addresses user's specific needs
2. ONE weakness bullet that addresses user's specific needs
3. Each bullet: 1-2 sentences max, conversational tone
4. Base insights on provided document excerpts
5. Be honest about limitations
6. Output format: JSON with "strength" and "weakness" keys
"""

USER_PROMPT_TEMPLATE = """
Product: {product_name}
User's Use Cases: {use_cases}
User's Feature Priorities: {features}

Relevant excerpts from product documentation:
{chunks}

Static strengths (already shown):
{existing_strengths}

Static weaknesses (already shown):
{existing_weaknesses}

Generate:
1. ONE additional strength bullet specific to user's selections
2. ONE additional weakness bullet specific to user's selections

Output as JSON:
{
  "strength": "Your strength bullet here",
  "weakness": "Your weakness bullet here"
}
"""
```

**Example Output:**
```json
{
  "strength": "Multi-band GPS with 5 satellite systems provides exceptional route accuracy for your running and hiking activities, even in dense forest areas",
  "weakness": "24-hour battery life means daily charging is required, which may be inconvenient for multi-day hiking trips you're planning"
}
```

### 2.5 API Endpoint Design

**New Endpoint:** `POST /quiz/score-with-rag`

**File:** `backend/main.py`

```python
@app.post("/quiz/score-with-rag", response_model=EnhancedQuizResultsResponse)
@observe(name="quiz_score_with_rag")  # Langfuse tracking
async def score_quiz_with_rag(
    quiz_answers: QuizAnswers,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Score quiz using metadata + enhance top-3 with RAG

    Steps:
    1. Call existing metadata scorer
    2. Get top-3 products
    3. Enhance with RAG
    4. Return merged results
    """

    # Step 1: Existing metadata scoring
    scored_products = quiz_scorer.score_products(
        category=quiz_answers.category,
        use_cases=quiz_answers.useCases,
        features=quiz_answers.features
    )

    # Step 2: Select top-3
    top_3 = scored_products[:3]

    # Step 3: Enhance with RAG
    rag_enhancer = RAGEnhancer()
    enhanced_products = await rag_enhancer.enhance_recommendations(
        top_products=top_3,
        quiz_inputs=quiz_answers
    )

    # Step 4: Return results
    return EnhancedQuizResultsResponse(
        matched_products=enhanced_products,
        quiz_summary=build_summary(quiz_answers)
    )
```

**Response Schema:**

```python
class EnhancedProduct(BaseModel):
    product_id: str
    match_score: float
    match_reasons: List[str]

    # Static bullets (from metadata)
    static_strengths: List[str]
    static_weaknesses: List[str]

    # Dynamic bullets (from RAG)
    dynamic_strength: str  # NEW
    dynamic_weakness: str  # NEW

    product_details: ProductMetadata

class EnhancedQuizResultsResponse(BaseModel):
    matched_products: List[EnhancedProduct]
    quiz_summary: QuizSummary
```

---

## 3. Frontend Integration

### 3.1 API Call Update

**File:** `frontend/quiz/features.js` (Line ~210-230)

**Current:**
```javascript
const response = await fetch('/quiz/score', {
    method: 'POST',
    body: JSON.stringify(quizData)
});
```

**Updated:**
```javascript
const response = await fetch('/quiz/score-with-rag', {
    method: 'POST',
    body: JSON.stringify(quizData)
});
```

### 3.2 Results Page Rendering

**File:** `frontend/quiz/results.js`

**Current Structure (Keep):**
```html
<div class="product-card">
  <h3>Apple Watch Series 11 - 87% Match</h3>
  <p class="recommendation-text">
    Based on your selections (Running, Swimming), we recommend...
  </p>

  <div class="strengths">
    <h4>Strengths:</h4>
    <ul>
      <li>Static bullet 1</li>
      <li>Static bullet 2</li>
      <li>Static bullet 3</li>
    </ul>
  </div>

  <div class="weaknesses">
    <h4>Weaknesses:</h4>
    <ul>
      <li>Static bullet 1</li>
      <li>Static bullet 2</li>
    </ul>
  </div>
</div>
```

**Enhanced Structure:**
```html
<div class="product-card">
  <h3>Apple Watch Series 11 - 87% Match</h3>
  <p class="recommendation-text">
    Based on your selections (Running, Swimming), we recommend...
  </p>

  <div class="strengths">
    <h4>Strengths:</h4>
    <ul>
      <!-- Static bullets (from metadata) -->
      <li>Static bullet 1</li>
      <li>Static bullet 2</li>
      <li>Static bullet 3</li>

      <!-- Dynamic bullet (from RAG) - visually distinguished -->
      <li class="dynamic-insight">
        <span class="insight-badge">For You</span>
        Multi-band GPS provides exceptional accuracy for your running routes...
      </li>
    </ul>
  </div>

  <div class="weaknesses">
    <h4>Weaknesses:</h4>
    <ul>
      <!-- Static bullets -->
      <li>Static bullet 1</li>
      <li>Static bullet 2</li>

      <!-- Dynamic bullet (from RAG) -->
      <li class="dynamic-insight">
        <span class="insight-badge">For You</span>
        24-hour battery may require daily charging for your multi-day hikes...
      </li>
    </ul>
  </div>
</div>
```

**CSS Styling:**
```css
/* Subtle visual distinction for dynamic bullets */
.dynamic-insight {
  background: linear-gradient(90deg, #f0f7ff 0%, transparent 100%);
  padding: 8px 12px;
  border-left: 3px solid #0066cc;
  margin: 8px 0;
  border-radius: 4px;
}

.insight-badge {
  display: inline-block;
  background: #0066cc;
  color: white;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 3px;
  margin-right: 8px;
  letter-spacing: 0.5px;
}
```

### 3.3 JavaScript Rendering Logic

**File:** `frontend/quiz/results.js` (Add new method)

```javascript
renderProductCard(product) {
    const lang = this.currentLanguage;
    const metadata = this.productsMetadata[product.product_id];

    // Build strengths list
    const strengthsHTML = `
        <ul>
            ${metadata.pros[lang].map(bullet => `<li>${bullet}</li>`).join('')}
            ${product.dynamic_strength ? `
                <li class="dynamic-insight">
                    <span class="insight-badge">${lang === 'de' ? 'Für Sie' : 'For You'}</span>
                    ${product.dynamic_strength}
                </li>
            ` : ''}
        </ul>
    `;

    // Build weaknesses list
    const weaknessesHTML = `
        <ul>
            ${metadata.cons[lang].map(bullet => `<li>${bullet}</li>`).join('')}
            ${product.dynamic_weakness ? `
                <li class="dynamic-insight">
                    <span class="insight-badge">${lang === 'de' ? 'Für Sie' : 'For You'}</span>
                    ${product.dynamic_weakness}
                </li>
            ` : ''}
        </ul>
    `;

    // ... rest of card HTML
}
```

---

## 4. Data Flow Example

### User Journey:

**Input:**
```json
{
  "category": "smartwatch_fitness",
  "useCases": ["running", "swimming", "hiking"],
  "features": ["long_battery", "gps_accuracy", "water_resistance"]
}
```

**Step 1: Metadata Scoring**
```
Apple Watch Series 11: 0.83 (83%)
Garmin Forerunner 970: 0.91 (91%)
```

**Step 2: Select Top-3**
```
1. Garmin Forerunner 970 (91%)
2. Apple Watch Series 11 (83%)
```

**Step 3: RAG Enhancement for Garmin**

Query: `"Garmin Forerunner 970 for running, swimming, hiking with emphasis on battery life, GPS accuracy, water resistance"`

Retrieved Chunks:
```
Chunk 1: "The Forerunner 970 features multi-band GNSS with GPS, GLONASS, Galileo, and BeiDou support, providing exceptional accuracy even in challenging environments like dense forests or urban canyons."

Chunk 2: "Battery life: up to 15 days in smartwatch mode, 26 hours in GPS mode. Perfect for multi-day adventures without worrying about charging."

Chunk 3: "5 ATM water resistance (50m) suitable for swimming, with dedicated pool and open water swimming modes."
```

LLM Generation:
```json
{
  "strength": "15-day battery life and multi-band GNSS make this ideal for your multi-day hiking adventures with reliable GPS tracking even in challenging terrain",
  "weakness": "56g weight is heavier than some competitors, which may be noticeable during long running sessions"
}
```

**Step 4: Final Output**
```json
{
  "product_id": "garmin_forerunner_970_2025",
  "match_score": 0.91,
  "static_strengths": [
    "Herausragende Akkulaufzeit (bis zu 15 Tage)",
    "Fortgeschrittene Trainingsmetriken",
    "Multi-Band GNSS für präzise GPS-Genauigkeit"
  ],
  "dynamic_strength": "15-day battery life and multi-band GNSS make this ideal for your multi-day hiking adventures with reliable GPS tracking even in challenging terrain",
  "static_weaknesses": [
    "Begrenztes Smart-Feature-Ökosystem",
    "Weniger modisches Design"
  ],
  "dynamic_weakness": "56g weight is heavier than some competitors, which may be noticeable during long running sessions"
}
```

---

## 5. Implementation Files

### 5.1 New Files to Create

```
backend/recommendation/
├── __init__.py
├── rag_enhancer.py          # Main RAG enhancement logic
└── query_builder.py         # Quiz-to-query transformation

backend/schemas/
└── enhanced_quiz.py         # Enhanced response models
```

### 5.2 Files to Modify

```
backend/main.py              # Add POST /quiz/score-with-rag endpoint
frontend/quiz/features.js    # Change API endpoint call
frontend/quiz/results.js     # Add dynamic bullet rendering
frontend/quiz/results.css    # Add styling for dynamic bullets
```

### 5.3 Files to Keep Unchanged

```
backend/retrieval/hybrid_retriever.py   # Reuse as-is
backend/generation/claude_generator.py   # Reuse Claude API client
data/products_metadata.json              # Keep static bullets
```

---

## 6. Performance & Cost

### 6.1 Response Time Breakdown

```
Metadata scoring:           ~50ms    (in-memory calculation)
Top-3 selection:            ~5ms     (sorting)

RAG Enhancement (per product):
├─ Query building:          ~10ms
├─ Hybrid retrieval:        ~500ms   (Qdrant + BM25)
├─ LLM bullet generation:   ~800ms   (Claude API)
└─ Total per product:       ~1.3s

Total for 3 products:       ~4s      (sequential processing)
Overall response time:      ~4.1s    ✅ Within 5s target
```

### 6.2 Cost Estimation

**Per Quiz Submission:**
- 3 products × 2 bullets each = 6 LLM calls
- Each call: ~500 input tokens + ~100 output tokens
- Cost per call: $0.003 (Claude Sonnet 4.5 pricing)
- **Total per quiz: ~$0.018** (~2 cents)

**Monthly at Scale:**
- 1,000 quiz completions/month: $18
- 10,000 quiz completions/month: $180
- 100,000 quiz completions/month: $1,800

### 6.3 Optimization Opportunities (Future)

1. **Parallel LLM calls**: Generate bullets for 3 products simultaneously → reduce to ~1.5s
2. **Caching**: Cache RAG results for common quiz patterns → 80% cost reduction
3. **Batch processing**: Generate both bullets in single LLM call → 50% cost reduction

---

## 7. Observability & Testing

### 7.1 Langfuse Integration

**Trace Structure:**
```
quiz_score_with_rag (root span)
├─ metadata_scoring
│  └─ score_calculation
├─ rag_enhancement
│  ├─ product_1_enhancement
│  │  ├─ query_building
│  │  ├─ chunk_retrieval
│  │  └─ bullet_generation (LLM)
│  ├─ product_2_enhancement
│  │  └─ ...
│  └─ product_3_enhancement
│     └─ ...
└─ response_formatting
```

**Metrics to Track:**
- Retrieval time per product
- LLM generation time per product
- Total response time
- Cost per quiz
- User satisfaction (manual scoring)

### 7.2 Testing Strategy

**Unit Tests:**
```python
# test_rag_enhancer.py
def test_query_builder():
    """Test quiz inputs → semantic query transformation"""

def test_chunk_retrieval():
    """Test product-filtered retrieval"""

def test_bullet_generation():
    """Test LLM output parsing and validation"""
```

**Integration Tests:**
```python
# test_quiz_scoring_integration.py
def test_end_to_end_rag_scoring():
    """Test full flow: quiz input → enhanced results"""

def test_fallback_to_static():
    """Test graceful degradation if RAG fails"""
```

**Manual Testing:**
```
Test Cases:
1. Quiz with 1 use case, 1 feature → Check bullet relevance
2. Quiz with 3 use cases, 5 features → Check bullet specificity
3. Product with limited documentation → Check bullet quality
4. Multilingual quiz (DE/EN) → Check language handling
```

---

## 8. Deployment Plan

### 8.1 Phase 1: Backend Implementation (Week 1)

**Tasks:**
1. Create `backend/recommendation/rag_enhancer.py`
2. Implement query builder
3. Implement retrieval coordinator (reuse existing hybrid retriever)
4. Implement bullet generator with Claude API
5. Add unit tests
6. Add `/quiz/score-with-rag` endpoint
7. Test with Postman/Thunder Client

**Success Criteria:**
- Endpoint returns enhanced results in <5s
- Dynamic bullets are relevant to quiz inputs
- Langfuse traces show all steps

### 8.2 Phase 2: Frontend Integration (Week 1)

**Tasks:**
1. Update `features.js` to call new endpoint
2. Update `results.js` to render dynamic bullets
3. Add CSS styling for visual distinction
4. Test with real quiz data
5. Cross-browser testing (Chrome, Firefox, Safari, Edge)

**Success Criteria:**
- Dynamic bullets appear correctly
- "For You" badge is visible
- Mobile responsiveness maintained
- No console errors

### 8.3 Phase 3: Testing & Refinement (Week 2)

**Tasks:**
1. User acceptance testing with 10-20 real quiz completions
2. Collect feedback on bullet quality
3. Refine prompts if needed
4. Performance optimization if needed
5. Documentation update

**Success Criteria:**
- 90%+ of dynamic bullets are relevant
- Average response time <4s
- No critical bugs
- User feedback positive

### 8.4 Phase 4: Production Rollout (Week 2)

**Strategy: Gradual Rollout**
```
Day 1-2:  10% of users → Monitor errors, performance
Day 3-4:  25% of users → Monitor quality, collect feedback
Day 5-6:  50% of users → Validate at scale
Day 7+:   100% of users → Full rollout
```

**Rollback Plan:**
- Keep `/quiz/score` endpoint as fallback
- Feature flag: `ENABLE_RAG_RECOMMENDATIONS=true/false`
- If issues: flip flag to disable RAG, revert to metadata-only

---

## 9. Critical Files Reference

### Backend
- `backend/main.py:693-844` - Existing quiz scoring logic
- `backend/retrieval/hybrid_retriever.py` - Reuse for RAG retrieval
- `backend/generation/claude_generator.py` - Reuse for LLM calls
- `data/products_metadata.json` - Static product data

### Frontend
- `frontend/quiz/features.js:200-270` - Quiz submission logic
- `frontend/quiz/results.js:6-645` - Results rendering
- `frontend/quiz/results.html` - Results page template
- `frontend/quiz/data/use-cases.json` - Use case metadata
- `frontend/quiz/data/features.json` - Feature metadata

---

## 10. Risk Mitigation

### Risk 1: RAG Generates Irrelevant Bullets
**Mitigation:**
- Include static bullets in prompt context (avoid duplication)
- Few-shot examples in prompt
- Post-processing validation (length, relevance checks)
- Fallback: Show only static bullets if quality check fails

### Risk 2: Slow Response Time (>5s)
**Mitigation:**
- Implement timeout (4.5s max for RAG step)
- Graceful degradation: Return static results if timeout
- Monitor with Langfuse, optimize slowest step

### Risk 3: High Costs at Scale
**Mitigation:**
- Implement caching for common quiz patterns
- Use Haiku model for simple bullets (75% cost reduction)
- Set monthly budget alerts in Anthropic dashboard

### Risk 4: Multilingual Bullet Generation
**Mitigation:**
- Pass user language to LLM prompt
- Validate language of generated bullet
- Fallback to English, client-side translation if needed

---

## 11. Success Metrics

### Quantitative (Track with Langfuse)
- ✅ Response time <5s for 95th percentile
- ✅ Dynamic bullet relevance score >0.8 (manual eval on 50 samples)
- ✅ Cost per quiz <$0.02
- ✅ Zero critical errors in production

### Qualitative (User Feedback)
- ✅ Users find recommendations more personalized
- ✅ Dynamic bullets address their specific needs
- ✅ Increased click-through to product pages
- ✅ Positive sentiment in feedback surveys

---

## 12. Future Enhancements (Post-MVP)

### Phase 2 Ideas:
1. **Comparison Insights**: "Compared to Apple Watch, this has 6× longer battery"
2. **User Reviews Integration**: Pull insights from user reviews in RAG
3. **Multi-modal RAG**: Include product images in context
4. **Conversational Follow-up**: "Tell me more about battery life" chat button
5. **A/B Testing**: Static vs Hybrid vs Fully Dynamic recommendations

### Phase 3 Ideas:
1. **Personalized Ranking**: RAG influences match scores, not just bullets
2. **Contextual Upsells**: "Users like you also considered..."
3. **Real-time Updates**: Refresh recommendations as new products added
4. **Voice Input**: Quiz via voice commands

---

## 13. Summary

**What We're Building:**
- Hybrid recommendation system combining proven metadata scoring with RAG personalization
- Adds 1 dynamic strength + 1 dynamic weakness bullet per top-3 product
- Evidence-backed, quiz-specific insights from actual product documentation

**Why It's Better:**
- ✅ Personalized to each user's exact needs
- ✅ Evidence-backed from real product manuals
- ✅ Minimal UI change (seamless integration)
- ✅ Fast (<5s response time)
- ✅ Cost-effective (~$0.02 per quiz)

**Implementation Effort:**
- ~2 weeks: Backend + Frontend + Testing + Rollout
- Low risk: Existing components reused, graceful fallbacks
- High impact: Significantly improves user experience

---

**Ready to implement!** 🚀
