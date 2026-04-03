-- SPY Tracker Chat Schema
-- Run once: wrangler d1 execute spy-chat --remote --file=chat_schema.sql

CREATE TABLE IF NOT EXISTS chat_users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password    TEXT    NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen   INTEGER
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  token       TEXT    PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  username    TEXT    NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  username    TEXT    NOT NULL,
  content     TEXT    NOT NULL,
  msg_type    TEXT    NOT NULL DEFAULT 'text',  -- 'text' | 'image' | 'gif' | 'video'
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_token   ON chat_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON chat_sessions(expires_at);
