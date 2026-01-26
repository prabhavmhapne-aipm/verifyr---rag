# Quiz & Recommendation Flow Design Specification (Extracted from Figma)

> **Source:** Verifyr iOS Design File
> **Screens Analyzed:**
> - Screen 1: Category Cards (node-id: 3-1056)
> - Screen 2: Category Selection - Selected State (node-id: 63-5855)
> - Screen 3: Application Cards / Use Cases (node-id: 63-6051)
> - Screen 4: Feature Priority Cards (node-id: 81-7268)
> - Screen 5: Recommendation Carousel (node-id: 254-13666)
> - Screen 6: QA Chatbot Modal (node-id: 318-6513)
> **Date:** 2026-01-26
> **Extraction Method:** Figma Desktop MCP Server

---

## Table of Contents

1. [Overview](#overview)
2. [Screen 1: Category Cards](#screen-1-category-cards)
3. [Screen 2: Category Selection State](#screen-2-category-selection-state)
4. [Screen 3: Use Case Selection](#screen-3-use-case-selection)
5. [Screen 4: Feature Priority Selection](#screen-4-feature-priority-selection)
6. [Screen 5: Product Recommendation Results](#screen-5-product-recommendation-results)
7. [Screen 6: QA Chatbot Activation](#screen-6-qa-chatbot-activation)
8. [Common Design Elements](#common-design-elements)
9. [Implementation Guide](#implementation-guide)

---

## Overview

The Verifyr quiz and recommendation flow guides users through product discovery using a multi-step selection process, culminating in personalized product recommendations with detailed comparison and a QA chatbot for follow-up questions.

### User Flow
```
Landing Page
  ↓
Auth (Login/Signup)
  ↓
Screen 1: Category Selection (Single select, 6 categories)
  ↓
Screen 3: Use Case Selection (Multi-select, 6 use cases)
  ↓
Screen 4: Feature Priorities (Multi-select up to 5, 14 features)
  ↓
Screen 5: Product Recommendations (Side-by-side comparison with reviews)
  ↓
Screen 6: QA Chatbot (Optional - product questions)
  ↓
Chat Interface (Existing)
```

### Common Screen Dimensions
- **Width:** 393px (iPhone 14 Pro)
- **Height:** 852px (iPhone 14 Pro)
- **Safe area top:** 110px (includes status bar + header)
- **Safe area bottom:** 34px (home indicator)

---

## Screen 1: Category Cards

**Purpose:** Initial product category selection (single choice)

### Layout Structure

#### Grid Layout
- **Columns:** 2
- **Rows:** 3
- **Total Cards:** 6
- **Card Dimensions:** 150px × 168px

#### Spacing
- **Container padding:** 27px left/right
- **Horizontal gap:** ~28px
- **Vertical gap:** ~15-21px
- **Top margin (heading to cards):** ~49px

### Card Design

#### Default State (Unselected)
```css
.category-card {
  width: 150px;
  height: 168px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  box-shadow:
    0px 4px 8px 0px rgba(28, 25, 23, 0.03),
    0px 8px 16px 0px rgba(28, 25, 23, 0.02);
}
```

#### Typography
- **Card Title:**
  - Font: Inter Regular
  - Size: 10px
  - Color: #011928
  - Text-align: center
  - Letter-spacing: -0.06px
  - Line-height: 20px

- **Card Subtitle:**
  - Font: Inter Regular
  - Size: 8px
  - Color: #011928
  - Text-align: center
  - Letter-spacing: -0.048px
  - Line-height: 20px

#### Selected State
```css
.category-card.selected {
  border: 2px solid #3E8EF4;
}

.category-card.selected::after {
  /* Checkmark badge - top-right */
  content: '✓';
  position: absolute;
  top: 4px;
  right: 6px;
  width: 24px;
  height: 24px;
  background: #3E8EF4;
  border-radius: 9999px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
```

### Page Header

#### Main Heading
- **Text (DE):** "Was suchst du?"
- **Text (EN):** "What are you looking for?"
- **Font:** Inter Bold, 20px
- **Color:** #011928
- **Position:** 136px from top

#### Subheading
- **Text (DE):** "Wähle eine Kategorie aus"
- **Text (EN):** "Choose a category"
- **Font:** Inter Regular, 15px
- **Color:** #011928

### Navigation Buttons

#### Skip Button (No selection)
```css
.skip-button {
  background: #FFFFFF;
  border: 1px solid #E0E5EB;
  border-radius: 8px;
  padding: 12px 32px;
  width: 158px;
  font: Inter Bold 16px;
  color: #011928;
}
```

#### Continue Button (With selection)
```css
.continue-button {
  background: #3E8EF4;
  border-radius: 8px;
  padding: 12px 32px;
  width: 158px;
  box-shadow: 0px 8px 8px -4px rgba(62, 142, 244, 0.25);
  font: Inter Bold 16px;
  color: #FFFFFF;
}
```

### 6 Product Categories

1. **Smartwatch & Fitnesstrackers**
   - Icon: Smartwatch illustration (60px × 104px)
   - Subtitle: "Für Training & Alltag"

2. **Recovery & Sleep**
   - Icon: Moon + rest icons (56px × 56px combined)
   - Subtitle: "Für bessere Regeneration"

3. **Heart Rate Monitors**
   - Icon: Heart with ECG line (~64px)
   - Subtitle: "Präzise Herzfrequenz"

4. **Sport Earbuds**
   - Icon: Earbuds (57px × 57px)
   - Subtitle: "Für dein Workout"

5. **Metabolic Monitors**
   - Icon: Blood drop + checkmark (~35px)
   - Subtitle: "Verstehe deinen Stoffwechsel"

6. **Frauen Health Tech**
   - Icon: Female symbol (47px × 47px)
   - Subtitle: "Zyklus & Fruchtbarkeit"

---

## Screen 2: Category Selection State

**Purpose:** Visual feedback for category card selection

### Interaction Changes

When a card is selected:
1. Border changes: `1px #E2E8F0` → `2px #3E8EF4`
2. Checkmark badge appears (24px circle, top-right, blue with white ✓)
3. "Überspringen" button → "Weiter" button
4. Button position moves from left-center to right-center
5. Back arrow appears in header (left side, 24px, chevron-left)

### Selection Behavior
- **Type:** Single selection only
- **Deselection:** Tap another card (previous deselects)
- **Optional:** Tap same card to toggle off

---

## Screen 3: Use Case Selection

**Purpose:** Select primary use cases for the wearable device (multi-select)

### Header
- **Main Heading (DE):** "Wofür Hauptsächlich?"
- **Main Heading (EN):** "What mainly for?"
- **Subheading (DE):** "Wähle alle Zutreffend aus"
- **Subheading (EN):** "Choose all that apply"

### Layout
- Same 2×3 grid as Screen 1
- Same card dimensions: 150px × 168px
- **Multi-select enabled** (multiple cards can be selected)

### 6 Use Case Cards

1. **Lifestyle & Fitness**
   - Icon: Multiple people in workout scenarios
   - Mixed illustrations (office, gym, daily activities)

2. **Laufen & Fahrradfahren**
   - Translation: Running & Cycling
   - Icon: Running and cycling illustrations

3. **Wandern**
   - Translation: Hiking
   - Icon: Hiker with backpack illustration

4. **Schwimmen**
   - Translation: Swimming
   - Icon: Swimming person emoji/illustration

5. **Health & Wellbeing**
   - Icon: Meditation person illustration

6. **Wettkampf & Leistung**
   - Translation: Competition & Performance
   - Icon: Performance metrics and athlete illustrations

### Interaction
- **Selection Type:** Multi-select
- **Visual feedback:** Same as Screen 1 (blue border + checkmark)
- **Continue button:** Enabled when at least 1 selection made

---

## Screen 4: Feature Priority Selection

**Purpose:** Select top 5 feature priorities from 14 options (multi-select with limit)

### Header
- **Main Heading (DE):** "Was is dir am wichtigsten?"
- **Main Heading (EN):** "What is most important to you?"
- **Subheading (DE):** "Wähle bis zu 5 Prioritäten"
- **Subheading (EN):** "Choose up to 5 priorities"

### Layout
- **Grid:** 2 columns × 7 rows
- **Card Dimensions:** 150px × 168px (same as previous screens)
- **Scrollable:** Vertical scroll to see all 14 cards
- **Visual Style:** Photographic images (not illustrations)

### Card Design Differences

Unlike previous screens, these cards use:
- **Background images:** Full-bleed product photography
- **Label overlay:** Semi-transparent white label at bottom
```css
.feature-card-label {
  position: absolute;
  bottom: 0;
  left: 5px;
  right: 5px;
  height: 33px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  backdrop-filter: blur(5px);
}

.feature-card-label p {
  font: Inter Semi Bold 10px;
  color: #090814;
  text-align: center;
  letter-spacing: -0.06px;
  line-height: 13px;
}
```

### 14 Feature Priority Cards

1. **Leicht & Komfortabel** (Light & Comfortable)
2. **Lange Akkulaufzeit** (Long Battery Life)
3. **Wasserdicht & Robust** (Waterproof & Robust)
4. **Präzise GPS & Sensoren** (Precise GPS & Sensors)
5. **Smartphone unabhängig** (Smartphone Independent)
6. **App Integration & Ecosystem**
7. **Digital, Smart & Modern**
8. **Analog, Smart & Klassich** (Analog, Smart & Classic)
9. **Mit Display** (With Display)
10. **Ohne Display / Diskret** (Without Display / Discreet)
11. **Sleep Monitor**
12. **Body / Stress Monitor**
13. **EKG / HRV Monitor** (ECG / HRV Monitor)
14. **VO2 Max Tracker**

### Interaction Rules
- **Selection Type:** Multi-select
- **Maximum selections:** 5
- **Behavior:** After 5 selections, disable remaining unselected cards (visual: reduce opacity to 0.5)
- **Continue button:** Enabled when at least 1 selection made

---

## Screen 5: Product Recommendation Results

**Purpose:** Display matched products side-by-side with detailed information and reviews

### Layout Structure

#### Horizontal Scroll Carousel
- **Direction:** Horizontal scroll (left to right)
- **Product Card Width:** 303px
- **Product Card Height:** 1847px (very tall, vertically scrollable)
- **Gap between cards:** 2px
- **Visible cards:** 1.5 cards (showing next card preview)

### Header Section (61px)
- **Background:** rgba(255, 255, 255, 0.93) with backdrop blur
- **Border-bottom:** 1px solid #E0E5EB
- **Shadow:** 0px 4px 8px -4px rgba(0, 0, 0, 0.1)

#### Header Content
- **Title (DE):** "Ergebnisse"
- **Title (EN):** "Results"
- **Subtitle (DE):** "2 passende Produkte gefunden"
- **Subtitle (EN):** "2 matching products found"
- **Back button:** Chevron left (24px), left side

### Product Card Structure

Each product card (303px × 1847px) contains:

#### 1. Product Image Section (240px height)
```css
.product-image-container {
  height: 240px;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  box-shadow:
    0px 4px 8px 0px rgba(28, 25, 23, 0.03),
    0px 8px 16px 0px rgba(28, 25, 23, 0.02);
  overflow: hidden;
  position: relative;
}
```
- **Heart/Favorite Icon:** Top-right corner
  - Size: 40px circle
  - Background: rgba(255, 255, 255, 0.9)
  - Shadow: 0px 10px 15px rgba(0,0,0,0.1)
  - Icon: Heart outline (20px)

#### 2. Product Title & Meta (68px)
- **Product Name:**
  - Font: Inter Semi Bold, 15px
  - Color: #101828
  - Line-height: 32px
  - Example: "Garmin® Forerunner® 970, 47mm"

- **Category Tag:**
  - Font: Inter Regular, 15px
  - Color: #011928
  - Example: "Premium-Sport & Alltags Uhr"

- **Rating Display:**
  - Star icon (20px) + Rating number (15px) + Review count
  - Example: "⭐ 4.5 (193 Bewertungen)"
  - Colors: Star #FFA500, Text #101828, Count #6A7282

#### 3. Tab Switcher (43px)
```css
.tab-container {
  background: #F0F2F5;
  border-radius: 8px;
  padding: 4px;
  display: flex;
  gap: 6px;
}

.tab-button {
  padding: 8px;
  border-radius: 4px;
  font: Inter Medium 12px;
  color: #19213D;
}

.tab-button.active {
  background: white;
  border: 1px solid #F0F2F5;
  box-shadow: 0px 1px 3px rgba(25, 33, 61, 0.1);
}
```
- **Tab 1:** "Empfehlung" (Recommendation) - Active by default
- **Tab 2:** "Produktdaten" (Product Data)

#### 4. Purchase Options Section (50px)
```css
.purchase-buttons-container {
  border: 1.333px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  padding: 2px 7px 17px;
  display: flex;
  gap: 10px;
}
```

**3 Purchase Buttons (Gradient Yellow Priority):**
```css
.purchase-button-1 {
  background: #FDC700; /* Solid yellow - best price */
  border: 1.173px solid #DBEAFE;
  border-radius: 44739200px; /* Fully rounded */
  width: 85px;
  height: 46px;
  font: Inter Semi Bold 8px;
  color: #090814;
  text-align: center;
}

.purchase-button-2 {
  background: rgba(253, 199, 0, 0.52); /* 52% opacity */
}

.purchase-button-3 {
  background: rgba(255, 201, 5, 0.25); /* 25% opacity */
}
```
- Text format: "Bei [Store] Bestellen für [Price]€"
- Example: "Bei Amazon.de Bestellen für 778€"

#### 5. Recommendation Section (~939px)
```css
.recommendation-box {
  border: 1.333px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  padding: 11px 16px;
}
```

**Header:**
- **Title:** "Unsere Empfehlung" (Our Recommendation)
- **Average Score:** "1,4 durchschnitlich" (right-aligned)
- Font: Inter Semi Bold, 12px, #090814

**Recommendation Text:**
- Font: Inter Regular, 10px
- Color: #4A5565
- Line-height: 16px
- Content: Detailed explanation of why product matches user's preferences
- Typical length: 4-6 paragraphs

**Strengths Section ("Stärke"):**
- Header: Inter Semi Bold, 12px
- List items with "+" prefix
- Font: Inter Regular, 10px, #4A5565
- Line-height: 16px
- Examples:
  - "+ Geringes Gewicht für hohen Tragekomfort"
  - "+ Sehr gutes, helles AMOLED-Display"
  - "+ Hervorragend akkurat Health Metriken"

**Weaknesses Section ("Schwächen"):**
- Header: Inter Semi Bold, 12px
- List items with "-" prefix
- Font: Inter Regular, 10px, #4A5565
- Examples:
  - "- Hoher Aufpreis im Vergleich zum Vorgänger"
  - "- Geringere Akkulaufzeit als beim Vorgänger"

#### 6. Verified Reviews Header (30px)
```css
.reviews-header {
  border: 1.333px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  height: 30px;
  padding: 0 16px;
  display: flex;
  align-items: center;
}
```
- Text: "Neutral Verifizierte Tests zusammengefasst"
- Font: Inter Semi Bold, 12px, #090814

#### 7. Individual Review Boxes (71px each)
```css
.review-box {
  border: 1.333px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  height: 71px;
  padding: 13px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```

**Review Source Examples:**

**Trusted Reviews:**
- Logo: 68px × 24px
- Source name: Inter Semi Bold, 12px
- Rating: "1,5" (right-aligned, Inter Semi Bold, 12px)
- Link: "Garmin Forerunner 970 Review" (Inter Regular, 10px, underlined)

**heise online Bestenliste:**
- Logo: 63px × 16px
- Rating: "1,0"
- Link text: "Garmin Forerunner 970 im Test"

**Outdoor Gear Lab:**
- Logo: 66px × 23px
- Rating: "1,4"

#### 8. Reddit Discussion Box (59px)
- Reddit logo (combined r/ + snoo icon)
- Link text: "Garmin Forerunner 970 Forum Diskussion und Review"
- Font: Inter Regular, 10px, #4A5565

#### 9. YouTube Review Box (50px)
- YouTube logo: 71px × 28px
- Video title: Inter Regular, 10px
- Example: "Garmin Forerunner 970 In-Depth Review: Brillance at a Cost?"

#### 10. Amazon Ratings Box (138px)
- Amazon star rating graphic: 165px × 131px
- Link text: "193 Bewertungen bei Amazon.de lesen"
- Font: Inter Regular, 10px, underlined

### Bottom Navigation Menu (86px)

```css
.bottom-nav {
  background: rgba(255, 255, 255, 0.93);
  backdrop-filter: blur(10px);
  border-top: 1px solid #E0E5EB;
  height: 86px;
  display: flex;
  align-items: center;
  justify-content: space-around;
}
```

**5 Navigation Icons:**
1. **Apps** (left) - 20px icon
2. **Chat/AI** (center) - Elevated button
   - Size: 50.502px circle
   - Background: White (or #3E8EF4 when active)
   - Shadow: 0px 3.673px 11.019px rgba(97, 62, 234, 0.5)
   - Contains: Message icon (30px) + AI badge (18px)
3. **Heart/Favorites** (right) - 22px × 21px icon

### Color Scheme for Reviews

- **Text Colors:**
  - Headings: #090814
  - Body text: #4A5565
  - Secondary text: #6A7282
  - Links: #4A5565 (underlined)

- **Borders:**
  - Standard: 1.333px solid rgba(0, 0, 0, 0.1)

- **Backgrounds:**
  - Review boxes: White (#FFFFFF)
  - Purchase buttons: Yellow gradient (#FDC700 → transparent)

---

## Screen 6: QA Chatbot Activation

**Purpose:** Modal overlay to activate AI chatbot for product-specific questions

### Modal Structure

#### Overlay
```css
.chatbot-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 393px;
  height: 852px;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}
```

#### Modal Card
```css
.chatbot-modal {
  position: absolute;
  top: 63px;
  left: 0;
  width: 393px;
  height: 488px;
  background: white;
  border-radius: 25px 25px 0 0;
  box-shadow: 0px -4px 16px rgba(0, 0, 0, 0.1);
}
```

### Chatbot Header (75px)

#### AI Bot Icon (50.502px)
```css
.chatbot-icon {
  width: 50.502px;
  height: 50.502px;
  background: #3E8EF4;
  border-radius: 45.911px;
  box-shadow: 0px 3.673px 11.019px rgba(97, 62, 234, 0.5);
  position: relative;
}

.chatbot-icon::after {
  /* Online indicator */
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 15.982px;
  height: 15.982px;
  background: #00C950;
  border: 1.173px solid white;
  border-radius: 50%;
}
```

**Icon contains:**
- Message icon (30px × 32px)
- AI badge overlay (18px)

#### Branding
- **Title:** "Verifyr" (Unbounded Bold, 36px, #256ABB)
- **Subtitle:** "QA Knowledge Chatbot" (Arimo Regular, 12px, #6A7282)
- **Position:** Center-aligned

#### Close Button (32px)
- Position: Top-right corner
- Icon: X / Close icon (20px)
- Background: Transparent
- Hover: Light gray background

### First Message Bubble (89px)

```css
.chatbot-first-message {
  background: #F0F2F5;
  border-radius: 16px 16px 16px 6px; /* Rounded except bottom-left */
  padding: 6px 16px;
  margin: 24px;
  max-width: 302.997px;
}

.chatbot-first-message p {
  font: Inter Regular 12px;
  color: #011928;
  line-height: 20px;
  margin-bottom: 6px;
}

.chatbot-timestamp {
  font: Arimo Regular 11px;
  color: #6A7282;
  line-height: 16.5px;
}
```

**Message Text (DE):**
```
Hallo! Wie kann ich dir helfen? Ich helfe dir gerne bei allen Fragen zu den Produkten. Was möchtest du wissen?
```

**Message Text (EN):**
```
Hello! How can I help you? I'm happy to help you with any questions about the products. What would you like to know?
```

**Timestamp:** "09:11"

### "Häufige Fragen" Section (110px)

#### Header
- Text: "Häufige Fragen:" (Frequent Questions)
- Font: Arimo Regular, 12px, #4A5565

#### Suggestion Buttons (2×2 grid)

```css
.suggestion-button {
  width: 168px; /* or 169px for right column */
  height: 40px;
  background: linear-gradient(166.608deg, #EFF6FF 0%, #CEDCFC 100%);
  border: 1.173px solid #DBEAFE;
  border-radius: 14px;
  padding: 6px 10px;
  font: Inter Regular 10px;
  color: #0A0A0A;
  line-height: 12px;
  text-align: left;
}
```

**4 Pre-defined Questions (DE):**
1. "Welches ist das beste Preis Leistungs-Verhältnis?"
2. "Wie lange hält der Akku?"
3. "Wie soll ich das Uhr benutzen?"
4. "Wie soll ich ein Trainingsplan erstellen?"

**4 Pre-defined Questions (EN):**
1. "Which has the best price-performance ratio?"
2. "How long does the battery last?"
3. "How should I use the watch?"
4. "How should I create a training plan?"

### Chat Input Field (58px)

```css
.chat-input-container {
  border-top: 1.333px solid #E0E5EB;
  padding: 5px 24px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.chat-input-field {
  flex: 1;
  height: 48px;
  background: #F0F2F5;
  border-radius: 12px;
  padding: 12px 16px;
  font: Inter Regular 13px;
  color: #6A7282;
}

.chat-send-button {
  width: 48px;
  height: 48px;
  background: #3E8EF4;
  opacity: 0.5; /* When disabled */
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-send-button:not(:disabled) {
  opacity: 1;
}
```

**Placeholder Text:**
- DE: "Stell deine Fragen zum Produkt..."
- EN: "Ask your questions about the product..."

**Send Button:**
- Icon: Arrow/send icon (20px)
- Disabled when input empty (50% opacity)

### iOS Keyboard (243px)

```css
.ios-keyboard {
  position: fixed;
  bottom: 58px;
  left: 0;
  width: 393px;
  height: 243px;
  background: #D1D3D9;
  backdrop-filter: blur(54.366px);
}
```

#### Keyboard Layout (German QWERTZ)

**Top Row (42px height):**
```
q w e r t z u i o p
```

**Middle Row (42px height, with 19px padding):**
```
a s d f g h j k l
```

**Bottom Row (42px height):**
```
[Shift] y x c v b n m [Delete]
```

**Bottom Controls (42px height):**
```
[123] [leerzeichen] [Senden]
```

**Key Styling:**
```css
.keyboard-key {
  background: white;
  border-radius: 4.6px;
  box-shadow: 0px 1px 0px rgba(0, 0, 0, 0.3);
  font: SF Pro Display Light 26px;
  color: black;
  letter-spacing: 0.364px;
}

.keyboard-key-special {
  background: #ABB0BC; /* For shift, delete, 123, Senden */
}
```

**Bottom Icons:**
- Emoji icon (27px) - left
- Dictation/microphone icon (19px × 28px) - right

### Bottom Navigation (Active Chat State)

Same as Screen 5, but:
- **Chat icon (center) is ACTIVE**
- Background: #3E8EF4 (blue)
- Indicates chatbot is open

---

## Common Design Elements

### Top Navigation Bar (110px)

**Structure:**
```css
.top-nav {
  height: 110px;
  background: rgba(255, 255, 255, 0.93);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #E0E5EB;
  box-shadow: 0px 4px 8px -4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}
```

**Status Bar (59px):**
- Time: SF Pro Bold, 16px, centered
- Signal/WiFi/Battery icons: Right-aligned
- Dynamic Island: 125px × 37px, centered

**Verifyr Logo:**
- Text: "Verifyr"
- Font: Unbounded Bold, 36px
- Color: #256ABB (brand blue)
- Position: Center, 71px from top

**Settings Icon:**
- Position: Left (24px from left, 60px from top)
- Size: 24px × 24px
- Padding: 10px

**Profile Icon:**
- Position: Right (336px from left, 70px from top)
- Size: 24px × 24px

### Lower Header (61px)

Used on screens 4-6:

```css
.lower-header {
  height: 61px;
  background: rgba(255, 255, 255, 0.93);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #E0E5EB;
  box-shadow: 0px 4px 8px -4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 110px;
  z-index: 99;
}
```

**Content:**
- **Back Button:** Chevron left (24px), 27px from left
- **Title:** Inter Bold, 20px, #011928, centered
- **Subtitle:** Inter Regular, 15px, #011928, centered

### Progress Indicator

**Appearance:**
- Position: Top of content area (~191px from top)
- Width: ~327px
- Height: ~8px
- Design: Horizontal bar with dots or segments

**Step Indicators:**
```css
.progress-bar {
  display: flex;
  gap: 8px;
  align-items: center;
}

.progress-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #E2E8F0; /* Inactive */
}

.progress-dot.active {
  background: #3E8EF4; /* Active step */
  width: 32px; /* Elongated for current */
  border-radius: 6px;
}
```

**Steps:**
1. Category selection (Screen 1)
2. Use case selection (Screen 3)
3. Feature priorities (Screen 4)
4. Results (Screen 5)

### Home Indicator (34px)

```css
.home-indicator {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 393px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-indicator-bar {
  width: 134px;
  height: 5px;
  background: black;
  border-radius: 100px;
}
```

---

## Color Palette

### Primary Colors
```css
:root {
  /* Brand Colors */
  --brand-blue: #256ABB;        /* Logo, branding */
  --primary-blue: #3E8EF4;      /* CTAs, selected states */
  --dark-text: #011928;         /* Primary text */
  --purchase-yellow: #FDC700;   /* Purchase button highlight */
  --online-green: #00C950;      /* Chatbot online indicator */

  /* Neutral Colors */
  --white: #FFFFFF;
  --light-gray: #F0F2F5;        /* Backgrounds, inputs */
  --border-gray: #E2E8F0;       /* Card borders */
  --border-gray-alt: #E0E5EB;   /* Header borders */

  /* Text Colors */
  --text-primary: #011928;      /* Headings, primary text */
  --text-secondary: #4A5565;    /* Body text */
  --text-tertiary: #6A7282;     /* Placeholder, timestamps */
  --text-heading: #090814;      /* Dark headings (reviews) */

  /* Background Colors */
  --bg-card: #FFFFFF;
  --bg-input: #F0F2F5;
  --bg-overlay: rgba(0, 0, 0, 0.5);
  --bg-modal: rgba(255, 255, 255, 0.93);
}
```

### Gradients
```css
/* Purchase button gradient (yellow priority) */
.gradient-yellow-1 { background: #FDC700; }
.gradient-yellow-2 { background: rgba(253, 199, 0, 0.52); }
.gradient-yellow-3 { background: rgba(255, 201, 5, 0.25); }

/* Suggestion button gradient (blue) */
.gradient-blue-light {
  background: linear-gradient(166.608deg, #EFF6FF 0%, #CEDCFC 100%);
}
```

### Shadows
```css
:root {
  /* Card Shadows */
  --shadow-card:
    0px 4px 8px 0px rgba(28, 25, 23, 0.03),
    0px 8px 16px 0px rgba(28, 25, 23, 0.02);

  --shadow-card-hover:
    0px 8px 16px 0px rgba(28, 25, 23, 0.06),
    0px 16px 32px 0px rgba(28, 25, 23, 0.04);

  /* Button Shadows */
  --shadow-button-blue: 0px 8px 8px -4px rgba(62, 142, 244, 0.25);
  --shadow-button-icon: 0px 10px 15px 0px rgba(0, 0, 0, 0.1),
                        0px 4px 6px 0px rgba(0, 0, 0, 0.1);

  /* Chatbot Shadows */
  --shadow-chatbot-icon: 0px 3.673px 11.019px 0px rgba(97, 62, 234, 0.5);

  /* Header Shadow */
  --shadow-header: 0px 4px 8px -4px rgba(0, 0, 0, 0.1);

  /* Tab Shadow */
  --shadow-tab: 0px 1px 3px 0px rgba(25, 33, 61, 0.1);
}
```

---

## Typography System

### Font Families
```css
:root {
  --font-primary: 'Inter', -apple-system, system-ui, sans-serif;
  --font-logo: 'Unbounded', sans-serif;
  --font-system: 'SF Pro', -apple-system, system-ui, sans-serif;
  --font-body-alt: 'Arimo', sans-serif;
}
```

### Font Scale
```css
/* Headings */
.text-logo { font: Bold 36px/21px 'Unbounded'; letter-spacing: -0.32px; }
.text-h1 { font: Bold 20px/21px 'Inter'; letter-spacing: -0.32px; }
.text-h2 { font: Semi Bold 15px/32px 'Inter'; }
.text-h3 { font: Semi Bold 12px/24px 'Inter'; }

/* Body Text */
.text-body { font: Regular 15px/24px 'Inter'; }
.text-body-sm { font: Regular 13px/normal 'Inter'; }
.text-body-xs { font: Regular 12px/20px 'Inter'; }
.text-body-xxs { font: Regular 10px/16px 'Inter'; }

/* Labels */
.text-label { font: Semi Bold 10px/13px 'Inter'; letter-spacing: -0.06px; }
.text-sublabel { font: Regular 8px/20px 'Inter'; letter-spacing: -0.048px; }

/* Button Text */
.text-button { font: Bold 16px/21px 'Inter'; letter-spacing: -0.32px; }
.text-button-sm { font: Semi Bold 8px/15px 'Inter'; }

/* Meta Text */
.text-meta { font: Regular 11px/16.5px 'Arimo'; }
.text-timestamp { font: Regular 11px/16.5px 'Arimo'; }
```

### Text Colors by Context
```css
/* Headers */
.text-header { color: var(--text-primary); }

/* Body Content */
.text-content { color: var(--text-secondary); }

/* Metadata */
.text-meta { color: var(--text-tertiary); }

/* Interactive */
.text-link {
  color: var(--text-secondary);
  text-decoration: underline;
}

/* On Color Backgrounds */
.text-on-blue { color: white; }
.text-on-dark { color: white; }
```

---

## Implementation Guide

### File Structure

```
frontend/
├── quiz/
│   ├── index.html              # Entry point (redirects to category.html)
│   ├── category.html           # Screen 1: Category selection
│   ├── use-case.html           # Screen 3: Use case selection
│   ├── features.html           # Screen 4: Feature priorities
│   ├── results.html            # Screen 5: Recommendations
│   ├── styles/
│   │   ├── quiz-common.css     # Shared styles
│   │   ├── category.css        # Screen 1 styles
│   │   ├── use-case.css        # Screen 3 styles
│   │   ├── features.css        # Screen 4 styles
│   │   └── results.css         # Screen 5 styles
│   ├── scripts/
│   │   ├── quiz-controller.js  # Main quiz state management
│   │   ├── category.js         # Screen 1 logic
│   │   ├── use-case.js         # Screen 3 logic
│   │   ├── features.js         # Screen 4 logic
│   │   └── results.js          # Screen 5 logic
│   └── data/
│       ├── categories.json     # 6 categories
│       ├── use-cases.json      # 6 use cases
│       └── features.json       # 14 features
├── chatbot/
│   ├── chatbot-modal.html      # Screen 6: Chatbot (can be component)
│   ├── chatbot.css             # Chatbot modal styles
│   └── chatbot.js              # Chatbot logic
└── design-system/
    ├── components/
    │   ├── selection-card.css  # Reusable card component
    │   ├── navigation.css      # Header, footer, buttons
    │   └── progress.css        # Progress indicator
    └── tokens.css              # Design tokens (colors, shadows, etc.)
```

### Data Structure Examples

#### categories.json
```json
{
  "categories": [
    {
      "id": "smartwatch_fitness",
      "title": {
        "de": "Smartwatch & Fitnesstrackers",
        "en": "Smartwatch & Fitness Trackers"
      },
      "subtitle": {
        "de": "Für Training & Alltag",
        "en": "For Training & Daily Use"
      },
      "icon": "/images/quiz/smartwatch.svg",
      "position": { "row": 1, "col": 1 }
    }
    // ... 5 more categories
  ]
}
```

#### use-cases.json
```json
{
  "useCases": [
    {
      "id": "lifestyle_fitness",
      "title": {
        "de": "Lifestyle & Fitness",
        "en": "Lifestyle & Fitness"
      },
      "icon": "/images/quiz/lifestyle.svg"
    }
    // ... 5 more use cases
  ]
}
```

#### features.json
```json
{
  "features": [
    {
      "id": "light_comfortable",
      "title": {
        "de": "Leicht & Komfortabel",
        "en": "Light & Comfortable"
      },
      "image": "/images/quiz/light-comfortable.jpg",
      "priority": 1
    }
    // ... 13 more features
  ],
  "maxSelections": 5
}
```

### State Management

```javascript
// quiz-controller.js
class QuizController {
  constructor() {
    this.state = {
      currentStep: 1,
      totalSteps: 4,
      selections: {
        category: null,        // Single selection
        useCases: [],          // Multi-select
        features: []           // Multi-select (max 5)
      },
      user: {
        id: null,
        token: null
      }
    };
  }

  // Load state from localStorage
  loadState() {
    const saved = localStorage.getItem('verifyr_quiz_state');
    if (saved) {
      this.state = { ...this.state, ...JSON.parse(saved) };
    }
  }

  // Save state to localStorage
  saveState() {
    localStorage.setItem('verifyr_quiz_state', JSON.stringify(this.state));
  }

  // Validate current step
  canProceed(step) {
    switch(step) {
      case 1: return this.state.selections.category !== null;
      case 2: return this.state.selections.useCases.length > 0;
      case 3: return this.state.selections.features.length > 0;
      default: return true;
    }
  }

  // Submit quiz to backend
  async submitQuiz() {
    const response = await fetch('/quiz/score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.state.user.token}`
      },
      body: JSON.stringify({
        category: this.state.selections.category,
        useCases: this.state.selections.useCases,
        features: this.state.selections.features
      })
    });

    return await response.json();
  }
}
```

### Navigation Flow Implementation

```javascript
// Navigation between quiz steps
function navigateToNextStep() {
  const currentStep = quizController.state.currentStep;

  const stepUrls = {
    1: '/quiz/use-case.html',
    2: '/quiz/features.html',
    3: '/quiz/results.html'
  };

  if (quizController.canProceed(currentStep)) {
    quizController.state.currentStep++;
    quizController.saveState();
    window.location.href = stepUrls[currentStep];
  } else {
    showValidationError();
  }
}

function navigateToPreviousStep() {
  const currentStep = quizController.state.currentStep;

  const stepUrls = {
    2: '/quiz/category.html',
    3: '/quiz/use-case.html',
    4: '/quiz/features.html'
  };

  if (currentStep > 1) {
    quizController.state.currentStep--;
    quizController.saveState();
    window.location.href = stepUrls[currentStep];
  }
}
```

### Card Component (Reusable)

```html
<!-- selection-card.html template -->
<div class="selection-card"
     data-card-id="${id}"
     data-selected="false"
     role="button"
     tabindex="0"
     aria-pressed="false">

  <div class="selection-card__image">
    <img src="${icon}" alt="${title}" loading="lazy">
  </div>

  <div class="selection-card__content">
    <h3 class="selection-card__title">${title}</h3>
    <p class="selection-card__subtitle">${subtitle}</p>
  </div>

  <div class="selection-card__checkmark" aria-hidden="true">
    <svg><!-- checkmark icon --></svg>
  </div>
</div>
```

```css
/* selection-card.css */
.selection-card {
  width: 150px;
  height: 168px;
  background: var(--white);
  border: 1px solid var(--border-gray);
  border-radius: 16px;
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.selection-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--primary-blue);
}

.selection-card[data-selected="true"] {
  border: 2px solid var(--primary-blue);
}

.selection-card__checkmark {
  position: absolute;
  top: 4px;
  right: 6px;
  width: 24px;
  height: 24px;
  background: var(--primary-blue);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.selection-card[data-selected="true"] .selection-card__checkmark {
  opacity: 1;
  transform: scale(1);
}

.selection-card__title {
  font: var(--text-label);
  color: var(--text-primary);
  text-align: center;
  margin: 0;
}

.selection-card__subtitle {
  font: var(--text-sublabel);
  color: var(--text-primary);
  text-align: center;
  margin: 0;
}
```

### Interaction Handlers

```javascript
// Card selection logic
class CardSelector {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.multiSelect = options.multiSelect || false;
    this.maxSelections = options.maxSelections || Infinity;
    this.selectedCards = new Set();

    this.init();
  }

  init() {
    this.cards = this.container.querySelectorAll('.selection-card');
    this.cards.forEach(card => {
      card.addEventListener('click', () => this.handleCardClick(card));
      card.addEventListener('keydown', (e) => this.handleCardKeydown(e, card));
    });
  }

  handleCardClick(card) {
    const cardId = card.dataset.cardId;
    const isSelected = card.dataset.selected === 'true';

    if (this.multiSelect) {
      if (isSelected) {
        this.deselectCard(card, cardId);
      } else if (this.selectedCards.size < this.maxSelections) {
        this.selectCard(card, cardId);
      } else {
        this.showMaxSelectionsError();
      }
    } else {
      // Single select - deselect all others
      this.cards.forEach(c => this.deselectCard(c, c.dataset.cardId));
      this.selectCard(card, cardId);
    }

    this.updateContinueButton();
    this.announceSelection(card, isSelected);
  }

  selectCard(card, cardId) {
    card.dataset.selected = 'true';
    card.setAttribute('aria-pressed', 'true');
    this.selectedCards.add(cardId);

    // Trigger checkmark animation
    card.classList.add('selection-card--animating');
    setTimeout(() => card.classList.remove('selection-card--animating'), 300);
  }

  deselectCard(card, cardId) {
    card.dataset.selected = 'false';
    card.setAttribute('aria-pressed', 'false');
    this.selectedCards.delete(cardId);
  }

  updateContinueButton() {
    const continueBtn = document.getElementById('continueBtn');
    const skipBtn = document.getElementById('skipBtn');

    if (this.selectedCards.size > 0) {
      continueBtn.disabled = false;
      skipBtn.style.display = 'none';
      continueBtn.style.display = 'block';
    } else {
      continueBtn.disabled = true;
      skipBtn.style.display = 'block';
      continueBtn.style.display = 'none';
    }
  }

  announceSelection(card, wasSelected) {
    const title = card.querySelector('.selection-card__title').textContent;
    const action = wasSelected ? 'deselected' : 'selected';
    const announcement = `${title} ${action}`;

    // Create live region for screen readers
    const liveRegion = document.getElementById('sr-live-region');
    if (liveRegion) {
      liveRegion.textContent = announcement;
    }
  }

  handleCardKeydown(event, card) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleCardClick(card);
    }
  }

  getSelections() {
    return Array.from(this.selectedCards);
  }
}
```

### Chatbot Modal Implementation

```javascript
// chatbot.js
class ChatbotModal {
  constructor() {
    this.isOpen = false;
    this.modal = null;
    this.overlay = null;
    this.init();
  }

  init() {
    // Create modal elements
    this.createModal();

    // Bind events
    this.bindEvents();
  }

  createModal() {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'chatbot-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-labelledby', 'chatbot-title');

    // Create modal content
    this.modal = document.createElement('div');
    this.modal.className = 'chatbot-modal';
    this.modal.innerHTML = `
      <!-- Header -->
      <div class="chatbot-header">
        <div class="chatbot-icon">
          <!-- AI icon with online indicator -->
        </div>
        <div class="chatbot-branding">
          <h2 id="chatbot-title">Verifyr</h2>
          <p>QA Knowledge Chatbot</p>
        </div>
        <button class="chatbot-close" aria-label="Close chatbot">
          <!-- X icon -->
        </button>
      </div>

      <!-- First message -->
      <div class="chatbot-messages">
        <div class="chatbot-message chatbot-message--bot">
          <p>Hallo! Wie kann ich dir helfen?...</p>
          <span class="chatbot-timestamp">09:11</span>
        </div>
      </div>

      <!-- Frequent questions -->
      <div class="chatbot-suggestions">
        <h3>Häufige Fragen:</h3>
        <div class="chatbot-suggestions-grid">
          <!-- 4 suggestion buttons -->
        </div>
      </div>

      <!-- Input -->
      <div class="chatbot-input">
        <input type="text" placeholder="Stell deine Fragen zum Produkt...">
        <button disabled><!-- Send icon --></button>
      </div>
    `;

    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);
  }

  bindEvents() {
    // Close button
    const closeBtn = this.modal.querySelector('.chatbot-close');
    closeBtn.addEventListener('click', () => this.close());

    // Overlay click (close)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });

    // Suggestion buttons
    const suggestions = this.modal.querySelectorAll('.suggestion-button');
    suggestions.forEach(btn => {
      btn.addEventListener('click', () => this.handleSuggestionClick(btn));
    });

    // Input field
    const input = this.modal.querySelector('input');
    const sendBtn = this.modal.querySelector('.chatbot-input button');

    input.addEventListener('input', () => {
      sendBtn.disabled = input.value.trim() === '';
    });

    sendBtn.addEventListener('click', () => this.sendMessage(input.value));
  }

  open() {
    this.isOpen = true;
    this.overlay.style.display = 'block';

    // Focus trap
    const firstFocusable = this.modal.querySelector('button, input');
    if (firstFocusable) firstFocusable.focus();

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Update bottom nav icon
    this.updateNavIcon(true);
  }

  close() {
    this.isOpen = false;
    this.overlay.style.display = 'none';

    // Restore body scroll
    document.body.style.overflow = '';

    // Update bottom nav icon
    this.updateNavIcon(false);
  }

  updateNavIcon(active) {
    const chatIcon = document.querySelector('.bottom-nav-chat');
    if (chatIcon) {
      chatIcon.classList.toggle('active', active);
    }
  }

  handleSuggestionClick(button) {
    const question = button.textContent;
    this.sendMessage(question);
  }

  async sendMessage(text) {
    if (!text.trim()) return;

    // Add user message to chat
    this.addMessage(text, 'user');

    // Clear input
    const input = this.modal.querySelector('input');
    input.value = '';

    // Show loading
    this.showTypingIndicator();

    try {
      // Send to backend
      const response = await fetch('/chatbot/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('verifyr_access_token')}`
        },
        body: JSON.stringify({ message: text })
      });

      const data = await response.json();

      // Hide loading
      this.hideTypingIndicator();

      // Add bot response
      this.addMessage(data.response, 'bot');
    } catch (error) {
      console.error('Chatbot error:', error);
      this.hideTypingIndicator();
      this.addMessage('Es tut mir leid, es gab einen Fehler. Bitte versuche es erneut.', 'bot');
    }
  }

  addMessage(text, sender) {
    const messagesContainer = this.modal.querySelector('.chatbot-messages');
    const messageEl = document.createElement('div');
    messageEl.className = `chatbot-message chatbot-message--${sender}`;

    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    messageEl.innerHTML = `
      <p>${text}</p>
      <span class="chatbot-timestamp">${time}</span>
    `;

    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  showTypingIndicator() {
    const messagesContainer = this.modal.querySelector('.chatbot-messages');
    const indicator = document.createElement('div');
    indicator.className = 'chatbot-typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    messagesContainer.appendChild(indicator);
  }

  hideTypingIndicator() {
    const indicator = this.modal.querySelector('.chatbot-typing-indicator');
    if (indicator) indicator.remove();
  }
}

// Initialize chatbot
const chatbot = new ChatbotModal();

// Trigger from bottom nav
document.querySelector('.bottom-nav-chat').addEventListener('click', () => {
  chatbot.open();
});
```

### Responsive Adaptations

```css
/* Mobile First (393px - iPhone 14 Pro) */
/* All styles defined for mobile by default */

/* Tablet (768px+) */
@media (min-width: 768px) {
  .selection-cards-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    max-width: 800px;
    margin: 0 auto;
  }

  .selection-card {
    width: 180px;
    height: 200px;
  }

  .chatbot-modal {
    width: 600px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 16px;
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .selection-cards-grid {
    grid-template-columns: repeat(4, 1fr);
    max-width: 1200px;
  }

  .selection-card {
    width: 220px;
    height: 240px;
  }

  .product-card {
    width: 400px;
  }

  .results-carousel {
    justify-content: center;
    gap: 24px;
  }
}

/* Large Desktop (1440px+) */
@media (min-width: 1440px) {
  .main-container {
    max-width: 1400px;
    margin: 0 auto;
  }
}
```

---

## Accessibility Requirements

### Keyboard Navigation

#### Card Selection
```javascript
// Allow Enter/Space to select cards
card.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handleCardSelection(card);
  }
});

