CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_agent TEXT,
    last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    setting_key VARCHAR(255) NOT NULL,
    setting_value TEXT,
    UNIQUE(user_id, setting_key)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(100),
    notification_type VARCHAR(255),
    preference_value VARCHAR(100),
    UNIQUE(user_id, channel, notification_type)
);
