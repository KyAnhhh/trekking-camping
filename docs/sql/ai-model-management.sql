-- Apply manually on a backed-up database before starting this version. No provider secrets.
BEGIN;
CREATE TABLE IF NOT EXISTS ai_configuration (
    id INTEGER PRIMARY KEY CHECK(id=1),
    revision BIGINT NOT NULL DEFAULT 0,
    document TEXT NOT NULL
);
INSERT INTO ai_configuration(id,revision,document) VALUES(1,0,'{}') ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS ai_configuration_audit (
    revision BIGINT PRIMARY KEY,
    document TEXT NOT NULL,
    changed_by VARCHAR(255) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL
);
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS selected_model_id VARCHAR(100);
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS settings_revision BIGINT DEFAULT 0;
UPDATE chat_sessions SET settings_revision=0 WHERE settings_revision IS NULL;
ALTER TABLE chat_sessions ALTER COLUMN settings_revision SET DEFAULT 0;
ALTER TABLE chat_sessions ALTER COLUMN settings_revision SET NOT NULL;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS model_id VARCHAR(100);
COMMIT;
