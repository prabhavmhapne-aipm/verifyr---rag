# Sprint 2 Improvement Plan

**Created:** 2026-01-10
**Based on:** Sprint 1 Retrospective & Backlog Analysis
**Focus:** Process, Communication, and Acceptance Criteria Quality

---

## 1. Executive Summary

### Sprint 1 Status
**Target:** Complete 8 acceptance criteria from user stories 2.1.1, 2.1.3, 2.1.4, 2.1.5

**Actual Completion:** ⚠️ Discrepancy Found
- Retrospective claims: "All 8 AC completed technically"
- Backlog shows: 8 AC still marked ❌
- **Root Cause:** Documentation not updated OR features don't meet AC quality standards

### Key Wins
- ✅ No critical bugs blocking release
- ✅ Team commitment to sprint goal
- ✅ DE/EN language support working
- ✅ Design system components used consistently

### Key Challenges
- ❌ Design-dev miscommunication → rework cycles
- ❌ Low team morale (5-6/10 average)
- ❌ Implementations didn't match design intent
- ❌ Backlog hygiene (not updated post-sprint)

### Sprint 2 Focus Areas
1. Design-dev collaboration (daily sync implemented)
2. Acceptance criteria quality (new template)
3. Documentation discipline (backlog = source of truth)

---

## 2. Retrospective Insights

### What Worked Well ✅
- Sprint planning with PM, Dev, UX all present
- Using `frontend/design-system/` components
- Manual testing across both languages (DE/EN)
- Weekly backlog grooming sessions
- Celebrating completed acceptance criteria
- Technical delivery (no P0/P1 bugs)

### What Didn't Work ❌
- Designs delivered without dev feasibility check
- Developer implementing from visual inspection only
- Vague design specs ("responsive spacing")
- UX not joining daily standups (only planning)
- Design decisions made independently by Dev
- Waiting until PR stage to flag design issues
- Accepting designs as "dev-ready" without review

### Root Causes Identified
1. **Sequential handoff mentality** - Design → Dev treated as one-way handoff, not collaboration
2. **Assumption gaps** - UX assumed design system understood, Dev assumed visual = complete spec
3. **Missing feedback loops** - No UX in PRs, no Dev in design reviews, no daily alignment
4. **Incomplete specifications** - Hover states, loading states, edge cases not documented

---

## 3. Acceptance Criteria Analysis

### Sprint 1 Target: 8 Acceptance Criteria

#### 2.1.5: Character Limit (2 ACs)
- ❌ Maximum 500 characters enforcement
- ❌ Character counter display (marked "optional")

#### 2.1.3: Source Display (1 AC)
- ❌ Max 3 sources displayed

#### 2.1.4: Timeout & Conciseness (2 ACs)
- ❌ 2-4 sentence length (marked "[Not enforced]")
- ❌ 60-second timeout (marked "[No timeout enforcement]")

#### 2.1.1: Modal Conversion (3 ACs)
- ❌ Chat icon in bottom navigation
- ❌ Icon available across all screens
- ❌ "X" close button top right

### Gap Analysis: "Technically Complete" vs "AC Satisfied"

**Possible Scenarios:**
1. Features were built but don't meet quality bar (e.g., counter exists but wrong placement)
2. Features work in isolation but fail integration tests
3. ACs were misunderstood during implementation
4. Backlog simply not updated (documentation debt)

**Action Required:** Audit actual implementation against each AC before Sprint 2 planning

---

## 4. Acceptance Criteria Quality Issues

### Critical Problems in Current ACs

#### Problem 1: Vague/Unmeasurable Criteria
**Example:**
- "Bot-Antworten sind in einfacher Sprache (kein Tech-Jargon)"

**Issues:**
- No definition of "simple language"
- No test method specified
- Subjective evaluation

**Better Approach:**
- Define tech jargon list to avoid
- Specify max Flesch Reading Ease score
- Include example good/bad answers

#### Problem 2: Optional Items in Acceptance Criteria
**Example:**
- "Zeichenzähler wird angezeigt (optional)"

**Issues:**
- If optional, it's not an acceptance criterion
- Creates ambiguity in Definition of Done

**Better Approach:**
- Move optional features to "Nice to Have" section
- Only include required criteria in AC list

#### Problem 3: No Testing Method Specified
**Example:**
- "Antwort erscheint innerhalb von max. 60 Sekunden"

