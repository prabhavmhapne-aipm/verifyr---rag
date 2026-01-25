# Figma iOS to Web Integration Plan - Verifyr

## Overview
Integrate iOS Figma designs into Verifyr web app by:
1. Setting up Figma MCP server for design access
2. Creating unified design system across platforms
3. Adding new features from iOS designs (product comparison, results, profile)
4. Enhancing existing chat interface with iOS patterns

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

**Priority 0 - Chat Enhancement (Days 4-5)**
- Extract iOS chat UI patterns via Figma MCP
- Update message bubble styles if iOS improves them
- Enhance mobile responsiveness
- Add any new interactions from iOS

**Priority 1 - Product Comparison (Week 2)**

**New files:**
- `frontend/comparison.html`
- `frontend/comparison.js`
- `frontend/comparison.css`
- `frontend/design-system/components/product-card.css`

**Backend API needed:**
```python
# backend/main.py - Add endpoints
@app.get("/products")
async def get_products(category: str = None, sort_by: str = None)

@app.post("/products/compare")
async def compare_products(product_ids: List[str])
```

**Features:**
- Side-by-side product comparison table
- Product cards with key specs
- Filtering and sorting
- Responsive: horizontal scroll (mobile), full width (desktop)
- Link from chat results to comparison

**Priority 2 - Search Results Page (Week 3)**

**New files:**
- `frontend/results.html`
- `frontend/results.js`
- `frontend/results.css`

**Features:**
- Product grid with filtering
- Search functionality
- Sort options
- Mobile-optimized cards
- Quick action buttons (Compare, Save)

**Priority 3 - Profile & Settings (Week 4)**

**New files:**
- `frontend/profile.html`
- `frontend/profile.js`
- `frontend/profile.css`
- `frontend/design-system/components/settings.css`

**Features:**
- User profile display
- Preferences (language, notifications)
- Conversation history (beyond sidebar)
- Saved products/favorites
- Account settings

**Backend API needed:**
```python
@app.post("/users/{user_id}/saved_products")
async def save_product(user_id: str, product_id: str)

@app.get("/users/{user_id}/preferences")
async def get_preferences(user_id: str)

@app.put("/users/{user_id}/preferences")
async def update_preferences(user_id: str, preferences: dict)
```

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
├── chat.html               # Chat (existing, enhanced)
├── auth.html               # Auth (existing, enhanced)
├── admin.html              # Admin (existing)
├── comparison.html         # NEW
├── results.html            # NEW
├── profile.html            # NEW
├── saved.html              # NEW (optional)
├── app.js                  # Chat logic
├── comparison.js           # NEW
├── results.js              # NEW
├── profile.js              # NEW
├── services/
│   └── api.js              # NEW - Centralized API calls
└── design-system/
    ├── tokens/             # Updated with iOS alignment
    ├── components/         # New components added
    └── PLATFORM_ALIGNMENT.md  # NEW - Token mapping doc
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
   - Click "Start Chatting" → Redirect to auth.html
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

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | Setup & Design System | Figma MCP working, tokens aligned, chat enhanced |
| 2 | Product Comparison | comparison.html complete, API integrated |
| 3 | Search Results | results.html complete, filtering working |
| 4 | Profile & Settings | profile.html complete, preferences working |
| 5 | QA & Polish | All features tested, documentation complete |

## Critical Files

**To Create:**
- `frontend/comparison.html`
- `frontend/comparison.js`
- `frontend/results.html`
- `frontend/results.js`
- `frontend/profile.html`
- `frontend/profile.js`
- `frontend/services/api.js`
- `frontend/design-system/components/product-card.css`
- `frontend/design-system/components/comparison-table.css`
- `frontend/design-system/PLATFORM_ALIGNMENT.md`

**To Modify:**
- `frontend/design-system/tokens/colors.css`
- `frontend/design-system/tokens/typography.css`
- `frontend/design-system/tokens/spacing.css`
- `frontend/chat.html` (enhancements)
- `backend/main.py` (new API endpoints)

**To Reference:**
- `frontend/app.js` - State management patterns
- `frontend/auth.js` - Authentication patterns
- `frontend/design-system/` - All existing components

## Success Criteria

**Design System:**
- ✓ Figma MCP server accessible
- ✓ iOS tokens extracted and documented
- ✓ Web design system aligned with iOS
- ✓ All existing pages still work with updated tokens

**New Features:**
- ✓ Product comparison page functional
- ✓ Search results page functional
- ✓ Profile/settings page functional
- ✓ All features responsive (mobile → desktop)
- ✓ All API integrations working

**Quality:**
- ✓ Cross-browser compatible
- ✓ Accessible (WCAG AA)
- ✓ Performance metrics met
- ✓ No console errors
- ✓ Documentation complete
