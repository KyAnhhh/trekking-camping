-- Review and apply before deploying source-history support. Does not modify existing messages.
BEGIN;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS source_metadata TEXT;
COMMIT;
