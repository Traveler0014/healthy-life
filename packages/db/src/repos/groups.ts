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

/** 列出所有群（按创建时间排序）。 */
export function listGroups(db: Db): Group[] {
  const rows = db.prepare(`SELECT * FROM groups ORDER BY created_at`).all() as GroupRow[];
  return rows.map(toGroup);
}

/** 更新群设置（name / timezone / visibility）。v1 不轮换 inviteCode。 */
export function updateGroup(
  db: Db,
  id: string,
  patch: Partial<Pick<Group, 'name' | 'timezone' | 'visibility'>>,
): Group | undefined {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };
  if (patch.name !== undefined) {
    fields.push('name = @name');
    params.name = patch.name;
  }
  if (patch.timezone !== undefined) {
    fields.push('timezone = @timezone');
    params.timezone = patch.timezone;
  }
  if (patch.visibility !== undefined) {
    fields.push('visibility = @visibility');
    params.visibility = patch.visibility;
  }
  if (fields.length === 0) return getGroupById(db, id);
  db.prepare(`UPDATE groups SET ${fields.join(', ')} WHERE id = @id`).run(params);
  return getGroupById(db, id);
}
