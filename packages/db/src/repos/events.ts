import type { Db } from '../client';
import { randomUUID } from 'node:crypto';
import type { Event } from '@healthy-life/shared';

interface EventRow {
  id: string;
  member_id: string;
  type: string;
  date: string;
  occurred_at: string;
  payload: string | null;
  created_at: string;
}

function toEvent(r: EventRow): Event {
  return {
    id: r.id,
    memberId: r.member_id,
    type: r.type,
    date: r.date,
    occurredAt: r.occurred_at,
    payload: r.payload,
    createdAt: r.created_at,
  };
}

/**
 * 追加一条原始事件（不做去重——原始数据完整保留，供后续迭代）。
 * `type` 为开放字符串；`payload` 会被 JSON.stringify 存储。
 */
export function recordEvent(
  db: Db,
  input: { memberId: string; type: string; date: string; occurredAt: string; payload?: unknown },
): Event {
  const event: Event = {
    id: randomUUID(),
    memberId: input.memberId,
    type: input.type,
    date: input.date,
    occurredAt: input.occurredAt,
    payload: input.payload !== undefined ? JSON.stringify(input.payload) : null,
    createdAt: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO events (id, member_id, type, date, occurred_at, payload, created_at)
     VALUES (@id, @memberId, @type, @date, @occurredAt, @payload, @createdAt)`,
  ).run(event);
  return event;
}

export function listEventsForMember(db: Db, memberId: string, from?: string, to?: string): Event[] {
  const rows = db
    .prepare(
      `SELECT * FROM events
       WHERE member_id = ? AND (? IS NULL OR date >= ?) AND (? IS NULL OR date <= ?)
       ORDER BY occurred_at`,
    )
    .all(memberId, from ?? null, from ?? null, to ?? null, to ?? null) as EventRow[];
  return rows.map(toEvent);
}

export function hasEvent(db: Db, memberId: string, type: string, date: string): boolean {
  const row = db
    .prepare(`SELECT 1 FROM events WHERE member_id = ? AND type = ? AND date = ? LIMIT 1`)
    .get(memberId, type, date);
  return row !== undefined;
}

/** 成员某类型事件的最新一条（按 occurred_at），无记录返回 undefined。 */
export function getLatestEvent(db: Db, memberId: string, type: string): Event | undefined {
  const row = db
    .prepare(`SELECT * FROM events WHERE member_id = ? AND type = ? ORDER BY occurred_at DESC LIMIT 1`)
    .get(memberId, type) as EventRow | undefined;
  return row ? toEvent(row) : undefined;
}
