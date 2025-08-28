
CREATE TABLE IF NOT EXISTS connections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    connection_type TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL
);

ALTER TABLE connections
ADD CONSTRAINT unique_user_connection UNIQUE (user_id, username, connection_type);