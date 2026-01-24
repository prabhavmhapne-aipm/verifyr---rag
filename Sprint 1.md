 Sprint Goal (SMART Format)

  Goal: Complete the QA Chatbot MVP to production-ready state by implementing the 8 remaining acceptance criteria from user stories 2.1.1, 2.1.3, 2.1.4, and 2.1.5, enabling users to ask product questions and receive transparent, source-backed answers within a seamless conversational experience.

  SMART Breakdown

  Specific:
  - Implement 500-character limit with counter (2.1.5)
  - Limit source display to max 3 citations (2.1.3)
  - Add 60-second timeout enforcement for answers (2.1.4)
  - Refine LLM prompt to enforce 2-4 sentence concise answers (2.1.4)
  - Convert standalone chat to modal overlay widget (2.1.1)
  - Add chat icon to bottom navigation (2.1.1)
  - Add close button to modal (2.1.1)
  - Make chat available across all screens (2.1.1)

  Measurable:
  - 8 acceptance criteria marked ✅ in QA-Chatbot-Backlog.md
  - 0 acceptance criteria marked ❌ (except 2.1.1 if modal is deprioritized)
  - 100% of core user stories (2.1.1-2.1.7) complete

  Achievable:
  - Frontend changes only (no backend RAG pipeline changes)
  - Can build on existing working chat implementation
  - Small, focused tasks (char counter, source limiting, etc.)

  Relevant:
  - Aligns with V2 vision: "transparente Empfehlungen gibt, um von unsicherer Recherche zu vertrauensvoller Kaufentscheidung zu kommen"
  - Supports Pre-Kauf Support use case from Product.md
  - Completes MVP feature set for QA Chat

  Time-bound:
  - Sprint duration: 1 week (or your standard sprint length)
  - All 8 acceptance criteria completed by sprint end

  ---
  Sprint Metrics

  Primary Metrics (Sprint Completion)
  ┌─────────────────────────────────────┬─────────────┬─────────────┬─────────────────────────────────┐
  │               Metric                │   Target    │   Current   │             Formula             │
  ├─────────────────────────────────────┼─────────────┼─────────────┼─────────────────────────────────┤
  │ Acceptance Criteria Completion Rate │ 100%        │ 85%         │ (Completed AC / Total AC) × 100 │
  ├─────────────────────────────────────┼─────────────┼─────────────┼─────────────────────────────────┤
  │ User Story Completion               │ 4/4 stories │ 0/4 stories │ Stories with all AC ✅          │
  ├─────────────────────────────────────┼─────────────┼─────────────┼─────────────────────────────────┤
  │ Critical Bugs                       │ 0           │ TBD         │ P0/P1 bugs blocking release     │
  └─────────────────────────────────────┴─────────────┴─────────────┴─────────────────────────────────┘
  Quality Metrics
  ┌─────────────────────────────┬────────┬───────────────────────────────────────────────────────────────┐
  │           Metric            │ Target │                      Measurement Method                       │
  ├─────────────────────────────┼────────┼───────────────────────────────────────────────────────────────┤
  │ Source Citation Accuracy    │ 100%   │ All answers show ≤3 sources with correct format               │
  ├─────────────────────────────┼────────┼───────────────────────────────────────────────────────────────┤
  │ Character Limit Enforcement │ 100%   │ Input blocked at 500 chars, counter displays correctly        │
  ├─────────────────────────────┼────────┼───────────────────────────────────────────────────────────────┤
  │ Response Time               │ <60s   │ 95th percentile API response time                             │
  ├─────────────────────────────┼────────┼───────────────────────────────────────────────────────────────┤
  │ Answer Conciseness          │ 80%    │ % of answers with 2-4 sentences (manual review of 20 samples) │
  └─────────────────────────────┴────────┴───────────────────────────────────────────────────────────────┘
  User Experience Metrics (Post-Release)
  ┌─────────────────────────┬────────┬────────────────────────────────────────────────────────┐
  │         Metric          │ Target │                   Measurement Method                   │
  ├─────────────────────────┼────────┼────────────────────────────────────────────────────────┤
  │ Chat Engagement Rate    │ >60%   │ (Users who send ≥1 message / Total visitors) × 100     │
  ├─────────────────────────┼────────┼────────────────────────────────────────────────────────┤
  │ Follow-up Question Rate │ >40%   │ (Users who send ≥2 messages / Users who send ≥1) × 100 │
  ├─────────────────────────┼────────┼────────────────────────────────────────────────────────┤
  │ Source Click Rate       │ >15%   │ (Source link clicks / Total answers shown) × 100       │
  ├─────────────────────────┼────────┼────────────────────────────────────────────────────────┤
  │ Language Switch Rate    │ >10%   │ % of sessions with language toggle used                │
  └─────────────────────────┴────────┴────────────────────────────────────────────────────────┘
  Technical Debt & Maintainability
  ┌───────────────────────┬────────┬─────────────────────────────────────────────────────────┐
  │        Metric         │ Target │                   Measurement Method                    │
  ├───────────────────────┼────────┼─────────────────────────────────────────────────────────┤
  │ Code Review Coverage  │ 100%   │ All PRs reviewed before merge                           │
  ├───────────────────────┼────────┼─────────────────────────────────────────────────────────┤
  │ Test Coverage         │ >80%   │ Frontend unit/integration test coverage (if applicable) │
  ├───────────────────────┼────────┼─────────────────────────────────────────────────────────┤
  │ Documentation Updated │ 100%   │ QA-Chatbot-Backlog.md, README.md updated                │
  └───────────────────────┴────────┴─────────────────────────────────────────────────────────┘
  ---
  Definition of Done (DoD)

  A user story is considered DONE when:
  - ✅ All acceptance criteria marked ✅ in backlog
  - ✅ Code reviewed and merged
  - ✅ Manually tested in dev environment
  - ✅ No P0/P1 bugs
  - ✅ Documentation updated (backlog, README if needed)
  - ✅ Works in both DE and EN languages
  - ✅ Responsive design tested (desktop + mobile)

  ---
  Sprint Success Criteria

  The sprint is successful if:
  1. At least 6/8 acceptance criteria completed (75% threshold)
  2. No critical bugs blocking chat functionality
  3. Core user journey works end-to-end (user asks question → receives answer with ≤3 sources → can ask follow-up)
  4. Chat is production-ready for Pre-Kauf Support use case