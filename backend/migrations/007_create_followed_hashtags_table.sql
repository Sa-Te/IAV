
CREATE TABLE followed_hashtags (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    timestamp TIMESTAMPTZ,
    UNIQUE(user_id, name)
);