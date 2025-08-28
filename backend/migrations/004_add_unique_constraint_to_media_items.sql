ALTER TABLE media_items
ADD CONSTRAINT unique_user_uri UNIQUE (user_id, uri);
