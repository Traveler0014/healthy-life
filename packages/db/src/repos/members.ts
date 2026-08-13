import type { Db } from '../client';
import { randomUUID } from 'node:crypto';
import { generateNotifyTopic, type Member, type Role } from '@healthy-life/shared';

interface MemberRow {
  id: string;
  group_id: string;
  nickname: string;
  emoji: string;
  target_bedtime: string;
  token_hash: string;
  password_hash: string;
  password_salt: string;
  last_timezone: string;
  notify_topic: string;
  notify_enabled: number;
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
    passwordHash: r.password_hash,
    passwordSalt: r.password_salt,
    lastTimezone: r.last_timezone,
    notifyTopic: r.notify_topic,
    notifyEnabled: Boolean(r.notify_enabled),
    role: r.role,
    status: r.status as Member['status'],
    createdAt: r.created_at,
  };
}

export function createMember(
  db: Db,
  input: {
    groupId: string;
    nickname: string;
    emoji?: string;
    targetBedtime?: string;
    tokenHash: string;
    passwordHash: string;
    passwordSalt: string;
    lastTimezone?: string;
    role?: Role;
  },
): Member {
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO members (id, group_id, nickname, emoji, target_bedtime, token_hash, password_hash, password_salt, last_timezone, notify_topic, notify_enabled, role, status, created_at)
     VALUES (@id, @groupId, @nickname, @emoji, @targetBedtime, @tokenHash, @passwordHash, @passwordSalt, @lastTimezone, @notifyTopic, @notifyEnabled, @role, 'active', @createdAt)`,
  ).run({
    id: randomUUID(),
    groupId: input.groupId,
    nickname: input.nickname,
    emoji: input.emoji ?? '😴',
    targetBedtime: input.targetBedtime ?? '23:00',
    tokenHash: input.tokenHash,
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
    lastTimezone: input.lastTimezone ?? 'Asia/Shanghai',
    notifyTopic: generateNotifyTopic(),
    notifyEnabled: 1,
    role: input.role ?? 'member',
    createdAt,
  });
  return getMemberByTokenHash(db, input.tokenHash)!;
}

export function getMemberById(db: Db, id: string): Member | undefined {
  const row = db.prepare(`SELECT * FROM members WHERE id = ?`).get(id) as MemberRow | undefined;
  return row ? toMember(row) : undefined;
}

export function getMemberByTokenHash(db: Db, tokenHash: string): Member | undefined {
  const row = db.prepare(`SELECT * FROM members WHERE token_hash = ?`).get(tokenHash) as
    | MemberRow
    | undefined;
  return row ? toMember(row) : undefined;
}

export function getMemberByNickname(db: Db, groupId: string, nickname: string): Member | undefined {
  const row = db.prepare(`SELECT * FROM members WHERE group_id = ? AND nickname = ?`).get(
    groupId,
    nickname,
  ) as MemberRow | undefined;
  return row ? toMember(row) : undefined;
}

/** 重设成员口令（口令变了，派生链接自动轮换） */
export function updateMemberPassword(
  db: Db,
  id: string,
  input: { passwordHash: string; passwordSalt: string; tokenHash: string },
): Member | undefined {
  db.prepare(
    `UPDATE members SET password_hash = @passwordHash, password_salt = @passwordSalt, token_hash = @tokenHash WHERE id = @id`,
  ).run({ id, ...input });
  return getMemberById(db, id);
}

/** 删除成员（连带其打卡记录与事件） */
export function deleteMember(db: Db, id: string): void {
  db.prepare(`DELETE FROM checkins WHERE member_id = ?`).run(id);
  db.prepare(`DELETE FROM events WHERE member_id = ?`).run(id);
  db.prepare(`DELETE FROM members WHERE id = ?`).run(id);
}

export function listMembers(db: Db, groupId: string): Member[] {
  const rows = db.prepare(`SELECT * FROM members WHERE group_id = ? ORDER BY created_at`).all(groupId) as
    MemberRow[];
  return rows.map(toMember);
}

export function updateMember(
  db: Db,
  id: string,
  patch: Partial<
    Pick<Member, 'nickname' | 'emoji' | 'targetBedtime' | 'lastTimezone' | 'notifyEnabled' | 'role' | 'status'>
  >,
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
  if (patch.lastTimezone !== undefined) {
    fields.push('last_timezone = @lastTimezone');
    params.lastTimezone = patch.lastTimezone;
  }
  if (patch.notifyEnabled !== undefined) {
    fields.push('notify_enabled = @notifyEnabled');
    params.notifyEnabled = patch.notifyEnabled ? 1 : 0;
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