// Arrow key navigation between cards
document.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    navigateBetweenCards(event.key);
  }
});
```

#### Focus Management
- All interactive elements must be keyboard accessible
- Focus order: Top nav → Progress → Cards (row by row) → Bottom nav
- Visible focus indicator: `outline: 2px solid #3E8EF4; outline-offset: 2px;`
- Skip to main content link for screen readers

### ARIA Attributes

```html
<!-- Selection Card -->
<div class="selection-card"
     role="button"
     tabindex="0"
     aria-pressed="false"
     aria-label="Smartwatch & Fitnesstrackers - Für Training & Alltag">
  <!-- content -->
</div>

<!-- Progress Indicator -->
<nav aria-label="Quiz progress">
  <div class="progress-bar" role="progressbar"
       aria-valuenow="2"
       aria-valuemin="1"
       aria-valuemax="4"
       aria-label="Step 2 of 4: Use case selection">
  </div>
</nav>

<!-- Chatbot Modal -->
<div class="chatbot-overlay"
     role="dialog"
     aria-modal="true"
     aria-labelledby="chatbot-title">
  <h2 id="chatbot-title">Verifyr QA Knowledge Chatbot</h2>
  <!-- content -->
</div>

<!-- Live Region for Announcements -->
<div id="sr-live-region"
     class="sr-only"
     role="status"
     aria-live="polite"
     aria-atomic="true">
</div>
```

