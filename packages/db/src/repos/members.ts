import type { Database } from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { Member, Role } from '@healthy-life/shared';

interface MemberRow {
  id: string;
  group_id: string;
  nickname: string;
  emoji: string;
  target_bedtime: string;
  token_hash: string;
  role: Role;
  status: string;
  created_at: string;
}

function toMember(r: MemberRow): Member {
  return {
    id: r.id,
    groupId: r.group_id,
    nickname: r.nickname,
    emoji: r.emoji,
    targetBedtime: r.target_bedtime,
    tokenHash: r.token_hash,
    role: r.role,
    status: r.status as Member['status'],
    createdAt: r.created_at,
  };
}

export function createMember(
  db: Database.Database,
  input: {
    groupId: string;
    nickname: string;
    emoji?: string;
    targetBedtime?: string;
    tokenHash: string;
    role?: Role;
  },
): Member {
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO members (id, group_id, nickname, emoji, target_bedtime, token_hash, role, status, created_at)
     VALUES (@id, @groupId, @nickname, @emoji, @targetBedtime, @tokenHash, @role, 'active', @createdAt)`,
  ).run({
    id: randomUUID(),
    groupId: input.groupId,
    nickname: input.nickname,
    emoji: input.emoji ?? '😴',
    targetBedtime: input.targetBedtime ?? '23:00',
    tokenHash: input.tokenHash,
    role: input.role ?? 'member',
    createdAt,
  });
  return getMemberByTokenHash(db, input.tokenHash)!;
}

export function getMemberById(db: Database.Database, id: string): Member | undefined {
  const row = db.prepare(`SELECT * FROM members WHERE id = ?`).get(id) as MemberRow | undefined;
  return row ? toMember(row) : undefined;
}

export function getMemberByTokenHash(db: Database.Database, tokenHash: string): Member | undefined {
  const row = db.prepare(`SELECT * FROM members WHERE token_hash = ?`).get(tokenHash) as
    | MemberRow
    | undefined;
  return row ? toMember(row) : undefined;
}

export function listMembers(db: Database.Database, groupId: string): Member[] {
  const rows = db.prepare(`SELECT * FROM members WHERE group_id = ? ORDER BY created_at`).all(groupId) as
    MemberRow[];
  return rows.map(toMember);
}

export function updateMember(
  db: Database.Database,
  id: string,
  patch: Partial<Pick<Member, 'nickname' | 'emoji' | 'targetBedtime' | 'role' | 'status'>>,
): Member | undefined {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };
  if (patch.nickname !== undefined) {
    fields.push('nickname = @nickname');
    params.nickname = patch.nickname;
  }
  if (patch.emoji !== undefined) {
    fields.push('emoji = @emoji');
    params.emoji = patch.emoji;
  }
  if (patch.targetBedtime !== undefined) {
    fields.push('target_bedtime = @targetBedtime');
    params.targetBedtime = patch.targetBedtime;
  }
  if (patch.role !== undefined) {
    fields.push('role = @role');
    params.role = patch.role;
  }
  if (patch.status !== undefined) {
    fields.push('status = @status');
    params.status = patch.status;
  }
  if (fields.length === 0) return getMemberById(db, id);
  db.prepare(`UPDATE members SET ${fields.join(', ')} WHERE id = @id`).run(params);
  return getMemberById(db, id);
}
