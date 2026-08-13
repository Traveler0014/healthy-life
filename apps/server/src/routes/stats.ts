import { Hono } from 'hono';
import { classifyNight } from '@healthy-life/shared';
import { getGroupById, listCheckinsForMember } from '@healthy-life/db';
import type { AppDeps, Env } from '../types';

/**
 * 我的累计早睡天数 + 早睡占比（early / (early + late)）。
 * 注意：绝不返回 streak（连续天数），见 docs/05-mechanics.md。
 */
export function statsRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.get('/stats', (c) => {
    const member = c.get('member');
    const group = getGroupById(deps.db, member.groupId);
    if (!group) return c.json({ error: 'group not found' }, 404);

    const checkins = listCheckinsForMember(deps.db, member.id);

    let earlyDays = 0;
    let lateDays = 0;
    for (const ci of checkins) {
      const outcome = classifyNight({
        checkedInAt: ci.checkedInAt,
        targetBedtime: member.targetBedtime,
        timezone: ci.timezone,
      });
      if (outcome === 'early') earlyDays += 1;
      else if (outcome === 'late') lateDays += 1;
    }

    const recordedNights = earlyDays + lateDays;
    const earlyRate = recordedNights === 0 ? 0 : earlyDays / recordedNights;

    return c.json({ earlyDays, lateDays, earlyRate });
  });

  return router;
}
