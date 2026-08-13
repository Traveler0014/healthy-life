import { Hono } from 'hono';
import { currentCheckinDay } from '@healthy-life/shared';
import { getGroupById, recordEvent } from '@healthy-life/db';
import type { AppDeps, Env } from '../types';

/**
 * 原始事件记录端点（POST /api/v1/events，需鉴权）。
 * 事件类型为开放字符串；本次主要落 'visit_after_checkin'（打卡后再次访问）。
 * 服务端只追加、不去重——完整保留原始数据，供后续称号/失眠判定等迭代使用。
 */
export function eventRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.post('/events', async (c) => {
    const member = c.get('member');
    const group = getGroupById(deps.db, member.groupId);
    if (!group) return c.json({ error: 'group not found' }, 404);

    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const type = typeof body?.type === 'string' ? body.type.trim() : '';
    if (!type) return c.json({ error: 'type is required' }, 400);

    const event = recordEvent(deps.db, {
      memberId: member.id,
      type,
      date: currentCheckinDay(member.lastTimezone || group.timezone),
      occurredAt: new Date().toISOString(),
      payload: body?.payload,
    });

    return c.json({ event }, 201);
  });

  return router;
}
