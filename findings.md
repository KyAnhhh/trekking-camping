# Findings

22/10/2026: citation guard checks source IDs, not entailment. Prior UI listed all retrieved chunks and history discarded source metadata. Added explicit cited flag/public excerpts and nullable TEXT source_metadata snapshot. Legacy TXT remains context-only (not confidential); PRIVATE excluded, PUBLIC snippets opt-in in admin upload. Historical snapshots are not revalidated or revoked after document deletion. No migration or real-provider calls this turn. See docs/chat-source-transparency.md.

Current source has Gemini-only ChatService, session owner/lease protections and local Transformers embedding with PgVectorStore. Git clean at start. No registry exists in this checkout.
Google documents gemma-4-31b-it and gemma-4-26b-a4b-it at https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api including system instructions and tool calling. Project access and model quality remain unverified.