**Issues:**
- How to test? Manual observation? Automated?
- What happens on timeout? Error message? Silent fail?
- No edge case handling

**Better Approach:**
- Specify: "Manual test: Query with 5 complex products, measure with browser DevTools Network tab"
- Define timeout error state: "Error message: 'Request timed out. Please try again.'"

#### Problem 4: Backend/Frontend Ownership Unclear
**Example:**
- "Bot-Antworten sind in einfacher Sprache [Backend prompt enforcement]"

**Issues:**
- Frontend story contains backend AC
- Unclear which team owns this

**Better Approach:**
- Separate stories for frontend UI vs backend logic
- Or clearly mark: "[Backend] Prompt includes instruction: 'Use simple language, avoid terms like HRV, VO2 max...'"

#### Problem 5: Missing Visual/Interaction Specs
**Example:**
- "Character counter displayed"

**Issues:**
- Where? Below input? Next to send button?
- What format? "450/500" or "50 remaining"?
- What color at limits? Red at 500? Yellow at 450?

**Better Approach:**
- Include Figma link or mockup reference
- Specify: "Format: '0/500' in gray, turns red at 500, positioned bottom-right of input field"

#### Problem 6: No Edge Cases Documented
**Example:**
- "Maximum 500 characters"

**Issues:**
- What happens at exactly 500? Blocked or allowed?
- Can user paste 600 chars? Truncated or rejected?
- What about emojis (multi-byte chars)?

**Better Approach:**
- "Input blocked at 500 chars (inclusive)"
- "Paste truncated to 500 chars"
- "Character count based on string length (emojis = 1 char)"

---

## 5. Sprint 2 Improvements

### Process Improvements (from Retrospective)
- ✅ Daily 5-min design-dev sync (9:05 AM)
- ✅ Design review gate: Dev "LGTM" in Figma before Ready
- ✅ UX joins daily standups
- ✅ UX required reviewer for all `/chat.html` and `/index.html` PRs
- ✅ Design handoff template (spacing, states, breakpoints, interactions)
- ✅ Figma→Code checklist (hover, loading, edge cases)

### AC Definition Improvements (NEW)
- ✅ Use INVEST criteria for all new ACs
- ✅ Require test method for every AC
- ✅ Require edge case documentation
- ✅ Require visual specs for UI ACs (Figma link + text description)
- ✅ Mark ownership explicitly ([Frontend], [Backend], [UX])
- ✅ Remove "optional" items from AC list
- ✅ Use Given-When-Then format for complex interactions

### Documentation Improvements (NEW)
- ✅ Update backlog status within 24h of PR merge
- ✅ Add "Implementation Notes" section to track deviations
- ✅ Link PRs to user stories in backlog
- ✅ Add "Testing Evidence" (screenshots, test results)

### Communication Improvements (NEW)
- ✅ WIP screenshots in Slack before marking tickets complete
- ✅ Clarifying questions in Figma comments BEFORE coding
- ✅ Design walkthroughs for complex UI (modal, responsive)
- ✅ No assumptions - ask questions early

---

## 6. Acceptance Criteria Template (INVEST Framework)

### Template Format

```markdown
#### AC-[ID]: [Short Description]

**User Goal:** [Why does this matter to the user?]

**Given-When-Then:**
- Given: [Context/Precondition]
- When: [Action/Trigger]
- Then: [Expected Outcome]

**Visual Specs:** [For UI ACs only]
- Figma: [Link]
- Position: [Where on screen]
- Format: [Layout, color, size]
- States: [Default, hover, active, disabled, error]

**Edge Cases:**
- [Edge case 1]: [Expected behavior]
- [Edge case 2]: [Expected behavior]

**Test Method:**
- [How to verify this AC - manual steps or automated test]

**Ownership:** [Frontend | Backend | UX | All]

**Acceptance Threshold:** [Quantitative measure if applicable]
```

### Example: Character Counter (Improved)

