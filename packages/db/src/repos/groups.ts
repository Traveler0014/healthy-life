import type { Db } from '../client';
import { randomUUID } from 'node:crypto';
import type { Group, GroupVisibility } from '@healthy-life/shared';

interface GroupRow {
  id: string;
  name: string;
  invite_code: string;
  timezone: string;
  visibility: GroupVisibility;
  created_at: string;
}

function toGroup(r: GroupRow): Group {
  return {
    id: r.id,
    name: r.name,
    inviteCode: r.invite_code,
    timezone: r.timezone,
    visibility: r.visibility,
    createdAt: r.created_at,
  };
}

export function createGroup(
  db: Db,
  input: { name: string; inviteCode: string; timezone?: string; visibility?: GroupVisibility },
): Group {
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO groups (id, name, invite_code, timezone, visibility, created_at)
     VALUES (@id, @name, @inviteCode, @timezone, @visibility, @createdAt)`,
  ).run({
    id: randomUUID(),
    name: input.name,
    inviteCode: input.inviteCode,
    timezone: input.timezone ?? 'Asia/Shanghai',
    visibility: input.visibility ?? 'presence',
    createdAt,
  });
  return getGroupByInviteCode(db, input.inviteCode)!;
}

export function getGroupById(db: Db, id: string): Group | undefined {
  const row = db.prepare(`SELECT * FROM groups WHERE id = ?`).get(id) as GroupRow | undefined;
  return row ? toGroup(row) : undefined;
}

export function getGroupByInviteCode(db: Db, inviteCode: string): Group | undefined {
  const row = db.prepare(`SELECT * FROM groups WHERE invite_code = ?`).get(inviteCode) as
    | GroupRow
    | undefined;
  return row ? toGroup(row) : undefined;
}
