import type { Database } from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { Checkin } from '@healthy-life/shared';

interface CheckinRow {
  id: string;
  member_id: string;
  date: string;
  checked_in_at: string;
  created_at: string;
  updated_at: string;
}

function toCheckin(r: CheckinRow): Checkin {
  return {
    id: r.id,
    memberId: r.member_id,
    date: r.date,
    checkedInAt: r.checked_in_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** 幂等写入：同一成员同一打卡日只有一条，重复调用更新打卡时间。 */
export function upsertCheckin(
  db: Database.Database,
  input: { memberId: string; date: string; checkedInAt: string },
): Checkin {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO checkins (id, member_id, date, checked_in_at, created_at, updated_at)
     VALUES (@id, @memberId, @date, @checkedInAt, @createdAt, @updatedAt)
     ON CONFLICT (member_id, date) DO UPDATE SET
       checked_in_at = excluded.checked_in_at,
       updated_at = excluded.updated_at`,
  ).run({
    id: randomUUID(),
    memberId: input.memberId,
    date: input.date,
    checkedInAt: input.checkedInAt,
    createdAt: now,
    updatedAt: now,
  });
  return getCheckin(db, input.memberId, input.date)!;
}

export function getCheckin(db: Database.Database, memberId: string, date: string): Checkin | undefined {
  const row = db.prepare(`SELECT * FROM checkins WHERE member_id = ? AND date = ?`).get(
    memberId,
    date,
  ) as CheckinRow | undefined;
  return row ? toCheckin(row) : undefined;
}

export function listCheckinsForMember(
  db: Database.Database,
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
  db: Database.Database,
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
