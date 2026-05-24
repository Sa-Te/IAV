CREATE TABLE IF NOT EXISTS ai_interests (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interest_description TEXT NOT NULL,
    detected_at TIMESTAMP,
    UNIQUE(user_id, interest_description)
);

CREATE TABLE IF NOT EXISTS user_topics (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_name VARCHAR(255) NOT NULL,
    UNIQUE(user_id, topic_name)
);

CREATE TABLE IF NOT EXISTS inferred_location (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    city_name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS locations_of_interest (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_name VARCHAR(500) NOT NULL,
    UNIQUE(user_id, location_name)
);

CREATE TABLE IF NOT EXISTS off_meta_activity (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_name VARCHAR(500) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    event_id BIGINT,
    event_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS link_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    page_title TEXT,
    visited_at TIMESTAMP NOT NULL
);
