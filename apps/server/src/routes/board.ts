import { Hono } from 'hono';
import {
  isNightHour,
  wallClock,
  SLEEP_DURATION_HOURS,
  type Checkin,
  type WallClock,
} from '@healthy-life/shared';
import { getGroupById, listCheckinsForMember, listMembers } from '@healthy-life/db';
import type { AppDeps, Env } from '../types';

const pad = (n: number): string => String(n).padStart(2, '0');

function formatHm(wc: WallClock): string {
  return `${pad(wc.hour)}:${pad(wc.minute)}`;
}

export type BoardStatus = 'sleeping' | 'reversed' | 'not-slept' | 'awake';

/**
 * 早睡榜（跨时区 + 睡眠状态）：
 * - sleeping（已打卡）：最新打卡后 SLEEP_DURATION_HOURS 内，且打卡时间在夜间
 * - reversed（昼夜颠倒）：最新打卡后仍在睡，但打卡时间在白天
 * - not-slept（还没睡）：未在睡，且当前处于夜间（20:00-05:00）
 * - awake（醒着）：未在睡，且当前处于白天
 */
export function boardRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.get('/board', (c) => {
    const member = c.get('member');
    const group = getGroupById(deps.db, member.groupId);
    if (!group) return c.json({ error: 'group not found' }, 404);

    const now = new Date();
    const members = listMembers(deps.db, group.id);

    const entries = members.map((m) => {
      const tz = m.lastTimezone || group.timezone;

      // 最新一次打卡（按绝对时间）
      let latest: Checkin | undefined;
      for (const ci of listCheckinsForMember(deps.db, m.id)) {
        if (!latest || ci.checkedInAt > latest.checkedInAt) latest = ci;
      }

      const nowIsNight = isNightHour(wallClock(tz, now).hour);
      let status: BoardStatus = nowIsNight ? 'not-slept' : 'awake';
      let checkedInAtLocal: string | undefined;
      let checkedInAt: string | undefined;
      let customLabel: string | null | undefined;

      if (latest) {
        const sleepUntil =
          new Date(latest.checkedInAt).getTime() + SLEEP_DURATION_HOURS * 3600 * 1000;
        if (now.getTime() < sleepUntil) {
          const ciWc = wallClock(latest.timezone || tz, new Date(latest.checkedInAt));
          status = isNightHour(ciWc.hour) ? 'sleeping' : 'reversed';
          checkedInAtLocal = formatHm(ciWc);
          checkedInAt = latest.checkedInAt;
          if (status === 'reversed') customLabel = latest.customLabel;
        }
      }

      return {
        memberId: m.id,
        nickname: m.nickname,
        emoji: m.emoji,
        status,
        timezone: tz,
        checkedInAt,
        checkedInAtLocal,
        customLabel,
      };
    });

    return c.json({ visibility: group.visibility, members: entries });
  });

  return router;
}
