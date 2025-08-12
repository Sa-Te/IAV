CREATE TABLE media_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    uri TEXT NOT NULL,
    caption TEXT,
    taken_at TIMESTAMPTZ NOT NULL
);