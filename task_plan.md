# Multi-model AI implementation

23/10/2026 guide assignment response:
- [x] Pending/accepted/declined plus explicit legacy compatibility, assignment event audit and notification integration.
- [x] Admin overview/reason/history/account warnings; Guide response UI; accepted-only new roster and public team access.
- [x] Additive migration applied with external backup; real read-only overview/audit SQL verified.
- [x]474 final backend tests,7 browser API-stub checks, frontend build. docs/guide-assignment-response.md.
- [ ] Full-app acceptance with3 test accounts and PostgreSQL concurrency; real outbound email not tested.

23/10/2026 user request — complete missing tour data:
- [x] Audit all16 tours and obtain explicit approval for labeled synthetic content.
- [x] External snapshots, dry-run rollback, guarded DB commit and independent verification.
- [x] Requirements, checklist, missing overview fields, itinerary days, future demo departures and labeled illustration asset.
- [ ] Operator-verified photos, actual guide assignments and real departures: not represented by demo data.
- [ ] Resync tour knowledge before next RAG acceptance; no AI calls this turn.

22/10/2026 phase2 first feature — Tour favorites:
- [x] Owner-bound API, idempotent writes, public-only pagination and migration script.
- [x] Shared favorite state, card/detail button, protected page and account menu.
- [x] Mock/security tests, Vite build and API-stub browser checks.
- [x] Manual instructions: docs/tour-favorites.md.
- [x] Apply favorites migration to configured DB; verify real SQL empty lists and sequential save/delete/duplicate behavior with rollback.
- [ ] Verify two authenticated accounts through HTTP/UI and PostgreSQL concurrency (SQL checks do not cover these).
- [x] Tour comparison:2–3 selection, public API table, source/simulation labels, schedule links and browser stub verification. See docs/tour-comparison.md.
- [x] Departure calendar/list public, filters, header, correct booking selection, security/unit tests and browser stub checks; read-only service query verified on PostgreSQL. See docs/departures.md.
- [ ] Full-app browser acceptance for departures using real backend and login.

Latest request, 22/10/2026:
- [x] Fill missing metrics on IDs1–8 as labeled simulation, preserve existing6–8 values.
- [x] Backup, guarded transaction and independent DB readback (all16 tours complete).
- [ ] Runtime UI check and knowledge resync when backend is started; no real-world accuracy claim.

22/10/2026 user-approved demo tour copies:
- [x] Create8 explicitly labeled synthetic radar copies in actual DB; originals unchanged.
- [x] Back up source rows and created copies; independent readback verifies5 metrics and no schedules.
- [ ] User-facing runtime check after backend/frontend start. Source-backed original radar metrics remain incomplete.

22/10/2026 — Tour data repair and phase 2 planning:
- [x] Read actual DB profile fields and blocking booking counts.
- [x] Match operator sources for tours 2–5; no fabricated radar metrics.
- [x] Dry-run rollback, snapshot, guarded real DB update, independent readback.
- [x] Remove K50's three metrics confirmed synthetic by user; preserve other data.
- [x] Document phase 2 in docs/phase-2-discovery-plan.md (planning only).
- [ ] Obtain missing route/medical metrics and identify exact Ta Nang 3N2D source.
- [ ] Verify UI and resync tour knowledge when backend is running.

22/10/2026 — Source transparency:
- [x] Cited vs retrieved sources, safe public excerpts, clickable citations.
- [x] Persist source metadata in message/history contract; legacy null supported.
- [x] Admin explicit opt-in for public TXT excerpts; context-only policy explained.
- [x] Targeted mock regression and browser API-stub checks; production frontend build.
- [ ] Apply chat-source-metadata.sql and verify real PostgreSQL persistence.
- [ ] Live provider semantic citation/quality evaluation (not authorized this turn).

Latest approved change: client-selected model replaces admin task defaults.
- [x] Compact composer selector + shared planner selector, explicit choice required.
- [x] Ignore legacy default assignments; preserve existing explicit selection and old saved plans.
- [x] Backend routing tests and18 browser checks (API stub); no live AI calls.

- [x] Registry persisted with revision, audit, task assignments and routing.
- [x] Session selection with owner, busy and revision guards.
- [x] Shared client selector and admin management UI.
- [x] Mock regression, build, SQL and operator documentation.
- [ ] PostgreSQL migration/full-app acceptance and opt-in provider quality evaluation before public Gemma rollout.

No live AI calls, shared env changes or application database migration. Gemma initially disabled/hidden.

23/10/2026 booking change requests:
- [x] Owner/admin API, locked approval, same-tour price/availability checks, refund-required cancellation, audit rows and notices.
- [x] Client form/history, admin pending queue and review note; additive SQL applied after isolated rollback checks.
- [x] 499 backend tests, 8 browser API-stub checks, Vite build. See docs/booking-change-requests.md.
- [ ] Full-app two-account and real PostgreSQL approval/payment concurrency acceptance; gateway refunds remain manual.

23/10/2026 complete six recommendations (current request):
- [x] Item1 booking requests implemented in previous turn.
- [x] Items2-6 implementation: preparation checklist, email preference/reminders, guide reports, moderated review photos, owner-only AI preparation tool.
- [x] Combined backend/security/browser-stub acceptance and SQL migration verification (see results below; not full-app).
- [ ] Live AI/email/gateway quality not executed; never count mocks as live evidence.

23/10/2026 six-feature acceptance update:
- [x] Items2-6 backend/frontend implementation complete at documented MVP scope; item1 preserved.
- [x] Four new tables applied; real PostgreSQL migration constraints checked with synthetic rollback.
- [x] 616 backend tests, frontend build, 12 experience browser-stub checks and 8 booking-change checks passed.
- [x] Manual instructions and limits: docs/trip-experience.md and docs/booking-change-requests.md.
- [ ] Full-app multi-account DB concurrency, actual SMTP delivery and live provider answer quality require separate controlled acceptance. Refund/paid price-difference settlement remains manual.

24/10/2026 follow-up:
- [x] Expanded offline regression:864 backend tests/52 suites,24 frontend Node tests; previous totals overlap.
- [x] Consolidated manual acceptance matrix: docs/six-features-acceptance.md.
- [ ] Restore/identify isolated PostgreSQL environment before full-app transaction/concurrency acceptance. No default application-context startup against real business data.
