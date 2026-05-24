CREATE TABLE IF NOT EXISTS story_polls (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_username VARCHAR(255) NOT NULL,
    poll_answer TEXT,
    answered_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, creator_username, answered_at)
);

CREATE TABLE IF NOT EXISTS story_quizzes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_username VARCHAR(255) NOT NULL,
    quiz_answer TEXT,
    answered_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, creator_username, answered_at)
);

CREATE TABLE IF NOT EXISTS story_questions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_username VARCHAR(255) NOT NULL,
    responded_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, creator_username, responded_at)
);

CREATE TABLE IF NOT EXISTS story_emoji_sliders (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_username VARCHAR(255) NOT NULL,
    slider_value DECIMAL(10,6),
    responded_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, creator_username, responded_at)
);

CREATE TABLE IF NOT EXISTS story_reactions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_username VARCHAR(255) NOT NULL,
    responded_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, creator_username, responded_at)
);
