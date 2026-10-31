CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_query VARCHAR(500) NOT NULL,
    search_type VARCHAR(50) NOT NULL,
    searched_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, search_query, search_type, searched_at)
);
