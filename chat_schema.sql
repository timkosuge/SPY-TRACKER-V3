-- Chat enhancements schema — run after chat_schema.sql
-- wrangler d1 execute spy-chat --remote --file=chat_schema_v2.sql

-- Reply threading: store which message this replies to
ALTER TABLE chat_messages ADD COLUMN reply_to_id INTEGER REFERENCES chat_messages(id);
ALTER TABLE chat_messages ADD COLUMN reply_to_username TEXT;
ALTER TABLE chat_messages ADD COLUMN reply_to_preview TEXT;

-- Reactions table
CREATE TABLE IF NOT EXISTS chat_reactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id  INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  username    TEXT    NOT NULL,
  emoji       TEXT    NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_reactions_msg ON chat_reactions(message_id);

-- Pinned messages
CREATE TABLE IF NOT EXISTS chat_pins (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id  INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  pinned_by   TEXT    NOT NULL,
  pinned_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Admin bans
CREATE TABLE IF NOT EXISTS chat_bans (
  user_id     INTEGER PRIMARY KEY REFERENCES chat_users(id) ON DELETE CASCADE,
  banned_by   TEXT    NOT NULL,
  reason      TEXT,
  banned_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Online presence heartbeats
CREATE TABLE IF NOT EXISTS chat_presence (
  user_id     INTEGER PRIMARY KEY REFERENCES chat_users(id) ON DELETE CASCADE,
  username    TEXT    NOT NULL,
  last_seen   INTEGER NOT NULL DEFAULT (unixepoch())
);
