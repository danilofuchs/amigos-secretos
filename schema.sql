CREATE TABLE IF NOT EXISTS raffles (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  payload TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS raffles_owner ON raffles(owner, created_at);
CREATE TABLE IF NOT EXISTS tickets (
  code TEXT PRIMARY KEY,
  raffle_id TEXT NOT NULL REFERENCES raffles(id),
  recipient TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ticket_opens (
  code TEXT PRIMARY KEY,
  opened_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS accounts (
  google_sub TEXT PRIMARY KEY,
  owner TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL
);
