# Progress

22/10/2026 source transparency: clickable source IDs, cited/retrieved grouping, public excerpt upload opt-in, history metadata and migration prepared. Backend first run483 pass, follow-up443 pass (overlapping); browser21 API-stub checks pass, API contract15 pass, Vite build pass. DB migration/persistence and semantic provider quality not verified. Details: docs/chat-source-transparency.md.

21/10/2026 client-directed model change: compact selector moved into composer, reused in planner; no task assignments/default resolution. Legacy JSON defaults ignored without schema migration. Planner passes and stores explicit modelId. Regression502 pass/1 skipped plus1 additional new planner case pass (5 planner reruns not additional). Browser18 API-stub checks pass after fixing leftover old selector ReferenceError; no live AI/DB calls. Vite direct build checked; npm wrapper exited1 without diagnostic.

21/10/2026 timeout/citation fix: shared 80s/4-call chat provider budget; Gemma read cap60s, no socket-timeout retries, per-thread request timeout isolation, thinking minimal for Gemma4. Explicit current citation allowlist and DB-vs-RAG instructions. Invalid citation discards generated advice/proposal and returns transparent deterministic unverified notice, preserving only valid DB cards. 38 targeted tests passed, 0 skipped; mock HTTP and fake-clock/request-factory tests, no live model/DB calls. Log: backend/target/chat-timeout-fix.log.

21/10/2026 follow-up: fixed first admin model save returning 503 when schema exists but singleton row is absent. Atomic PostgreSQL insert-if-absent followed by lock/revision validation, no schema changes or live DB calls. Added first-save and competing-writer unit cases.

21/10/2026: inspected current source and official provider documentation. Implementation in progress, no live provider calls.

Implementation complete for registry/task assignments/audit, pinned model tool loop, selection/revision, shared client selector and admin UI. SQL prepared but not executed. 497 backend tests passed, 1 live smoke skipped; 15 API contract tests and frontend build passed. 14 Chrome checks with API stubs passed, runtime errors empty. No DB/provider integration claim. Details and rollout steps: docs/ai-model-management.md.