```markdown
#### AC-2.1.5-A: Display Real-time Character Counter

**User Goal:** Know how many characters I've used so I don't get blocked

**Given-When-Then:**
- Given: User is typing in chat input field
- When: User types or deletes characters
- Then: Character counter updates in real-time showing "X/500"

**Visual Specs:**
- Figma: [Link to design]
- Position: Bottom-right of input field, 8px padding
- Format: "0/500" in gray (#6B7280)
- States:
  - Default (0-450 chars): Gray text
  - Warning (451-499 chars): Orange text (#F59E0B)
  - Limit (500 chars): Red text (#EF4444)

**Edge Cases:**
- Paste >500 chars: Truncate to 500, counter shows "500/500" in red
- Emoji input: Count as 1 character (use string.length)
- Empty input: Show "0/500"
- Exactly 500 chars: Show red "500/500", disable send until <500

**Test Method:**
1. Type 490 chars → verify gray "490/500"
2. Type 10 more → verify orange "500/500"
3. Paste 600-char text → verify truncated to 500, red counter
4. Delete 1 char → verify orange "499/500"
5. Test emoji (😀) → verify counted as 1 char

**Ownership:** Frontend

**Acceptance Threshold:** 100% of test cases pass
```

---

## 7. Action Items for Sprint 2

### Pre-Sprint 2 Planning (Before Sprint Starts)

| Action | Owner | Deadline | Success Metric |
|--------|-------|----------|----------------|
| Audit Sprint 1 implementation vs backlog ACs | Dev | Day 1 | Document shows actual status of 8 ACs |
| Update backlog with actual Sprint 1 completion status | PM | Day 1 | All ❌/✅ accurate |
| Create design handoff template | UX | Day 2 | Template ready for Sprint 2 tickets |
| Document design system examples in README | UX | Day 3 | README has 5+ component usage examples |
| Create Figma→Code checklist | Dev + UX | Day 3 | Checklist available in project wiki |
| Review all Sprint 2 candidate stories for AC quality | PM | Day 4 | All ACs use new template |

### During Sprint 2

| Action | Owner | Ongoing | Success Metric |
|--------|-------|---------|----------------|
| Daily design-dev sync (9:05 AM) | All | Daily | 5 syncs/week, 100% attendance |
| Update backlog within 24h of PR merge | Dev | Per PR | 100% backlog accuracy |
| Share WIP screenshots before ticket completion | Dev | Per ticket | 0 design rework PRs |
| UX review all chat UI PRs | UX | Per PR | 100% UX approval before merge |
| Ask Figma questions before implementation | Dev | Per ticket | Questions asked in 100% of UI tickets |

### Sprint 2 Retrospective

| Action | Owner | End of Sprint | Success Metric |
|--------|-------|---------------|----------------|
| Review retro action completion | PM | Retro meeting | All actions checked |
| Measure mood improvement | All | Retro meeting | Average >7/10 |
| Review AC template effectiveness | PM | Retro meeting | Team votes to continue/adjust |

---

## 8. Success Metrics for Sprint 2

### Process Metrics
- **Design Rework PRs:** 0 (Target from retro)
- **Daily Sync Attendance:** 100% (5/5 days)
- **Backlog Accuracy:** 100% (updated within 24h)
- **Team Morale:** Average 7+/10 (vs Sprint 1's 5-6/10)

### AC Quality Metrics
- **ACs Using New Template:** 100%
- **ACs with Test Methods:** 100%
- **ACs with Edge Cases:** 100%
- **UI ACs with Visual Specs:** 100%

### Delivery Metrics
- **Acceptance Criteria Completion:** 100% (actual, not claimed)
- **Documentation Debt:** 0 (backlog matches reality)
- **Critical Bugs:** 0

---

## 9. Lessons Learned for Future Sprints

### Design-Dev Collaboration
- Design and development are continuous collaboration, not sequential handoffs
- Specifications must include states, edge cases, and interaction details
- Visual mockups alone are insufficient - need text specs too

### Acceptance Criteria
- INVEST framework prevents ambiguous ACs
- "Optional" has no place in acceptance criteria
- Every AC needs a test method
- Backend/Frontend ownership must be explicit

### Documentation
- Backlog is source of truth - update immediately
- "Technically complete" ≠ "AC satisfied"
- Documentation debt compounds - address within 24h

### Team Health
- Low morale (5-6/10) signals process problems
- Communication gaps create stress and rework
- Daily touchpoints prevent misalignment

---

**Prepared by:** Product Team
**Next Review:** End of Sprint 2 Retrospective
**Related Documents:**
- `Sprint1_Retrospective.md`
- `Sprint 1.md`
- `QA-Chatbot-Backlog.md`
