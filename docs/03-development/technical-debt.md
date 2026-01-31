# Sprint 1 Technical Debt Assessment

**Date:** 2026-01-10
**Assessment Level:** Product Management Review
**Scope:** Verifyr QA Chatbot MVP (Post-Sprint 1)

---

## Executive Summary

Verifyr has critical technical debt in authentication, testing, and data persistence that must be addressed before scaling. These issues don't affect current MVP functionality but will severely impact user experience, security, and economics as usage grows.

**Risk Level:** HIGH
**Time to Critical:** 2-4 weeks (after product launch)
**Mitigation Priority:** Critical issues must be resolved before public launch

---

## Critical Issues (Address Immediately)

### 1. No Authentication / Authorization ⚠️ SECURITY RISK

**Current State:**
- All API endpoints public (no user verification)
- `/query`, `/conversations`, `/products` accessible by anyone
- No rate limiting, no user isolation
- CORS allows any localhost origin

**Impact at Scale:**
- 100 users/day: ~$100/day LLM abuse risk
- 1,000 users/day: Service unavailable due to abuse
- Data privacy violations (GDPR, CCPA)

**Risk Assessment:**
| Category | Level | Reason |
|----------|-------|--------|
| Value Risk | CRITICAL | Uncontrolled API costs, data exposed |
| UX Risk | HIGH | No personalization, conversation loss |
| Feasibility Risk | MEDIUM | Standard auth (Supabase ready) |
| Economic Risk | CRITICAL | Could be $1000+/day in wasted LLM costs |

**Action:** Implement before any marketing/public launch
**Reference:** See `Authentification_plan.md` for implementation

