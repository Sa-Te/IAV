CREATE TABLE IF NOT EXISTS saved_media (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_username VARCHAR(255),
    post_url TEXT NOT NULL,
    saved_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, post_url)
);

CREATE TABLE IF NOT EXISTS saved_collections (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collection_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(user_id, collection_name)
);

CREATE TABLE IF NOT EXISTS saved_collection_items (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collection_name VARCHAR(255) NOT NULL,
    item_url TEXT NOT NULL,
    creator_username VARCHAR(255),
    added_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, item_url)
);
