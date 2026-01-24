Sprint 1: QA Chatbot MVP - Sprint Planning Preparation

 Sprint Goal (SMART Format)

 Deutsch:
 Ein funktionsfähiges QA-Chatbot-MVP entwickeln, damit Nutzer Produktfragen stellen und klären können und transparente, quellengestützte Antworten in einer
 dialogorientierten Oberfläche erhalten, indem alle 7 zentralen User Stories (2.1.1-2.1.7) implementiert werden, um den Anwendungsfall „Pre-Kauf-Support" zu unterstützen    
 und die Vision von Verifyr V2 zu verwirklichen, Nutzer von unsicheren Recherchen zu sicheren Kaufentscheidungen zu führen.

 English:
 Deliver a functional QA Chatbot MVP that enables users to ask product questions and receive transparent, source-backed answers in a conversational interface, by
 implementing all 7 core user stories (2.1.1-2.1.7) to support the Pre-Kauf Support use case and align with Verifyr V2 vision of moving users from uncertain research to     
 confident purchase decisions.

 ---
 SMART Breakdown

 Specific

 Implement 7 user stories (2.1.1-2.1.7) covering:
 - Chat interface with modal overlay and navigation icon
 - Quick-reply buttons for common questions
 - Source citations (max 3 per answer)
 - Free text input with 500 char limit
 - Multi-turn conversation with context retention
 - Persistent chat history

 Measurable

 - 7/7 user stories with all acceptance criteria (42 total) completed
 - 0 critical bugs blocking core functionality
 - Response time <60 seconds (95th percentile)
 - End-to-end user journey working (ask → answer with sources → follow-up)

 Achievable

 - Frontend-only work (backend /query endpoint already exists)
 - 1 developer, 1 sprint (5-10 days)
 - No dependencies on other teams

 Relevant

 - Supports Pre-Kauf Support use case (product questions, uncertainty clarification)
 - Aligns with V2 Vision: "transparente Empfehlungen" and "von unsicherer Recherche zu vertrauensvoller Kaufentscheidung"
 - Delivers USP 2: Q&A Chat component

 Time-bound

 - Sprint duration: 5-10 working days
 - Demo-ready by sprint review

 ---
 Sprint Scope
 ┌───────────────────────────────┬──────────┬──────────────┐
 │          User Story           │ Priority │ Story Points │
 ├───────────────────────────────┼──────────┼──────────────┤
 │ 2.1.1: Q&A Chat öffnen        │ P0       │ 5 SP         │
 ├───────────────────────────────┼──────────┼──────────────┤
 │ 2.1.2: Quick-Reply klicken    │ P0       │ 3 SP         │
 ├───────────────────────────────┼──────────┼──────────────┤
 │ 2.1.3: Quellen sehen          │ P0       │ 3 SP         │
 ├───────────────────────────────┼──────────┼──────────────┤
 │ 2.1.4: Layman-Terms verstehen │ P1       │ 5 SP         │
 ├───────────────────────────────┼──────────┼──────────────┤
 │ 2.1.5: Freitext eingeben      │ P0       │ 3 SP         │
 ├───────────────────────────────┼──────────┼──────────────┤
 │ 2.1.6: Follow-up stellen      │ P0       │ 5 SP         │
 ├───────────────────────────────┼──────────┼──────────────┤
 │ 2.1.7: Chat-Verlauf sehen     │ P1       │ 3 SP         │
 ├───────────────────────────────┼──────────┼──────────────┤
 │ Total                         │          │ 27 SP        │
 └───────────────────────────────┴──────────┴──────────────┘
 ---
 Sprint Metrics to Track

 Progress Metrics (Daily/Weekly)
 ┌──────────────────────────┬────────┬───────────────────────────────────┐
 │          Metric          │ Target │          How to Measure           │
 ├──────────────────────────┼────────┼───────────────────────────────────┤
 │ User Stories Completed   │ 7/7    │ Count stories with all AC ✅      │
 ├──────────────────────────┼────────┼───────────────────────────────────┤
 │ Story Points Burned      │ 27 SP  │ Track completed story points      │
 ├──────────────────────────┼────────┼───────────────────────────────────┤
 │ Acceptance Criteria Done │ 42/42  │ Manual QA checklist               │
 ├──────────────────────────┼────────┼───────────────────────────────────┤
 │ Blocker Issues           │ 0      │ Critical bugs preventing progress │
 └──────────────────────────┴────────┴───────────────────────────────────┘
 Success Metrics (End of Sprint)
 ┌──────────────────────────┬────────────┬───────────────────────────────────────────────┐
 │          Metric          │   Target   │                How to Measure                 │
 ├──────────────────────────┼────────────┼───────────────────────────────────────────────┤
 │ Sprint Goal Achieved     │ Yes/No     │ All 7 stories done? End-to-end journey works? │
 ├──────────────────────────┼────────────┼───────────────────────────────────────────────┤
 │ Critical Bugs            │ 0          │ P0/P1 bugs blocking release                   │
 ├──────────────────────────┼────────────┼───────────────────────────────────────────────┤
 │ Response Time            │ <60s (p95) │ Test 10+ queries, track slowest               │
 ├──────────────────────────┼────────────┼───────────────────────────────────────────────┤
 │ Source Citation Accuracy │ 100%       │ All answers show ≤3 sources correctly         │
 ├──────────────────────────┼────────────┼───────────────────────────────────────────────┤
 │ Input Validation         │ 100%       │ 500 char limit enforced + counter works       │
 ├──────────────────────────┼────────────┼───────────────────────────────────────────────┤
 │ Cross-browser Works      │ 100%       │ Chrome, Firefox, Safari, Edge tested          │
 ├──────────────────────────┼────────────┼───────────────────────────────────────────────┤
 │ Mobile Responsive        │ 100%       │ Works on mobile viewport (375px+)             │
 └──────────────────────────┴────────────┴───────────────────────────────────────────────┘
 Optional Baseline Metrics (for future)
 ┌───────────────────┬───────────────────────────────────────┐
 │      Metric       │            Baseline Target            │
 ├───────────────────┼───────────────────────────────────────┤
 │ Chat Engagement   │ >50% (demo users who send ≥1 message) │
 ├───────────────────┼───────────────────────────────────────┤
 │ Follow-up Rate    │ >30% (users who send ≥2 messages)     │
 ├───────────────────┼───────────────────────────────────────┤
 │ Source Click Rate │ >10% (clicks per answer shown)        │
 └───────────────────┴───────────────────────────────────────┘
 ---
 Definition of Done

 A user story is DONE when:
 - ✅ All acceptance criteria met and tested
 - ✅ Code reviewed and merged
 - ✅ Tested in DE + EN languages
 - ✅ No critical bugs (P0/P1)
 - ✅ Works on desktop + mobile
 - ✅ Demo-ready

 ---
 Questions for Sprint Planning

 Scope & Capacity

 1. Team capacity: How many working days do we have this sprint? Any planned absences?
 2. Velocity: What's our baseline velocity? Can we commit to 27 SP?
 3. Priorities: If we can only complete 6/7 stories, which story is lowest priority (2.1.4 or 2.1.7)?
 4. Stretch goals: If ahead of schedule, should we start Bonus Features (B.1-B.4) or refine existing stories?

 Dependencies & Risks

 5. Backend ready? Is the /query endpoint working and tested? Does it support conversation_history parameter for multi-turn?
 6. Design assets: Do we have wireframes/mockups for the modal overlay and chat icon?
 7. Modal vs. standalone: User story 2.1.1 describes a modal overlay, but current implementation is full-page. Do we convert to modal, or update acceptance criteria?        
 8. Response time: Can the backend guarantee <60s response time? What happens if it times out?
 9. 500 char limit: Is this the right limit, or should we test with users first?

 Technical Decisions

 10. Modal architecture: If converting to modal, how does it integrate with the main app navigation?
 11. Source limiting: If backend returns >3 sources, which 3 do we show? (First 3? Highest relevance score?)
 12. Answer length enforcement: 2-4 sentences is hard to validate. Is this a backend prompt guideline or frontend validation?
 13. Browser support: Chrome, Firefox, Safari, Edge - which versions minimum?
 14. Mobile breakpoint: What's the minimum mobile width we support? (375px?)

 Testing & Quality

 15. QA process: Manual testing only, or do we need automated tests?
 16. Who tests? Developer self-testing, or separate QA person?
 17. Test data: Do we have sample questions ready for testing (DE + EN)?
 18. Definition of Done: Does the team agree with the DoD criteria above?

 Metrics & Success

 19. How do we track progress? Daily standup? Burndown chart? Jira/Trello board?
 20. Success criteria: Is "6/7 stories done + end-to-end journey working" acceptable, or must it be 7/7?
 21. Baseline metrics: Should we track engagement/click rates in this sprint, or wait for production?

 Next Steps

 22. Sprint Review: When is the demo? Who's the audience?
 23. Retrospective: When do we hold the retro? What format?
 24. Sprint 2: Are we planning to continue with Bonus Features or pivot to Pre-Kauf/Post-Kauf user stories?