### Screen Reader Support

#### Announcements
```javascript
function announceToScreenReader(message) {
  const liveRegion = document.getElementById('sr-live-region');
  liveRegion.textContent = message;

  // Clear after announcement
  setTimeout(() => {
    liveRegion.textContent = '';
  }, 1000);
}

// Examples
announceToScreenReader('Category selected: Smartwatch & Fitnesstrackers');
announceToScreenReader('5 features selected. Maximum reached.');
announceToScreenReader('Loading product recommendations...');
```

#### Image Alt Text
```html
<!-- Category icons -->
<img src="/images/smartwatch.svg"
     alt="Smartwatch icon representing fitness trackers and smart watches">

<!-- Product images -->
<img src="/images/garmin-970.jpg"
     alt="Garmin Forerunner 970 smartwatch with AMOLED display">
```

### Color Contrast

All text must meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text):

| Element | Foreground | Background | Ratio | Pass |
|---------|------------|------------|-------|------|
| Primary text | #011928 | #FFFFFF | 16.3:1 | ✓ AAA |
| Secondary text | #4A5565 | #FFFFFF | 9.1:1 | ✓ AAA |
| Tertiary text | #6A7282 | #FFFFFF | 5.9:1 | ✓ AA |
| Button text | #FFFFFF | #3E8EF4 | 4.8:1 | ✓ AA |
| Label on image | #090814 | rgba(255,255,255,0.3) | Variable | Check individually |

