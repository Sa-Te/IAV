
-- Table for advertisers using your information
CREATE TABLE ad_advertisers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    advertiser_name TEXT NOT NULL,
    UNIQUE(user_id, advertiser_name)
);

-- Table for topics/categories used to target you
CREATE TABLE ad_topics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_name TEXT NOT NULL,
    UNIQUE(user_id, topic_name)
);