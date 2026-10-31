-- Remove duplicate messages (keep earliest id for each unique message)
DELETE FROM messages a
USING messages b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.conversation_id = b.conversation_id
  AND a.sender_name = b.sender_name
  AND a.sent_at = b.sent_at
  AND COALESCE(a.content, '') = COALESCE(b.content, '');

-- Unique index prevents future duplicates on re-upload
CREATE UNIQUE INDEX IF NOT EXISTS messages_dedup_idx
  ON messages (user_id, conversation_id, sender_name, sent_at, COALESCE(content, ''));

-- Remove duplicate activity_log rows (keep earliest id)
DELETE FROM activity_log a
USING activity_log b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.activity_type = b.activity_type
  AND COALESCE(a.author, '') = COALESCE(b.author, '')
  AND a.timestamp = b.timestamp;

-- Unique index prevents future duplicates on re-upload
CREATE UNIQUE INDEX IF NOT EXISTS activity_log_dedup_idx
  ON activity_log (user_id, activity_type, COALESCE(author, ''), timestamp);

-- Performance index for the ORDER BY timestamp DESC query
CREATE INDEX IF NOT EXISTS idx_activity_log_user_timestamp
  ON activity_log (user_id, timestamp DESC);