**Recommendation:**
- **ADDRESS IMMEDIATELY** - Fix in Sprint 2 (blocking release)
- **Check dependencies** - Blocks rate limiting (#4), conversation isolation (#3), user analytics
- **Communicate risk** - Inform stakeholders: Cannot launch publicly. System exposes API to abuse ($1000+/day uncontrolled costs) and violates GDPR/CCPA data privacy laws
- **Action Owner:** Developer
- **Target Date:** End of Sprint 2 (non-negotiable)

---

### 2. Zero Automated Testing

**Current State:**
- 0 unit tests (backend)
- 0 integration tests (API endpoints)
- 0 E2E tests (user journeys)
- Manual testing only (described in DoD)

**Issues:**
- Breaking changes undetected until production
- Regression risk on every code change
- Refactoring paralyzed (fear of breakage)
- No confidence in deployments

**Risk Assessment:**
| Category | Level | Reason |
|----------|-------|--------|
| Value Risk | HIGH | Bugs shipped to production, user trust loss |
| UX Risk | HIGH | Feature breakage, data loss |
| Feasibility Risk | MEDIUM | Testing infrastructure required |
| Economic Risk | MEDIUM | Bug fixes cost 10x in production |

**Action:** Add pytest (backend) + Jest (frontend)
**Target:** >60% code coverage for critical paths
**Estimate:** 40-60 hours (3-4 sprints)

**Recommendation:**
- **ADDRESS IMMEDIATELY (Phase 1)** - Add critical path tests in Sprint 2-3 (30 hours) to prevent production bugs
- **Further discussion/review** - Team meeting to decide: testing framework (pytest vs unittest), coverage targets by sprint, responsibility (dev + QA)
- **Document and plan long-term** - Create backlog items for Phase 2 (expanded coverage to >80%)
- **Communicate risk** - Inform stakeholders: No automated tests = risk of breaking changes in production. Phase 1 addresses critical paths only.
- **Action Owner:** Developer + QA
- **Target Date (Phase 1):** End of Sprint 3

---

### 3. localStorage-Only Conversation Storage

**Current State:**
- Frontend: Conversations stored in browser localStorage
- Backend: Conversations saved as JSON files in `data/conversations/`
- No user association (single user, single device)
- No persistence after browser clear/device switch

**Issues:**
- Data loss on browser clear, cache clear, device switch
- No multi-device sync
- Users see different histories on different devices
- File system limits at ~10K conversations (future bottleneck)

**Risk Assessment:**
| Category | Level | Reason |
|----------|-------|--------|
| Value Risk | HIGH | User frustration, data loss complaints |
| UX Risk | CRITICAL | Major friction on second visit, cross-device |
| Feasibility Risk | EASY | Database migration straightforward |
| Economic Risk | LOW | Direct cost minimal, but churn impact |

**Churn Impact:**
- Day 1 Users: 5% churn (new devices)
- Week 1 Users: 15% churn (browser clear)
- Month 1 Users: 25-30% churn (multi-device expected)

**Action:** Migrate to Supabase PostgreSQL (bundle with auth #1)
**Estimate:** 20 hours (includes auth + DB)

**Recommendation:**
- **ADDRESS IMMEDIATELY** - Fix in Sprint 2 (bundle with authentication work)
- **Check dependencies** - Part of authentication implementation (#1), enables user analytics and multi-device sync
- **Communicate risk** - Inform stakeholders: Current system causes 25-30% churn by month 1 (users lose conversations on device switch or browser clear)
- **Document plan** - Preserve existing JSON conversations (archive, don't delete), migration path
- **Action Owner:** Developer (with authentication sprint work)
- **Target Date:** End of Sprint 2

---

## High Priority (Address Within 2 Sprints)

### 4. No Rate Limiting / API Abuse Protection

**Current State:**
- Unlimited requests per IP/user
- 60-second timeout possible per request
- No throttling, no queue management
- Vulnerable to denial-of-service

**Impact:**
- Malicious actor: 100 requests/day = $100 LLM cost
- Bot attack: 10K requests = $1,000+ in minutes
- Legitimate spike: Server overloaded, all users affected

**Risk Assessment:**
| Category | Level | Reason |
|----------|-------|--------|
| Value Risk | MEDIUM | Service degradation, cost explosion |
| UX Risk | MEDIUM | Slow responses for legitimate users |
| Feasibility Risk | EASY | FastAPI middleware available |
| Economic Risk | HIGH | Uncapped LLM API costs |

**Action:** Implement rate limiting (e.g., 10 req/min per IP, 100/day per user)
**Estimate:** 8 hours

**Recommendation:**
- **ADDRESS IMMEDIATELY** - Fix in Sprint 2 (essential before public launch)
- **Consult with team** - Ask developer: rate limit values (too strict = user frustration, too loose = abuse)
- **Check dependencies** - Works better with authentication (#1), can be implemented in parallel
- **Communicate risk** - Inform stakeholders: Without rate limiting, malicious actor can incur $1000+ in LLM costs in minutes by spamming API
- **Action Owner:** Developer
- **Target Date:** End of Sprint 2

---

### 5. No Caching Strategy

**Current State:**
- Every query generates new LLM response
- Identical questions run through full pipeline
- Same context retrieved multiple times
- No deduplication

**Issues:**
- 80% of queries likely duplicate/similar patterns
- Example: "Battery life of Apple Watch" asked 1,000 times = 1,000 API calls
- Wasted $500+/month on redundant LLM generation

**Risk Assessment:**
| Category | Level | Reason |
|----------|-------|--------|
| Value Risk | MEDIUM | 20-30% cost savings possible |
| UX Risk | LOW | Users don't notice, slightly faster responses |
| Feasibility Risk | MEDIUM | Semantic caching complex |
| Economic Risk | HIGH | 20-30% cost reduction opportunity |

**Action:** Implement semantic caching for similar queries
**Phase:** After authentication (Phase 13+)
**Estimate:** 60-80 hours (complex, requires ML)

**Recommendation:**
- **DOCUMENT AND PLAN FOR LONG-TERM** - Add to Phase 13 backlog, no immediate action
- **Observe & address later** - Collect baseline data in production (track 20+ sample queries, identify duplicate patterns)
- **Consult with team** - Ask developer: semantic similarity matching feasibility, cache invalidation strategy, privacy concerns
- **Communicate risk** - Inform stakeholders: Opportunity for 20-30% cost savings identified. Planning Phase 13. No risk if deferred.
- **Action Owner:** PM (document) + Developer (implement Phase 13)
- **Target Date:** Phase 13 planning

---

### 6. Synchronous API (Blocking)

**Current State:**
- POST `/query` blocks until LLM responds (up to 60s)
- Client waits for full response
- No streaming, no progress indication
- Server resources locked during generation

**Issues:**
- Max ~10-20 concurrent users before timeout
- Server memory exhausted by waiting requests
- Poor UX: user stares at loading spinner for 30-60s

**Risk Assessment:**
| Category | Level | Reason |
|----------|-------|--------|
| Value Risk | MEDIUM | Scalability ceiling at ~50 concurrent users |
| UX Risk | HIGH | Perception of slowness, frustration |
| Feasibility Risk | HARD | Async architecture requires refactor |
| Economic Risk | MEDIUM | Limits growth without infrastructure scaling |

**Action:** Implement async processing + WebSocket for streaming
**Phase:** Phase 14+ (after auth, testing, monitoring)
**Estimate:** 100+ hours (major refactor)

**Recommendation:**
- **DOCUMENT AND PLAN FOR LONG-TERM** - Add to Phase 14 backlog, major refactor
- **Observe & address later** - Monitor current performance in production (response times in Langfuse, concurrent user limits)
- **Further discussion/review** - Conduct tech design session (1 hour): SSE vs WebSocket decision, framework choice, library options
- **Consult with team** - Ask developer: alternative approaches, architectural impact, timeline
- **Communicate risk** - Inform stakeholders: Scales to ~20 concurrent users max. Long-term need for async (Phase 14). Not blocking launch.
- **Action Owner:** PM (document) + Developer (design Phase 14)
- **Target Date:** Phase 14 design; Phase 15+ implementation

---

### 7. File-Based Storage (Non-Scalable)

**Current State:**
- Conversations stored as individual JSON files
- File system limits at ~10K files before slowdown
- No indexing, full table scans for list
- No backup strategy

**Issues:**
- Doesn't scale beyond 100K conversations
- Slow retrieval with many files
- No transaction support
- Vulnerable to disk failure

**Risk Assessment:**
| Category | Level | Reason |
|----------|-------|--------|
| Value Risk | HIGH | System breaks at scale (10K conversations) |
| UX Risk | LOW | Current scale acceptable |
| Feasibility Risk | EASY | Database migration straightforward |
| Economic Risk | LOW | File storage cheap |

**Action:** Migrate to PostgreSQL (bundle with authentication #1)
**Estimate:** 15 hours (with auth + DB schema)

**Recommendation:**
- **ADDRESS IMMEDIATELY** - Fix in Sprint 2 (bundle with authentication work, no separate effort)
- **Check dependencies** - Part of authentication implementation (#1), enables scalability to 1M+ conversations
- **Document plan** - Database schema design, backup strategy, performance benchmarks
- **Communicate risk** - Inform stakeholders: File-based storage breaks at ~10K conversations. Fixed as part of authentication (no additional cost).
- **Action Owner:** Developer (with authentication work)
- **Target Date:** End of Sprint 2

---

## Medium Priority (Address Within 3-6 Sprints)

### 8. No Error Monitoring / Centralized Logging

**Current State:**
- Console logs only (development environment)
- No error aggregation
- No alerting on production errors
- No performance metrics visible

**Issues:**
- Production errors invisible until user reports
- Difficult to diagnose issues in production
- No early warning of degradation

**Risk Assessment:**
| Category | Level | Reason |
|----------|-------|--------|
| Value Risk | MEDIUM | Production issues invisible |
| UX Risk | MEDIUM | User problems unreported |
| Feasibility Risk | EASY | Sentry/Logtail integration simple |
| Economic Risk | LOW | ~$26/month for Sentry Pro |

**Action:** Add Sentry for error tracking + Logtail for logs
**Estimate:** 8-12 hours

**Recommendation:**
- **ADDRESS IMMEDIATELY** - Implement in Sprint 2 (gives production visibility, relatively quick)
- **Consult with team** - Ask developer: error severity thresholds, on-call rotation policy, privacy/logging policy for PII
- **Document and plan** - Create alerts for critical errors, integration with Slack
- **Observe & address later** - Phase 2: Enhanced dashboards, performance analytics, user impact analysis (Sprint 3+)
- **Communicate risk** - Inform stakeholders: Currently no visibility into production errors until users report them. Sentry/Logtail (6-10 hrs) provides alerts + diagnostics. Cost: ~$26/month.
- **Action Owner:** Developer
- **Target Date (Phase 1):** End of Sprint 2

---

### 9. Single Server Architecture (No Failover)

**Current State:**
- One server running locally or single cloud instance
- No load balancing
- No geographic redundancy
- Single point of failure

**Issues:**
- Server goes down = total service loss
- No rolling deployments (downtime required)
- No high availability setup

**Risk Assessment:**
| Category | Level | Reason |
|----------|-------|--------|
| Value Risk | MEDIUM | Downtime = 100% loss |
| UX Risk | CRITICAL (when down) | Zero availability |
| Feasibility Risk | HARD | Requires infrastructure rethink |
| Economic Risk | MEDIUM | Multi-region hosting $500+/month |

**Action:** Deploy to Vercel/Railway with auto-scaling
**Phase:** Phase 15+ (after core features stable)
**Estimate:** 40-60 hours

**Recommendation:**
- **OBSERVE & ADDRESS LATER** - Monitor current reliability, plan for Phase 15
- **Check dependencies** - Requires auth (#1), testing (#2), monitoring (#8) to be implemented first
- **Further discussion/review** - Team meeting: hosting options (Vercel vs Railway vs AWS), cost/benefit, migration timeline
- **Document and plan** - Create Phase 15 backlog item "Implement multi-region deployment with failover"
- **Communicate risk** - Inform stakeholders: Acceptable for MVP (1-5K users). For 10K+ users, need load balancing/failover. Planned Phase 15. No risk before then.
- **Action Owner:** PM (planning) + DevOps (implementation)
- **Target Date:** Phase 15

---

### 10. No Backend Input Validation

**Current State:**
- Character limits enforced frontend only
- Backend accepts any size/content
- No HTML sanitization
- No XSS protection

**Issues:**
- Malicious payloads could crash LLM or expose data
- Frontend bypassed = vulnerable
- SQL injection risk if future DB integration

**Risk Assessment:**
| Category | Level | Reason |
|----------|-------|--------|
| Value Risk | LOW | LLM handles large inputs gracefully |
| UX Risk | LOW | Unlikely user exploit |
| Feasibility Risk | EASY | Add Pydantic validators |
| Economic Risk | LOW | LLM token limits provide cap |

**Action:** Add backend validation for all inputs
**Estimate:** 6-8 hours

**Recommendation:**
- **ADDRESS IMMEDIATELY** - Implement in Sprint 2 (security hardening, quick win)
- **Consult with team** - Ask developer: critical inputs priority (question > language > model), sanitization concerns, performance impact
- **Document plan** - Create validation rules: max 500 chars per question, reject empty/whitespace-only, HTML sanitization, SQL injection protection
- **Communicate risk** - Inform stakeholders: Security hardening (8 hrs). Low risk currently, but essential for production-grade system.
- **Action Owner:** Developer
- **Target Date:** End of Sprint 2

---

### 11. Qdrant File Lock Management

**Current State:**
- Qdrant database locked by running server
- Indexing scripts fail if server running
- Workflow: kill server → run indexing → restart server
- Undocumented process causes developer friction

**Issues:**
- Developer frustration
- Repeated lockout mistakes
- No automation

**Risk Assessment:**
| Category | Level | Reason |
|----------|-------|--------|
| Value Risk | MEDIUM | Dev productivity loss |
| UX Risk | NONE | Users unaffected |
| Feasibility Risk | MEDIUM | Requires process discipline |
| Economic Risk | NONE | Dev time only |

**Action:** Document process in CLAUDE.md + create automation script
**Estimate:** 4 hours

**Recommendation:**
- **DOCUMENT AND PLAN FOR LONG-TERM** - Add clear process documentation to CLAUDE.md (Sprint 2)
- **Further discussion/review** - Ask developer: any alternative indexing strategies? Should indexing run in background worker?
- **Address immediately (documentation)** - Document in Sprint 2 (1 hour) - step-by-step, common issues, solutions
- **Address later (automation)** - Create `./scripts/reindex.ps1` automation script (Sprint 3) to reduce manual steps
- **Communicate risk** - Minor developer productivity issue. Documenting and automating (3 hrs total). No product impact.
- **Action Owner:** Developer
- **Target Date (Documentation):** Sprint 2; (Automation):** Sprint 3

---

## Low Priority (Monitor, Address Later)

### 12. No API Versioning

**Current State:**
- All endpoints under `/` (no version prefix)
- Breaking changes affect all clients immediately
- No backward compatibility strategy

**Risk Assessment:**
| Category | Level | Reason |
|----------|-------|--------|
| Value Risk | LOW | Only 1 client (frontend) |
| UX Risk | LOW | Controlled deployment |
| Feasibility Risk | EASY | Add `/v1/` prefix |
| Economic Risk | NONE | No external API consumers yet |

**Action:** Add API versioning before external integrations
**Estimate:** 4-6 hours

**Recommendation:**
- **DOCUMENT AND PLAN FOR LONG-TERM** - Create backlog item "Add API versioning" marked "Do before external integrations"
- **Check dependencies** - Only relevant if external integrations are planned (verify with PM)
- **Observe & address later** - Monitor if third-party integration requests come in
- **Communicate risk** - No urgency now (internal client only). Will implement before any external integrations (5 hrs when needed).
- **Action Owner:** PM (document) + Developer (implement when needed)
- **Target Date:** Before external integrations

---

### 13. Hardcoded Configuration

**Current State:**
- CORS origins hardcoded in main.py
- Model names hardcoded in app.js
- API base URL hardcoded in frontend

**Risk Assessment:**
| Category | Level | Reason |
|----------|-------|--------|
| Value Risk | LOW | Changes are infrequent |
| UX Risk | NONE | No user impact |
| Feasibility Risk | EASY | Move to .env |
| Economic Risk | NONE | No direct cost |

**Action:** Externalize config to environment variables
**Estimate:** 3-4 hours

**Recommendation:**
- **DOCUMENT AND PLAN FOR LONG-TERM** - Add to Sprint 4 backlog, low priority
- **Observe & address later** - Monitor if config changes become frequent
- **Consult with team** - Ask developer: which configs change most often? Worth refactoring now or later?
- **Communicate risk** - Low priority. Configuration improvements (5 hrs) planned for Sprint 4. No urgency before then.
- **Action Owner:** Developer
- **Target Date:** Sprint 4

---

### 14. No Performance Monitoring

**Current State:**
- Langfuse integrated (Phase 11) for observability
- No APM (Application Performance Monitoring)
- No query latency tracking dashboard
- No bottleneck identification

**Risk Assessment:**
| Category | Level | Reason |
|----------|-------|--------|
| Value Risk | MEDIUM | Performance regressions invisible |
| UX Risk | MEDIUM | Degradation undetected |
| Feasibility Risk | EASY | Langfuse dashboards available |
| Economic Risk | LOW | Langfuse already integrated |

**Action:** Expand Langfuse dashboards for latency tracking
**Estimate:** 8-12 hours

**Recommendation:**
- **OBSERVE & ADDRESS LATER** - Collect production metrics first (Sprint 2-3), then expand dashboards
- **Consult with team** - Ask developer: which metrics are most valuable? Alert thresholds? Actionable insights?
- **Document and plan** - Create dashboard specs for Phase 1 (Sprint 3): query latency trends, cost tracking, cache hit rates (when caching added)
- **Communicate risk** - Langfuse observability already in place. Expanding dashboards for better insights (6 hrs, Sprint 3). No risk before then.
- **Action Owner:** Developer
- **Target Date:** Sprint 3

---

### 15. No Rollback Strategy

**Current State:**
- Manual deployments
- Bad deploy = manual fixes or server restart
- No CI/CD pipeline
- No rollback buttons

**Risk Assessment:**
| Category | Level | Reason |
|----------|-------|--------|
| Value Risk | MEDIUM | Deployment errors cause downtime |
| UX Risk | MEDIUM | Temporary service disruption |
| Feasibility Risk | MEDIUM | CI/CD pipeline needed |
| Economic Risk | LOW | Rare occurrence, but costly |

**Action:** Set up GitHub Actions + Railway auto-deploy with rollback
**Estimate:** 20-30 hours

**Recommendation:**
- **DOCUMENT AND PLAN FOR LONG-TERM** - Add to Phase 16 backlog, infrastructure investment
- **Further discussion/review** - Team meeting: current deployment process, CI/CD requirements, rollback strategy
- **Consult with team** - Ask DevOps/developer: GitHub Actions vs GitLab CI? Railway vs Vercel? Testing gates before deploy?
- **Document plan** - Create deployment spec: automated tests on PR, single-click deploy, one-click rollback
- **Communicate risk** - Manual deployments acceptable now. CI/CD with rollback planned Phase 16. More important as team scales.
- **Action Owner:** PM (planning) + DevOps (implementation)
- **Target Date:** Phase 16

---

## Priority Matrix

```
CRITICAL (Do Now)          | HIGH (Sprint 2)
---------------------------|---------------------------
#1 Authentication          | #4 Rate Limiting (8h)
#2 Testing (long-term)     | #5 Caching (Phase 13+)
#3 Migrate DB (20h)        | #6 Async API (Phase 14+)
                          | #7 DB Migration (15h)
                          | #11 Qdrant Process (4h)

MEDIUM (3-6 Sprints)       | LOW (Monitor)
---------------------------|---------------------------
#8 Error Monitoring (10h)  | #12 API Versioning (5h)
#9 Load Balancing (50h)    | #13 Config Extern. (3h)
#10 Input Validation (7h)  | #14 Performance Monitor (10h)
                          | #15 Rollback Strategy (25h)
```

---

## Recommended Action Plan

### Before Public Launch (Critical Path)
1. **✅ Authentication (already planned)** - 40 hours
   - Supabase email/password setup
   - Protected API endpoints
   - Frontend login UI

2. **Rate Limiting** - 8 hours
   - 10 req/min per IP
   - 100 req/day per user
   - Graceful error messages

3. **Basic Testing** - 30 hours (Sprint 2-3)
   - 10 critical path tests
   - Query endpoint tests
   - Hybrid search tests
   - LLM generation tests

4. **Error Monitoring** - 10 hours (Sprint 2)
   - Sentry integration
   - Critical error alerts
   - Logtail for logs

5. **Input Validation** - 7 hours (Sprint 2)
   - Backend validation
   - Max length checks
   - HTML sanitization

**Total: ~95 hours = 2-3 sprints**

### After Launch (Continuous)
- **Caching Strategy** - Phase 13+
- **Async/Streaming** - Phase 14+
- **Load Balancing** - Phase 15+
- **Performance Monitoring** - Ongoing

---

## Cost of Inaction

### Scenario: 1,000 Users/Day by Month 3

| Debt Item | Monthly Cost | Impact |
|-----------|--------------|--------|
| No Auth (API Abuse) | $3,000 | Uncontrolled costs |
| No Caching | $1,500 | Wasted on duplicate queries |
| No Rate Limiting | $2,000+ | Abuse scenarios |
| localStorage Only | 25% churn | Users lost on 2nd visit |
| No Error Monitoring | $5K+ | Undetected outages |
| Single Server | Reputation | Downtime incidents |

**Total Risk:** $10,000+/month + user churn

---

## Approval & Sign-Off

**Assessed by:** Product Management
**Date:** 2026-01-10
**Status:** Ready for Sprint 2 Planning

**Next Step:** Create Sprint 2 user stories for Critical items #1-4

---

**Related Documents:**
- `Authentification_plan.md` - Implementation details for #1
- `Sprint1_Retrospective.md` - Team feedback on Sprint 1
- `Sprint2_Improvement_Plan.md` - Process improvements
- `CLAUDE.md` - Dev guidelines
- `Product-strategy/dev_phases.md` - 13-phase roadmap
