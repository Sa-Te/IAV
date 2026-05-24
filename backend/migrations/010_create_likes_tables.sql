CREATE TABLE IF NOT EXISTS post_likes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_username VARCHAR(255) NOT NULL,
    post_url TEXT,
    liked_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, creator_username, liked_at)
);

CREATE TABLE IF NOT EXISTS comment_likes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_username VARCHAR(255) NOT NULL,
    post_url TEXT,
    liked_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, owner_username, liked_at)
);

CREATE TABLE IF NOT EXISTS story_likes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_username VARCHAR(255) NOT NULL,
    liked_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, creator_username, liked_at)
);
