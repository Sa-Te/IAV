CREATE TABLE IF NOT EXISTS message_conversations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id VARCHAR(500) NOT NULL,
    participants TEXT NOT NULL,
    thread_type VARCHAR(50),
    UNIQUE(user_id, conversation_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id VARCHAR(500) NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    content TEXT,
    sent_at TIMESTAMP NOT NULL
);
