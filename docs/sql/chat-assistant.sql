-- Review and apply on a backed-up database. Not executed by this change.
-- users, tour_schedules and bookings must already exist.
BEGIN;
CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    secret_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    busy_until TIMESTAMP WITH TIME ZONE,
    next_turn_at TIMESTAMP WITH TIME ZONE,
    turn BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS chat_booking_drafts (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    schedule_id BIGINT NOT NULL REFERENCES tour_schedules(id),
    people INTEGER NOT NULL CHECK (people BETWEEN 1 AND 50),
    unit_price NUMERIC(38,2),
    departure_date DATE,
    return_date DATE,
    tour_updated_at TIMESTAMP,
    pickup_at TIMESTAMP,
    pickup_point VARCHAR(500),
    expires_at TIMESTAMP WITH TIME ZONE,
    booking_id BIGINT UNIQUE REFERENCES bookings(id),
    confirmation_hash VARCHAR(64)
);
COMMIT;