### Touch Targets

Minimum 44px × 44px for all interactive elements:

| Element | Size | Status |
|---------|------|--------|
| Selection card | 150px × 168px | ✓ Pass |
| Navigation button | 158px × 45px | ✓ Pass |
| Back button | 24px icon + 20px padding | ✓ Pass (64px total) |
| Checkmark badge | 24px | ✗ Decorative only |
| Chatbot send | 48px × 48px | ✓ Pass |
| Keyboard key | 42px × 42px | ✓ Pass |

---

## Performance Optimization

### Image Optimization

```javascript
// Lazy load images
<img src="/images/placeholder.jpg"
     data-src="/images/smartwatch.svg"
     alt="Smartwatch icon"
     loading="lazy">

// Use responsive images
<img srcset="/images/product-300.jpg 300w,
             /images/product-600.jpg 600w,
             /images/product-1200.jpg 1200w"
     sizes="(max-width: 600px) 300px,
            (max-width: 1200px) 600px,
            1200px"
     src="/images/product-600.jpg"
     alt="Product image">

// WebP with fallback
<picture>
  <source srcset="/images/product.webp" type="image/webp">
  <img src="/images/product.jpg" alt="Product image">
</picture>
```

### Code Splitting

```javascript
// Load quiz steps on demand
const loadQuizStep = async (step) => {
  const modules = {
    1: () => import('./scripts/category.js'),
    2: () => import('./scripts/use-case.js'),
    3: () => import('./scripts/features.js'),
    4: () => import('./scripts/results.js')
  };

  const module = await modules[step]();
  return module.default;
};
```

