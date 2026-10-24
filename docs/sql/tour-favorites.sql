-- Apply manually after reviewing the target database. No existing rows are changed.
BEGIN;
CREATE TABLE IF NOT EXISTS tour_favorites (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tour_id BIGINT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, tour_id)
);
CREATE INDEX IF NOT EXISTS idx_tour_favorites_owner_created ON tour_favorites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tour_favorites_tour ON tour_favorites(tour_id);
COMMIT;
