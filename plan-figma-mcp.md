# Figma iOS to Web Integration Plan - Verifyr

## Overview
Implement Initial Quiz feature from Figma iOS design to guide users through product selection. Keep existing web chat interface unchanged.

**New User Flow (Based on Extracted Figma Screens):**
```
index.html (Landing)
  ↓ "Try Verifyr" CTA
auth.html (Login/Signup)
  ↓ Auth success
quiz/category.html (NEW - Screen 1: Category selection, 6 options, single-select)
  ↓ Continue
quiz/use-case.html (NEW - Screen 3: Use case selection, 6 options, multi-select)
  ↓ Continue
quiz/features.html (NEW - Screen 4: Feature priorities, 14 options, max 5 selections)
  ↓ Submit quiz
quiz/results.html (NEW - Screen 5: Product recommendations carousel with reviews)
  ↓ Optional: Open chatbot modal (Screen 6: QA overlay)
  ↓ "Ask Verifyr" CTA
chat.html (Existing - NO CHANGES)
```

**Key Findings from Figma Extraction:**
- Quiz is a **4-step flow** with 3 selection screens + 1 results screen
- **Selection tiles**: 150px × 168px cards with icons, consistent across all selection screens
- **Results page**: Horizontal carousel with 303px × 1847px product cards (tall, vertically scrollable)
- **Product cards include**: Images, tabs, purchase buttons (3 retailers with yellow gradient priority), detailed recommendations, verified review sources (Trusted Reviews, Heise, Outdoor Gear Lab, Reddit, YouTube, Amazon)
- **Chatbot**: Modal overlay (Screen 6), not a separate page, with iOS keyboard, suggestion buttons, and chat interface

**Integration Goals:**
1. ✅ Set up Figma Desktop MCP server for design access
2. ✅ Extract quiz design and questions from iOS Figma file (6 screens extracted)
3. Implement 3 quiz selection pages (category, use case, features) with tile components
4. Implement results page with product recommendation carousel and review sources
5. Implement chatbot modal overlay
6. Keep web chat interface unchanged

## Phase 1: Figma MCP Setup (Day 1)

### Install & Configure MCP Server

**Step 1: Install Figma MCP**
```powershell
npm install -g @modelcontextprotocol/server-figma
```

**Step 2: Get Figma Access Token**
- Go to Figma → Settings → Personal Access Tokens
- Create token with "File content" read access
- Copy token securely

**Step 3: Configure Claude Code MCP**
- Edit: `C:\Users\prabh\AppData\Roaming\Code\User\globalStorage\anthropic.claude\mcp_config.json`
- Add:
```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-figma"],
      "env": {
        "FIGMA_PERSONAL_ACCESS_TOKEN": "your-token-here"
      }
    }
  }
}
```

**Step 4: Add to .gitignore**
- Add `.env.figma` to `.gitignore`
- Never commit Figma tokens

**Verification:**
- Ask Claude Code to list Figma files
- Request design tokens from a specific file
- Confirm colors, typography accessible

## Phase 2: Design System Alignment (Days 2-3)

### Extract iOS Design Tokens

Use Claude Code with Figma MCP to extract from iOS designs:

1. **Colors:**
   - Primary/accent colors
   - Semantic colors (success, error, warning)
   - Neutral grays
   - Background colors

2. **Typography:**
   - Font families (convert SF Pro → web fonts)
   - Font sizes (pt → rem conversion)
   - Font weights, line heights, letter spacing

3. **Spacing:**
   - Padding/margin values
   - Gap values
   - Convert to rem-based scale

4. **Components:**
   - Button variants
   - Card styles
   - Input fields
   - Navigation patterns

### Create Alignment Document

**File:** `frontend/design-system/PLATFORM_ALIGNMENT.md`

Document:
- Token mapping (Web vs iOS)
- Decision log (Keep Web / Adopt iOS / Harmonize)
- Platform-specific exceptions with rationale

