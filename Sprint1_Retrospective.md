# Sprint 1 Retrospective - Verifyr QA Chatbot MVP

**Date:** 2026-01-10
**Participants:** PM, Developer, UX Designer
**Sprint Goal:** Complete 8 acceptance criteria for QA Chatbot MVP (character limit, source display, timeout, modal conversion)

---

## 1. Tune-in (10 min) - Mood Check

**PM:** 😐 6/10 - Satisfied with feature completion, frustrated with rework cycles
**Developer:** 😟 5/10 - Stressed by design changes mid-sprint, proud of technical delivery
**UX Designer:** 😔 5/10 - Concerned designs weren't implemented as intended, felt excluded from dev discussions

---

## 2. Review Previous Actions

**No previous retrospective actions** (First sprint retro)

---

## 3. Start Stop Continue (35 min)

### 🟢 START

**PM:**
- Daily design-dev sync for in-progress features (5 min standup after sprint standup)
- Design review checklist before moving tickets to "Ready for Dev"
- Include UX in PR reviews for UI changes

**Developer:**
- Ask clarifying questions in Figma comments before implementation
- Share WIP screenshots in Slack before marking tickets complete
- Request design walkthroughs for complex UI changes (modal, responsive layouts)

**UX Designer:**
- Annotate Figma designs with exact spacing, states, edge cases
- Create design handoff documents with interaction specs (hover, loading, error states)
- Join daily standups (currently missing, only in planning)

### 🔴 STOP

**PM:**
- Accepting designs without developer review before sprint commitment
- Moving tickets to sprint without design-dev alignment meeting
- Assuming "design is done" means "dev-ready"

**Developer:**
- Implementing based on visual inspection only (ignoring interaction specs)
- Making design decisions independently (button placement, modal behavior)
- Waiting until PR stage to flag design issues

**UX Designer:**
- Delivering designs without dev feasibility check
- Using vague labels like "responsive spacing" without pixel values
- Assuming developers understand design system conventions without documentation

### 🔵 CONTINUE

**PM:**
- Sprint planning with all three roles present
- Weekly backlog grooming
- Celebrating completed acceptance criteria

**Developer:**
- Using design system components from `frontend/design-system/`
- Manual testing across DE/EN languages
- Documenting technical decisions in code comments

**UX Designer:**
- Maintaining design system consistency
- Providing desktop + mobile mockups
- Iterating based on user feedback

---

## 4. New Actions (15 min)

| Action | Owner | Deadline | Success Metric |
|--------|-------|----------|----------------|
| Create design handoff template (spacing, states, breakpoints, interactions) | UX | Before Sprint 2 | Template used for all Sprint 2 tickets |
| Implement design review gate: Dev must comment "LGTM" in Figma before ticket → Ready | PM | Immediate | 0 design rework PRs in Sprint 2 |
| Schedule daily 5-min design-dev sync (9:05 AM after standup) | PM | Immediate | 5 syncs/week attendance |
| Add UX as required reviewer for all `/chat.html` and `/index.html` PRs | Dev | Immediate | 100% UX approval before merge |
| Document design system usage examples in `frontend/design-system/README.md` | UX | Week 1 Sprint 2 | Dev references doc in ≥2 PRs |
| Create Figma→Code checklist for Dev (hover states, loading, 500-char counter behavior, modal close) | Dev + UX | Before Sprint 2 | Checklist used for all UI tickets |

---

## 5. Tune-out (10 min)

**What went well despite challenges:**
- ✅ All 8 acceptance criteria completed technically
- ✅ No critical bugs blocking release
- ✅ Team stayed committed to sprint goal

**Key insight:**
*"Design and development are not sequential handoffs - they're continuous collaboration."*

**Commitment for Sprint 2:**
- Daily touchpoints between UX and Dev
- No assumptions - ask questions early
- Design specs = source of truth, not interpretation

**Mood forecast for Sprint 2:**
**PM:** 8/10 (optimistic with new sync cadence)
**Developer:** 7/10 (clear handoff process reduces ambiguity)
**UX Designer:** 8/10 (empowered to guide implementation)

---

**Next Retrospective:** End of Sprint 2
**Action Review Owner:** PM (will check action completion in Sprint 2 planning)
