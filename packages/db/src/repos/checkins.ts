import type { Db } from '../client';
import { randomUUID } from 'node:crypto';
import type { Checkin } from '@healthy-life/shared';

interface CheckinRow {
  id: string;
  member_id: string;
  date: string;
  checked_in_at: string;
  timezone: string;
  custom_label: string | null;
  created_at: string;
  updated_at: string;
}

function toCheckin(r: CheckinRow): Checkin {
  return {
    id: r.id,
    memberId: r.member_id,
    date: r.date,
    checkedInAt: r.checked_in_at,
    timezone: r.timezone,
    customLabel: r.custom_label ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** 幂等写入：同一成员同一打卡日只有一条，重复调用更新打卡时间与时区。 */
export function upsertCheckin(
  db: Db,
  input: { memberId: string; date: string; checkedInAt: string; timezone?: string },
): Checkin {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO checkins (id, member_id, date, checked_in_at, timezone, created_at, updated_at)
     VALUES (@id, @memberId, @date, @checkedInAt, @timezone, @createdAt, @updatedAt)
     ON CONFLICT (member_id, date) DO UPDATE SET
       checked_in_at = excluded.checked_in_at,
       timezone = excluded.timezone,
       updated_at = excluded.updated_at`,
  ).run({
    id: randomUUID(),
    memberId: input.memberId,
    date: input.date,
    checkedInAt: input.checkedInAt,
    timezone: input.timezone ?? 'Asia/Shanghai',
    createdAt: now,
    updatedAt: now,
  });
  return getCheckin(db, input.memberId, input.date)!;
}

export function getCheckin(db: Db, memberId: string, date: string): Checkin | undefined {
  const row = db.prepare(`SELECT * FROM checkins WHERE member_id = ? AND date = ?`).get(
    memberId,
    date,
  ) as CheckinRow | undefined;
  return row ? toCheckin(row) : undefined;
}

/** 设置某次打卡的自定义状态标签（白天打卡用，null = 用默认） */
export function setCheckinCustomLabel(
  db: Db,
  memberId: string,
  date: string,
  label: string | null,
): Checkin | undefined {
  db.prepare(`UPDATE checkins SET custom_label = ? WHERE member_id = ? AND date = ?`).run(
    label,
    memberId,
    date,
  );
  return getCheckin(db, memberId, date);
}

export function listCheckinsForMember(
  db: Db,
  memberId: string,
  from?: string,
  to?: string,
): Checkin[] {
  const rows = db
    .prepare(
      `SELECT * FROM checkins
       WHERE member_id = ? AND (? IS NULL OR date >= ?) AND (? IS NULL OR date <= ?)
       ORDER BY date`,
    )
    .all(memberId, from ?? null, from ?? null, to ?? null, to ?? null) as CheckinRow[];
  return rows.map(toCheckin);
}

export function listCheckinsForGroup(
  db: Db,
  groupId: string,
  from?: string,
  to?: string,
): Checkin[] {
  const rows = db
    .prepare(
      `SELECT c.* FROM checkins c
       JOIN members m ON m.id = c.member_id
       WHERE m.group_id = ? AND (? IS NULL OR c.date >= ?) AND (? IS NULL OR c.date <= ?)
       ORDER BY c.date, c.checked_in_at`,
    )
    .all(groupId, from ?? null, from ?? null, to ?? null, to ?? null) as CheckinRow[];
  return rows.map(toCheckin);
}

/** 单个成员最近一次打卡（按绝对时间），无记录返回 undefined。 */
export function getLatestCheckin(db: Db, memberId: string): Checkin | undefined {
  const row = db
    .prepare(`SELECT * FROM checkins WHERE member_id = ? ORDER BY checked_in_at DESC LIMIT 1`)
    .get(memberId) as CheckinRow | undefined;
  return row ? toCheckin(row) : undefined;
}

/** 群内每个成员最近一次打卡（一条 SQL 批量取，避免 N+1），返回 memberId → Checkin。 */
export function latestCheckinsForGroup(db: Db, groupId: string): Map<string, Checkin> {
  const rows = db
    .prepare(
      `SELECT c.* FROM checkins c
       JOIN members m ON m.id = c.member_id
       WHERE m.group_id = @groupId
         AND c.checked_in_at = (
           SELECT MAX(c2.checked_in_at) FROM checkins c2 WHERE c2.member_id = c.member_id
         )`,
    )
    .all({ groupId }) as CheckinRow[];
  const map = new Map<string, Checkin>();
  for (const r of rows) {
    const ci = toCheckin(r);
    map.set(ci.memberId, ci);
  }
  return map;
}
