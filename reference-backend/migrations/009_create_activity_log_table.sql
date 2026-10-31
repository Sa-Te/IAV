CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(255) NOT NULL,
    author VARCHAR(255), -- Author/Username, can be null
    timestamp TIMESTAMPTZ,
    details TEXT, -- For extra data like URLs
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- An index will make querying for a specific user's activity much faster.
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id_type ON activity_log (user_id, activity_type);
