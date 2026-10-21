# Multi-model AI implementation

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
