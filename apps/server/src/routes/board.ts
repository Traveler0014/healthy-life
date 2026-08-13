import { Hono } from 'hono';
import { currentCheckinDay, wallClock, type WallClock } from '@healthy-life/shared';
import { getCheckin, getGroupById, listMembers } from '@healthy-life/db';
import type { AppDeps, Env } from '../types';

const pad = (n: number): string => String(n).padStart(2, '0');

function formatHm(wc: WallClock): string {
  return `${pad(wc.hour)}:${pad(wc.minute)}`;
}

/**
 * 今日打卡墙（跨时区）：
 * - 每个成员用「自己的当前本地日」（lastTimezone）判断是否已打卡；
 * - 打卡时间按「该次打卡的时区」格式化，展示的是成员自己钟面上的时间。
 */
export function boardRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.get('/board', (c) => {
    const member = c.get('member');
    const group = getGroupById(deps.db, member.groupId);
    if (!group) return c.json({ error: 'group not found' }, 404);

    const members = listMembers(deps.db, group.id);

    const entries = members.map((m) => {
      const tz = m.lastTimezone || group.timezone;
      const today = currentCheckinDay(tz);
      const ci = getCheckin(deps.db, m.id, today);

      if (group.visibility === 'exact' && ci) {
        const wc = wallClock(ci.timezone || tz, new Date(ci.checkedInAt));
        return {
          memberId: m.id,
          nickname: m.nickname,
          emoji: m.emoji,
          checkedIn: true,
          timezone: tz,
          checkedInAt: ci.checkedInAt,
          checkedInAtLocal: formatHm(wc),
        };
      }

      return {
        memberId: m.id,
        nickname: m.nickname,
        emoji: m.emoji,
        checkedIn: Boolean(ci),
        timezone: tz,
      };
    });

    return c.json({ visibility: group.visibility, members: entries });
  });

  return router;
}