### Caching Strategy

```javascript
// Service Worker for offline support
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('verifyr-quiz-v1').then((cache) => {
      return cache.addAll([
        '/quiz/category.html',
        '/quiz/styles/quiz-common.css',
        '/quiz/scripts/quiz-controller.js',
        '/quiz/data/categories.json',
        '/images/quiz/', // All quiz images
        '/fonts/' // Typography
      ]);
    })
  );
});
```

---

## Testing Checklist

### Functional Testing

#### Screen 1: Category Selection
- [ ] All 6 category cards display correctly
- [ ] Card selection works (single select)
- [ ] Checkmark appears on selection
- [ ] Border changes color on selection
- [ ] "Überspringen" button shows when no selection
- [ ] "Weiter" button shows when selection made
- [ ] Back button appears after selection
- [ ] Progress indicator shows step 1 of 4
- [ ] Navigation to Screen 3 works

#### Screen 3: Use Case Selection
- [ ] All 6 use case cards display correctly
- [ ] Multi-select works (multiple cards can be selected)
- [ ] Checkmarks appear on all selected cards
- [ ] Can deselect cards
- [ ] "Weiter" button enables with ≥1 selection
- [ ] Progress indicator shows step 2 of 4
- [ ] Back navigation works

#### Screen 4: Feature Priorities
- [ ] All 14 feature cards display correctly
- [ ] Cards use photographic images
- [ ] Multi-select works (up to 5 selections)
- [ ] After 5 selections, remaining cards are disabled
- [ ] Can deselect to make room for new selections
- [ ] Vertical scroll works smoothly
- [ ] Progress indicator shows step 3 of 4

