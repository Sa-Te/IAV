CREATE TABLE IF NOT EXISTS login_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address VARCHAR(100),
    user_agent TEXT,
    language_code VARCHAR(10),
    logged_in_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS logout_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address VARCHAR(100),
    user_agent TEXT,
    logged_out_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS password_change_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    changed_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS signup_info (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    username_at_signup VARCHAR(255),
    email_at_signup VARCHAR(255),
    signup_ip VARCHAR(100),
    device_model VARCHAR(255),
    signed_up_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS privacy_changes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    privacy_status VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS account_status_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activation_type VARCHAR(50) NOT NULL,
    reason TEXT,
    changed_at TIMESTAMP NOT NULL
);