### Update Design System Files

**Files to modify:**
- `frontend/design-system/tokens/colors.css` - Harmonized color tokens
- `frontend/design-system/tokens/typography.css` - Font scale alignment
- `frontend/design-system/tokens/spacing.css` - Spacing adjustments
- `frontend/design-system/tokens/shadows.css` - Shadow updates if needed

**Process:**
1. Compare current web tokens with iOS tokens
2. Decide on harmonized values
3. Update CSS variables
4. Test all existing pages still work

### Create Web Design System in Figma

1. Create Figma file: "Verifyr Web Design System"
2. Build token library matching web CSS variables
3. Create component library mirroring web components
4. Document HTML/CSS implementation notes

## Phase 3: New Feature Implementation

### Implementation Order

**Priority 1 - Quiz Flow Implementation (Week 3)**

**New files:**
- `frontend/quiz/category.html` - Screen 1: Category selection page
- `frontend/quiz/use-case.html` - Screen 3: Use case selection page
- `frontend/quiz/features.html` - Screen 4: Feature priorities page
- `frontend/quiz/styles/quiz-common.css` - Shared quiz styles
- `frontend/quiz/styles/category.css` - Category page styles
- `frontend/quiz/styles/use-case.css` - Use case page styles
- `frontend/quiz/styles/features.css` - Features page styles
- `frontend/quiz/scripts/quiz-controller.js` - Quiz state management
- `frontend/quiz/scripts/category.js` - Category page logic
- `frontend/quiz/scripts/use-case.js` - Use case page logic
- `frontend/quiz/scripts/features.js` - Features page logic
- `frontend/quiz/data/categories.json` - 6 categories (extracted from Figma)
- `frontend/quiz/data/use-cases.json` - 6 use cases (extracted from Figma)
- `frontend/quiz/data/features.json` - 14 features (extracted from Figma)
- `frontend/design-system/components/selection-card.css` - Reusable 150px × 168px selection card

**Quiz Structure (from Figma extraction):**

**Screen 1: Category Selection**
- 6 categories in 2×3 grid
- Single-select only
- Card dimensions: 150px × 168px
- Icons: Illustrations (smartwatch, moon, heart, earbuds, blood drop, female symbol)
- Navigation: "Überspringen" (no selection) → "Weiter" (with selection)

**Screen 3: Use Case Selection**
- 6 use cases in 2×3 grid
- Multi-select enabled
- Same card dimensions (150px × 168px)
- Options: Lifestyle & Fitness, Running & Cycling, Hiking, Swimming, Health & Wellbeing, Competition & Performance
- Navigation: "Weiter" (enabled with ≥1 selection)

**Screen 4: Feature Priorities**
- 14 features in 2×7 grid (scrollable)
- Multi-select with **max 5 selections**
- Same card dimensions (150px × 168px)
- **Photographic images** (not illustrations) with semi-transparent label overlays
- Disables remaining cards after 5 selections
- Features: Light & Comfortable, Long Battery, Waterproof & Robust, Precise GPS, Smartphone Independent, App Integration, Digital/Smart, Analog/Classic, With Display, Without Display/Discreet, Sleep Monitor, Body/Stress Monitor, ECG/HRV, VO2 Max