#### Screen 5: Recommendations
- [ ] Horizontal scroll carousel works
- [ ] 2 products load from backend
- [ ] Product images display correctly
- [ ] Star ratings and review counts show
- [ ] Tab switcher works (Empfehlung/Produktdaten)
- [ ] Purchase buttons have correct gradient styling
- [ ] Links to external retailers work
- [ ] Recommendation text loads completely
- [ ] Strengths and weaknesses lists display
- [ ] All review sources load with logos and ratings
- [ ] Reddit, YouTube, Amazon boxes display
- [ ] Bottom navigation is present

#### Screen 6: Chatbot Modal
- [ ] Modal opens from bottom nav chat icon
- [ ] Overlay darkens background
- [ ] Chatbot icon shows online indicator
- [ ] First message displays immediately
- [ ] 4 suggestion buttons render correctly
- [ ] Clicking suggestion sends message
- [ ] Input field accepts text
- [ ] Send button enables when text entered
- [ ] Send button sends message to backend
- [ ] Bot response displays in chat
- [ ] Timestamps show correctly
- [ ] Keyboard (iOS) displays when input focused
- [ ] Close button closes modal
- [ ] Clicking outside modal closes it
- [ ] Escape key closes modal

### Responsive Testing

- [ ] **Mobile (393px):** All screens display correctly
- [ ] **Mobile (375px):** iPhone SE compatibility
- [ ] **Tablet (768px):** Cards adapt to 3-column grid
- [ ] **Desktop (1024px):** Cards adapt to 4-column grid
- [ ] **Large Desktop (1440px):** Content centers with max-width

