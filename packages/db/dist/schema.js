"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEMA_V1 = void 0;
exports.SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS groups (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  timezone    TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  visibility  TEXT NOT NULL DEFAULT 'presence' CHECK (visibility IN ('exact','presence')),
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id             TEXT PRIMARY KEY,
  group_id       TEXT NOT NULL REFERENCES groups(id),
  nickname       TEXT NOT NULL,
  emoji          TEXT NOT NULL DEFAULT '😴',
  target_bedtime TEXT NOT NULL DEFAULT '23:00',
  token_hash     TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_members_group ON members(group_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_token_hash ON members(token_hash);

CREATE TABLE IF NOT EXISTS checkins (
  id            TEXT PRIMARY KEY,
  member_id     TEXT NOT NULL REFERENCES members(id),
  date          TEXT NOT NULL,
  checked_in_at TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  UNIQUE (member_id, date)
);
CREATE INDEX IF NOT EXISTS idx_checkins_member_date ON checkins(member_id, date);
`;
//# sourceMappingURL=schema.js.map