**Common Design Elements:**
- **Selection card**: 150px × 168px, 16px border-radius, 1px border (#E2E8F0), blue border + checkmark when selected (#3E8EF4)
- **Progress indicator**: 4 steps (Category, Use Case, Features, Results)
- **Navigation**: Back button (chevron-left), Continue button (#3E8EF4 blue)
- **Typography**: Inter (primary), Unbounded (logo), SF Pro (system), Arimo (body alt)
- **Colors**: #256ABB (brand blue), #3E8EF4 (primary blue), #011928 (dark text), #F0F2F5 (light gray)

**Priority 2 - Product Recommendations Page (Week 4)**

**New files:**
- `frontend/quiz/results.html` - Screen 5: Product recommendations carousel
- `frontend/quiz/styles/results.css` - Results page styles
- `frontend/quiz/scripts/results.js` - Results page logic with carousel
- `frontend/design-system/components/product-recommendation-card.css` - Tall product card (303px × 1847px)
- `frontend/design-system/components/review-box.css` - Review source boxes
- `frontend/design-system/components/purchase-buttons.css` - Yellow gradient purchase buttons

**Screen 5 Structure (from Figma):**

**Horizontal Carousel:**
- Product cards: 303px wide × 1847px tall (very tall, vertically scrollable)
- Horizontal scroll (shows 1.5 cards, indicating more to the right)
- Gap between cards: 2px

**Product Card Contents (top to bottom):**
1. **Product Image** (240px height) - with heart/favorite icon
2. **Product Title & Meta** (68px) - Name, category tag, star rating + review count
3. **Tab Switcher** (43px) - "Empfehlung" (active) / "Produktdaten" tabs
4. **Purchase Options** (50px) - 3 buttons with yellow gradient (#FDC700 → transparent)
   - Button 1: Solid yellow (best price)
   - Button 2: 52% opacity
   - Button 3: 25% opacity
   - Format: "Bei [Store] Bestellen für [Price]€"
5. **Recommendation Section** (~939px) - Detailed text with:
   - "Unsere Empfehlung" header + average score
   - Multi-paragraph explanation
   - Strengths list (with + prefix)
   - Weaknesses list (with - prefix)
6. **Verified Reviews** - Individual review boxes (71px each):
   - Trusted Reviews logo + rating + link
   - Heise Online logo + rating + link
   - Outdoor Gear Lab logo + rating + link
7. **Community Sources**:
   - Reddit discussion box (59px) - Forum link
   - YouTube review box (50px) - Video title
   - Amazon ratings box (138px) - Star graphic + link to reviews

**Bottom Navigation** (86px fixed):
- 5 icons: Apps, Chat/AI (center, elevated, 50.502px circle), Favorites
- Chat icon activates chatbot modal (Screen 6)

**Backend API endpoints needed:**
```python
# backend/main.py - Add endpoints
@app.get("/products/metadata")
async def get_products_metadata()
# Returns structured product data (name, specs, images, use cases, reviews)

@app.post("/quiz/score")
async def score_quiz(quiz_answers: QuizAnswers)
# Input: category (single), useCases (array), features (array, max 5)
# Returns: Ranked product matches with match scores, match reasons, and full recommendation data

@app.get("/products/recommendations/{product_id}")
async def get_product_recommendation(product_id: str)
# Returns: Full recommendation text, strengths, weaknesses, purchase options, review sources
```

**Priority 3 - Chatbot Modal (Week 4)**

**New files:**
- `frontend/chatbot/chatbot-modal.html` - Screen 6: Chatbot modal component
- `frontend/chatbot/chatbot.css` - Chatbot modal styles
- `frontend/chatbot/chatbot.js` - Chatbot modal logic

**Screen 6 Structure (from Figma):**

**Modal Overlay:**
- Full-screen overlay with rgba(0, 0, 0, 0.5) background
- Modal card: 393px × 488px, positioned at top: 63px
- Border-radius: 25px 25px 0 0 (rounded top corners only)

**Modal Content:**
1. **Header** (75px):
   - AI bot icon (50.502px circle, #3E8EF4 background, with online indicator)
   - "Verifyr" title (Unbounded Bold 36px, #256ABB)
   - "QA Knowledge Chatbot" subtitle (Arimo Regular 12px, #6A7282)
   - Close button (X icon, top-right)

2. **First Message Bubble** (89px):
   - Background: #F0F2F5
   - Border-radius: 16px 16px 16px 6px (rounded except bottom-left)
   - Text: "Hallo! Wie kann ich dir helfen?..."
   - Timestamp: "09:11"

3. **Suggestion Buttons** (110px section):
   - Header: "Häufige Fragen:" (Frequent Questions)
   - 4 buttons in 2×2 grid (168px × 40px each)
   - Gradient: linear-gradient(166.608deg, #EFF6FF 0%, #CEDCFC 100%)
   - Border: 1.173px solid #DBEAFE
   - Questions:
     1. "Welches ist das beste Preis Leistungs-Verhältnis?"
     2. "Wie lange hält der Akku?"
     3. "Wie soll ich das Uhr benutzen?"
     4. "Wie soll ich ein Trainingsplan erstellen?"

4. **Chat Input** (58px):
   - Input field: 48px height, #F0F2F5 background
   - Placeholder: "Stell deine Fragen zum Produkt..."
   - Send button: 48px × 48px, #3E8EF4 background, disabled (50% opacity) when empty

5. **iOS Keyboard** (243px):
   - German QWERTZ layout
   - Key styling: White background, 4.6px border-radius, SF Pro Display Light 26px
   - Rows: q w e r t z u i o p / a s d f g h j k l / [Shift] y x c v b n m [Delete] / [123] [leerzeichen] [Senden]
   - Bottom icons: Emoji (left), Dictation/microphone (right)

**Features:**
- Triggered by clicking chat icon in bottom navigation
- Focus trap (Escape key closes)
- Click outside to close
- Real-time message sending to backend `/chatbot/message` endpoint
- Typing indicator while waiting for response
- Message history scrolling
- Integration with existing chat API

**Priority 4 - Navigation Flow & Integration (Week 5)**

**Files to modify:**
- `frontend/auth.js` - Update redirect from chat.html to quiz/category.html

**Current flow:**
```
Landing → Auth → Chat
```

**New flow:**
```
Landing → Auth → Category → Use Case → Features → Results (with chatbot modal) → Chat (optional)
```

**Changes needed:**
- After successful auth, redirect to `/quiz/category.html` instead of `/chat.html`
- Add "Skip to Chat" link in quiz header for power users
- Add bottom navigation with chat icon triggering chatbot modal
- Chatbot modal available on results page
- "Ask Verifyr" CTA links to full chat interface

## Phase 4: Component Creation

### Product Card Component

**File:** `frontend/design-system/components/product-card.css`

**Extract from Figma:**
- Layout structure
- Size specifications
- Colors, typography
- Spacing values
- Hover states

**Implementation:**
```css
.product-card {
    background: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-subtle);
    padding: var(--spacing-lg);
    transition: all 0.3s ease;
}

.product-card:hover {
    box-shadow: var(--shadow-elevated);
    transform: translateY(-4px);
}

/* Mobile-first responsive */
@media (max-width: 768px) {
    .product-card { padding: var(--spacing-base); }
}
```

**HTML Template:**
```html
<div class="product-card">
    <img src="..." class="product-card__image">
    <h3 class="product-card__title">Product Name</h3>
    <div class="product-card__specs">...</div>
    <div class="product-card__price">€449</div>
    <button class="btn btn-primary">Compare</button>
</div>
```

### Comparison Table Component

**File:** `frontend/design-system/components/comparison-table.css`

**Features:**
- Sticky header with product names
- Highlighted differences
- Expandable rows
- Mobile: horizontal scroll with fixed first column
- Desktop: full width with all columns visible

### Additional Components

- Filter/sort dropdown
- Settings toggle switch
- Avatar component
- Bottom navigation (mobile)

## Phase 5: iOS Pattern Adaptations

### Mobile Gesture Translations

| iOS Pattern | Web Adaptation |
|------------|----------------|
| Tab Bar (bottom) | Fixed bottom nav (mobile only) + CSS transitions |
| Swipe Back | Back button + browser back API |
| Pull to Refresh | Refresh button (or optional IntersectionObserver) |
| Action Sheet | Bottom modal (mobile) / Dropdown (desktop) |
| Segmented Control | Button group with active state |
| Long Press | Context menu button or hover state |

### Responsive Strategy

**Breakpoints:**
- 480px: Small mobile
- 768px: Large mobile / small tablet
- 1024px: Tablet / small desktop
- 1200px: Desktop

**Mobile-First Approach:**
1. Design for iOS mobile first (375px-414px)
2. Scale up with CSS Grid/Flexbox
3. Add desktop enhancements (multi-column, sidebars)

## Technical Architecture

### File Structure

```
frontend/
├── index.html              # Landing (existing)
├── chat.html               # Chat (existing - NO CHANGES)
├── auth.html               # Auth (existing)
├── admin.html              # Admin (existing)
├── app.js                  # Chat logic (existing - NO CHANGES)
├── quiz/                   # NEW - Quiz flow folder
│   ├── category.html       # NEW - Screen 1: Category selection
│   ├── use-case.html       # NEW - Screen 3: Use case selection
│   ├── features.html       # NEW - Screen 4: Feature priorities
│   ├── results.html        # NEW - Screen 5: Product recommendations carousel
│   ├── styles/
│   │   ├── quiz-common.css     # Shared quiz styles
│   │   ├── category.css        # Category page styles
│   │   ├── use-case.css        # Use case page styles
│   │   ├── features.css        # Features page styles
│   │   └── results.css         # Results page styles
│   ├── scripts/
│   │   ├── quiz-controller.js  # Quiz state management
│   │   ├── category.js         # Category page logic
│   │   ├── use-case.js         # Use case page logic
│   │   ├── features.js         # Features page logic
│   │   └── results.js          # Results page logic
│   └── data/
│       ├── categories.json     # 6 categories from Figma
│       ├── use-cases.json      # 6 use cases from Figma
│       └── features.json       # 14 features from Figma
├── chatbot/                # NEW - Chatbot modal folder
│   ├── chatbot-modal.html  # NEW - Screen 6: Chatbot modal component
│   ├── chatbot.css         # Chatbot modal styles
│   └── chatbot.js          # Chatbot modal logic
├── services/
│   └── api.js              # NEW - Centralized API calls
├── images/
│   └── products/           # NEW - Product images
│       ├── apple_watch_s11.jpg
│       ├── garmin_forerunner_970.jpg
│       └── placeholder.jpg
└── design-system/
    ├── tokens/             # Existing (may need color updates)
    ├── components/         # New components added
    │   ├── selection-card.css          # NEW - 150×168px quiz tile
    │   ├── product-recommendation-card.css  # NEW - 303×1847px product card
    │   ├── review-box.css              # NEW - Review source boxes
    │   ├── purchase-buttons.css        # NEW - Yellow gradient buttons
    │   ├── progress.css                # NEW - Progress indicator
    │   └── navigation.css              # NEW - Bottom navigation
    ├── Figma_Design_Spec.md    # UPDATED - Complete 6-screen specification
    └── PLATFORM_ALIGNMENT.md   # NEW (optional) - Token mapping doc
```

### State Management

**localStorage keys:**
```javascript
verifyr_access_token              // Existing
verifyr_user_id                   // Existing
verifyr_conversations             // Existing
verifyr_preferences               // NEW - {theme, language, notifications}
verifyr_saved_products            // NEW - [product_ids]
verifyr_comparison_session        // NEW - {product_ids, filters}
```

### API Service Pattern

**Create:** `frontend/services/api.js`

```javascript
const API = {
    baseURL: 'http://localhost:8000',

    getAuthHeaders() {
        const token = localStorage.getItem('verifyr_access_token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    },

    async getProducts(filters = {}) {
        const params = new URLSearchParams(filters);
        const response = await fetch(`${this.baseURL}/products?${params}`, {
            headers: this.getAuthHeaders()
        });
        return response.json();
    },

    async compareProducts(productIds) {
        const response = await fetch(`${this.baseURL}/products/compare`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ product_ids: productIds })
        });
        return response.json();
    },

    async saveProduct(productId) {
        const userId = localStorage.getItem('verifyr_user_id');
        const response = await fetch(`${this.baseURL}/users/${userId}/saved_products`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ product_id: productId })
        });
        return response.json();
    }
};
```

## Quality Assurance

### Testing Checklist per Screen

**Cross-Browser:**
- [ ] Chrome (desktop + mobile DevTools)
- [ ] Firefox (desktop + mobile)
- [ ] Safari (desktop + iOS)
- [ ] Edge (desktop)

**Responsive:**
- [ ] iPhone SE (375px)
- [ ] iPhone 14 Pro (393px)
- [ ] iPad (768px)
- [ ] Desktop (1280px, 1920px)

**Functionality:**
- [ ] All links work
- [ ] Forms submit correctly
- [ ] API calls succeed
- [ ] Error states display
- [ ] Loading states appear
- [ ] Authentication flows work

**Accessibility:**
- [ ] Semantic HTML
- [ ] Keyboard navigation
- [ ] Screen reader testing
- [ ] Color contrast (WCAG AA: 4.5:1)
- [ ] Focus indicators
- [ ] Alt text for images

### Performance Targets

- Page load time: <3s
- Time to Interactive: <2s
- Cumulative Layout Shift: <0.1
- First Contentful Paint: <1.5s

**Tools:**
- Chrome Lighthouse
- WebPageTest
- Performance tab in DevTools

## Verification Steps

### After Figma MCP Setup
```powershell
# Test in Claude Code
# Ask: "List my Figma files"
# Ask: "Extract design tokens from [Figma file URL]"
```

### After Design System Update
1. Open existing pages (index.html, chat.html, auth.html)
2. Verify all pages still render correctly
3. Check color consistency
4. Verify typography looks good
5. Test responsive breakpoints

### After Each New Feature
1. Load new page (e.g., comparison.html)
2. Test all interactions
3. Verify API integration
4. Test mobile responsiveness
5. Check browser console for errors
6. Validate HTML/CSS

### End-to-End Test Flow
1. **User journey:**
   - Land on index.html
   - Click "Try Verifyr" → Redirect to auth.html
   - Log in → Redirect to chat.html
   - Ask product question
   - Click "Compare Products" link → Navigate to comparison.html
   - View comparison table
   - Click product → Navigate to results.html (if detailed view)
   - Save product → Check profile.html saved products
   - Log out → Redirect to auth.html

2. **Verify:**
   - No console errors
   - All navigation works
   - State persists across pages
   - Authentication works throughout
   - Responsive design works on all screen sizes

## Timeline

| Week | Focus | Deliverables | Status |
|------|-------|--------------|--------|
| 1 | Figma MCP Setup & Design Extraction | Figma Desktop MCP configured, 6 screens extracted, Figma_Design_Spec.md created (2267 lines), categories/use-cases/features JSON files | ✅ COMPLETE |
| 2 | Backend Development | products_metadata.json, quiz scoring endpoint, recommendations endpoint implemented | 🔄 IN PROGRESS |
| 3 | Quiz Flow (3 pages) | category.html, use-case.html, features.html with selection cards, quiz-controller.js state management | 📋 PENDING |
| 4 | Results & Chatbot | results.html with carousel, chatbot modal, product cards, review boxes, purchase buttons | 📋 PENDING |
| 5 | Integration & Testing | Auth redirect updated, end-to-end testing, responsive testing, accessibility audit, deployment | 📋 PENDING |

## Critical Files

**To Create:**

**Frontend - Quiz Pages:**
- `frontend/quiz/category.html` - Screen 1: Category selection page
- `frontend/quiz/use-case.html` - Screen 3: Use case selection page
- `frontend/quiz/features.html` - Screen 4: Feature priorities page
- `frontend/quiz/results.html` - Screen 5: Product recommendations carousel
- `frontend/quiz/styles/quiz-common.css` - Shared quiz styles
- `frontend/quiz/styles/category.css` - Category page styles
- `frontend/quiz/styles/use-case.css` - Use case page styles
- `frontend/quiz/styles/features.css` - Features page styles
- `frontend/quiz/styles/results.css` - Results carousel styles
- `frontend/quiz/scripts/quiz-controller.js` - Quiz state management
- `frontend/quiz/scripts/category.js` - Category page logic
- `frontend/quiz/scripts/use-case.js` - Use case page logic
- `frontend/quiz/scripts/features.js` - Features page logic
- `frontend/quiz/scripts/results.js` - Results carousel logic
- `frontend/quiz/data/categories.json` - 6 categories (from Figma)
- `frontend/quiz/data/use-cases.json` - 6 use cases (from Figma)
- `frontend/quiz/data/features.json` - 14 features (from Figma)

**Frontend - Chatbot Modal:**
- `frontend/chatbot/chatbot-modal.html` - Screen 6: Chatbot overlay
- `frontend/chatbot/chatbot.css` - Chatbot modal styles
- `frontend/chatbot/chatbot.js` - Chatbot modal logic

**Frontend - Components:**
- `frontend/design-system/components/selection-card.css` - 150×168px quiz tile
- `frontend/design-system/components/product-recommendation-card.css` - 303×1847px product card
- `frontend/design-system/components/review-box.css` - Review source boxes
- `frontend/design-system/components/purchase-buttons.css` - Yellow gradient buttons
- `frontend/design-system/components/progress.css` - Progress indicator
- `frontend/design-system/components/navigation.css` - Bottom navigation

**Frontend - Product Images:**
- `frontend/images/products/apple_watch_s11.jpg` - Apple Watch Series 11 image
- `frontend/images/products/garmin_forerunner_970.jpg` - Garmin Forerunner 970 image
- `frontend/images/products/placeholder.jpg` - Fallback image
- `frontend/images/quiz/` - Category/use case/feature icons (extract from Figma)

**Backend:**
- `data/products_metadata.json` - Product specs, use cases, and metadata
- `backend/main.py` - Add 3 new endpoints:
  - `GET /products/metadata` - Returns product data
  - `POST /quiz/score` - Scores quiz (category, useCases[], features[]), returns ranked products with match reasons
  - `GET /products/recommendations/{product_id}` - Returns full recommendation with reviews

**To Modify:**
- `frontend/auth.js` - Update redirect from chat.html to quiz/category.html (line ~150-160)

**Already Created:**
- ✅ `frontend/design-system/Figma_Design_Spec.md` - Complete 6-screen design documentation (2267 lines)

**To Reference (NO CHANGES):**
- `frontend/chat.html` - Chat interface (unchanged)
- `frontend/app.js` - Chat logic (unchanged)
- `frontend/index.html` - Landing page (unchanged)
- `frontend/design-system/tokens/` - Existing design tokens (colors, typography, spacing, shadows)

## Success Criteria

**Phase 1 - Figma MCP Setup (✅ COMPLETE):**
- ✅ Figma Desktop MCP server installed and configured
- ✅ Access to Verifyr iOS Figma file verified (6 screens)
- ✅ Screen 1: Category Cards extracted (6 categories, single-select)
- ✅ Screen 2: Category Selection State extracted (selected styling)
- ✅ Screen 3: Use Case Selection extracted (6 use cases, multi-select)
- ✅ Screen 4: Feature Priorities extracted (14 features, max 5, photographic)
- ✅ Screen 5: Product Recommendations extracted (carousel with reviews)
- ✅ Screen 6: QA Chatbot Modal extracted (overlay with iOS keyboard)
- ✅ Design specs documented in Figma_Design_Spec.md (2267 lines)

**Phase 2 - Backend Implementation:**
- [ ] `data/products_metadata.json` created with Apple Watch & Garmin data
- [ ] `GET /products/metadata` endpoint returns product specs
- [ ] `POST /quiz/score` endpoint scores quiz and returns ranked matches
- [ ] `GET /products/recommendations/{product_id}` returns full recommendation with reviews
- [ ] Quiz scoring algorithm weighs category (40%), use cases (35%), features (25%)
- [ ] Match reasons generated for each product

**Phase 3 - Quiz Flow Implementation:**
- [ ] Screen 1: Category selection page works (single-select, 6 options)
- [ ] Screen 3: Use case selection page works (multi-select, 6 options)
- [ ] Screen 4: Feature priorities page works (multi-select, max 5, 14 options)
- [ ] Selection cards: 150px × 168px with blue border + checkmark when selected
- [ ] Progress indicator shows current step (1 of 3, 2 of 3, 3 of 3)
- [ ] Navigation: Back button (chevron-left), Continue button (#3E8EF4)
- [ ] Quiz state persists in localStorage
- [ ] Quiz submission redirects to results page with top 2 products

**Phase 4 - Results & Chatbot:**
- [ ] Screen 5: Product recommendations carousel displays horizontally
- [ ] Product cards: 303px × 1847px (tall, vertically scrollable)
- [ ] Each card includes: image, title, rating, tabs, 3 purchase buttons (yellow gradient)
- [ ] Recommendation section with strengths/weaknesses lists
- [ ] Review sources display: Trusted Reviews, Heise, Outdoor Gear Lab, Reddit, YouTube, Amazon
- [ ] Bottom navigation with 5 icons (chat icon center, elevated)
- [ ] Screen 6: Chatbot modal opens from chat icon
- [ ] Chatbot modal: 393px × 488px with iOS keyboard (QWERTZ), suggestion buttons
- [ ] Chatbot sends messages to backend, displays responses
- [ ] Close modal with X button, Escape key, or click outside

**Phase 5 - Integration & Polish:**
- [ ] Auth redirect updated: chat.html → quiz/category.html
- [ ] User flow works: Landing → Auth → Category → Use Case → Features → Results → (Chatbot Modal) → Chat
- [ ] No broken links or redirects
- [ ] Authentication verified at each step
- [ ] "Ask Verifyr" CTA links to full chat interface

**Design Quality:**
- [ ] Matches Figma iOS design specifications (150×168px cards, 303×1847px product cards)
- [ ] Colors accurate: #256ABB (brand), #3E8EF4 (primary), #011928 (text), #FDC700 (purchase yellow)
- [ ] Typography correct: Inter (primary), Unbounded (logo), SF Pro (system), Arimo (alt)
- [ ] Responsive on all breakpoints (393px iPhone 14 Pro → 1920px desktop)
- [ ] Smooth animations and transitions (0.3s cubic-bezier(0.4, 0, 0.2, 1))
- [ ] Multi-language support (DE primary, EN secondary)

**Technical Quality:**
- [ ] No console errors across all 6 screens
- [ ] Backend API responses < 2s
- [ ] Quiz scoring algorithm accurate (weighted scoring)
- [ ] Lighthouse scores >90 (Performance, Accessibility, Best Practices, SEO)
- [ ] Cross-browser compatible (Chrome, Firefox, Safari, Edge)
- [ ] Accessible (WCAG AA) - keyboard navigation, screen readers, focus indicators, color contrast
- [ ] Touch targets ≥44px × 44px

**Chat Interface Unchanged:**
- [ ] Existing chat.html and app.js work without modifications
- [ ] Users can access full chat from results page "Ask Verifyr" CTA
- [ ] Chatbot modal is separate from full chat interface
- [ ] All existing chat features functional
- [ ] No breaking changes to chat flow