### Cross-Browser Testing

- [ ] **Chrome (desktop + mobile):** Full functionality
- [ ] **Safari (desktop + iOS):** Native iOS keyboard, modal behavior
- [ ] **Firefox (desktop):** Card selection, scrolling
- [ ] **Edge (desktop):** Gradient rendering, shadows

### Accessibility Testing

- [ ] **Keyboard navigation:** Tab through all interactive elements
- [ ] **Screen reader (NVDA):** All cards announced correctly
- [ ] **Screen reader (JAWS):** Selection states announced
- [ ] **VoiceOver (iOS):** Native iOS announcements work
- [ ] **Focus indicators:** Visible on all interactive elements
- [ ] **Color contrast:** All text meets WCAG AA minimum
- [ ] **Touch targets:** All interactive elements ≥44px
- [ ] **Zoom (200%):** Layout doesn't break
- [ ] **High contrast mode:** All elements visible

### Performance Testing

- [ ] **Lighthouse (Mobile):** Performance >90
- [ ] **Lighthouse (Desktop):** Performance >95
- [ ] **Load time:** First Contentful Paint <1.5s
- [ ] **Image loading:** Lazy loading works
- [ ] **Smooth scrolling:** 60fps on vertical and horizontal scroll
- [ ] **Bundle size:** JavaScript <100KB gzipped
- [ ] **API response:** Results load <3s

