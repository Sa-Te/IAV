CREATE TABLE IF NOT EXISTS post_comments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_owner_username VARCHAR(255),
    comment_text TEXT NOT NULL,
    commented_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, post_owner_username, commented_at)
);

CREATE TABLE IF NOT EXISTS reel_comments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reel_owner_username VARCHAR(255),
    comment_text TEXT NOT NULL,
    commented_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, reel_owner_username, commented_at)
);
