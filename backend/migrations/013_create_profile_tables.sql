CREATE TABLE IF NOT EXISTS user_profile (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    email VARCHAR(255),
    phone_number VARCHAR(50),
    username VARCHAR(255),
    bio TEXT,
    gender VARCHAR(50),
    date_of_birth DATE,
    profile_photo_uri TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profile_changes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field_changed VARCHAR(255) NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS profile_photos (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_uri TEXT NOT NULL,
    set_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, photo_uri)
);

CREATE TABLE IF NOT EXISTS archived_posts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uri TEXT NOT NULL,
    caption TEXT,
    taken_at TIMESTAMP,
    UNIQUE(user_id, uri)
);