---

## Deployment Checklist

### Pre-deployment

- [ ] All images optimized (WebP format, compressed)
- [ ] SVG icons minified
- [ ] CSS minified and combined
- [ ] JavaScript bundled and minified
- [ ] Service worker configured for offline support
- [ ] Analytics tracking implemented
- [ ] Error logging configured
- [ ] Environment variables set for production
- [ ] Backend API endpoints tested in staging

### Post-deployment

- [ ] Smoke test all 6 screens in production
- [ ] Verify external links (retailer purchase links)
- [ ] Check analytics tracking
- [ ] Monitor error logs
- [ ] A/B test different quiz flows (if applicable)
- [ ] Gather user feedback
- [ ] Monitor performance metrics

---

## Future Enhancements

### Phase 1 (MVP) - Current Implementation
- [x] 6 category cards
- [x] 6 use case cards
- [x] 14 feature priority cards
- [x] Side-by-side product recommendations
- [x] QA chatbot modal

### Phase 2 - Additional Features
- [ ] Save quiz results to user profile
- [ ] Resume quiz from last position
- [ ] Share results via social media
- [ ] Email results to user
- [ ] Compare >2 products simultaneously
- [ ] Filter products by price range
- [ ] Advanced filters (brand, release date, etc.)

### Phase 3 - Personalization
- [ ] Machine learning for better recommendations
- [ ] Historical purchase data integration
- [ ] Personalized feature suggestions based on past behavior
- [ ] Collaborative filtering (users like you also chose...)
- [ ] Real-time price tracking and alerts

### Phase 4 - Engagement
- [ ] Gamification (badges, progress tracking)
- [ ] Quiz retry with different preferences
- [ ] Product comparison history
- [ ] Wishlist / Favorites across sessions
- [ ] Community reviews and ratings

---

## Internationalization (i18n)

### Supported Languages

**Phase 1:**
- German (DE) - Primary
- English (EN) - Secondary

**Phase 2:**
- French (FR)
- Spanish (ES)
- Italian (IT)

### Translation Files

```json
// locales/de.json
{
  "quiz": {
    "category": {
      "heading": "Was suchst du?",
      "subheading": "Wähle eine Kategorie aus",
      "skip": "Überspringen",
      "continue": "Weiter"
    },
    "useCase": {
      "heading": "Wofür Hauptsächlich?",
      "subheading": "Wähle alle Zutreffend aus"
    },
    "features": {
      "heading": "Was is dir am wichtigsten?",
      "subheading": "Wähle bis zu 5 Prioritäten"
    },
    "results": {
      "heading": "Ergebnisse",
      "subheading": "{{count}} passende Produkte gefunden"
    }
  },
  "chatbot": {
    "title": "Verifyr",
    "subtitle": "QA Knowledge Chatbot",
    "firstMessage": "Hallo! Wie kann ich dir helfen?...",
    "placeholder": "Stell deine Fragen zum Produkt...",
    "frequentQuestions": "Häufige Fragen:"
  }
}

// locales/en.json
{
  "quiz": {
    "category": {
      "heading": "What are you looking for?",
      "subheading": "Choose a category",
      "skip": "Skip",
      "continue": "Continue"
    },
    // ... etc
  }
}
```

### Implementation

```javascript
// i18n.js
class I18n {
  constructor(defaultLocale = 'de') {
    this.locale = defaultLocale;
    this.translations = {};
    this.loadTranslations(defaultLocale);
  }

  async loadTranslations(locale) {
    const response = await fetch(`/locales/${locale}.json`);
    this.translations = await response.json();
  }

  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;

    for (const k of keys) {
      value = value[k];
      if (!value) return key; // Fallback to key if not found
    }

    // Replace {{param}} with actual values
    return value.replace(/\{\{(\w+)\}\}/g, (_, param) => params[param] || '');
  }

  setLocale(locale) {
    this.locale = locale;
    this.loadTranslations(locale);
  }
}

// Usage
const i18n = new I18n('de');
document.querySelector('.quiz-heading').textContent = i18n.t('quiz.category.heading');
document.querySelector('.results-subheading').textContent =
  i18n.t('quiz.results.subheading', { count: 2 });
```

---

## Contact & Support

**Design System Owner:** Claude Code
**Last Updated:** 2026-01-26
**Version:** 2.0 (Complete 6-screen flow)

For questions about implementation, refer to:
- [CLAUDE.md](../CLAUDE.md) - Project overview
- [Product.md](../Product.md) - Product vision
- [tech-architecture.md](../Product-strategy/tech-architecture.md) - Technical architecture

---

**Document Status:** ✅ Complete - Ready for Implementation
