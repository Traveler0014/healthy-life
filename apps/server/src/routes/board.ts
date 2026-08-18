import { Hono } from 'hono';
import {
  isNightHour,
  lastCheckinDayLabel as dayLabel,
  wallClock,
  SLEEP_DURATION_HOURS,
  type WallClock,
} from '@healthy-life/shared';
import { getGroupById, latestCheckinsForGroup, listMembers } from '@healthy-life/db';
import type { AppDeps, Env } from '../types';

const pad = (n: number): string => String(n).padStart(2, '0');

function formatHm(wc: WallClock): string {
  return `${pad(wc.hour)}:${pad(wc.minute)}`;
}

export type BoardStatus = 'sleeping' | 'reversed' | 'not-slept' | 'awake';

/**
 * 早睡榜（跨时区）：
 * - 实时状态（四态）：
 *   - sleeping（已打卡）：最新打卡后 SLEEP_DURATION_HOURS 内，且打卡时间在夜间
 *   - reversed（昼夜颠倒）：最新打卡后仍在睡，但打卡时间在白天
 *   - not-slept（还没睡）：未在睡，且当前处于夜间（20:00-05:00）
 *   - awake（醒着）：未在睡，且当前处于白天
 * - 附加信息「最近一次睡觉打卡」：始终返回（只要打过卡），供互相监督前一晚；
 *   时间按打卡那一刻的设备时区显示，「今天/昨天/前天/N天前」按查看者当地时区计算。
 */
export function boardRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.get('/board', (c) => {
    const member = c.get('member');
    const group = getGroupById(deps.db, member.groupId);
    if (!group) return c.json({ error: 'group not found' }, 404);

    // 查看者时区：相对标签「今天/昨天/明天」应相对查看者日历，而非成员日历。
    // 前端上报当前浏览器时区（?tz=），兜底成员最近一次打卡/加入时的时区。
    const viewerTzParam = c.req.query('tz');
    const viewerTz = viewerTzParam && viewerTzParam.trim() !== ''
      ? viewerTzParam.trim()
      : member.lastTimezone || group.timezone;

    const now = new Date();
    const members = listMembers(deps.db, group.id);
    const latestMap = latestCheckinsForGroup(deps.db, group.id);

    const entries = members.map((m) => {
      const tz = m.lastTimezone || group.timezone;
      const latest = latestMap.get(m.id);

      // —— 实时状态（四态）——
      const nowIsNight = isNightHour(wallClock(tz, now).hour);
      let status: BoardStatus = nowIsNight ? 'not-slept' : 'awake';
      let customLabel: string | null | undefined;

      if (latest) {
        const sleepUntil =
          new Date(latest.checkedInAt).getTime() + SLEEP_DURATION_HOURS * 3600 * 1000;
        if (now.getTime() < sleepUntil) {
          const ciWc = wallClock(latest.timezone || tz, new Date(latest.checkedInAt));
          status = isNightHour(ciWc.hour) ? 'sleeping' : 'reversed';
          if (status === 'reversed') customLabel = latest.customLabel;
        }
      }

      // —— 最近一次睡觉打卡（附加信息，始终返回）——
      let hasCheckedIn = false;
      let lastCheckinLocal: string | undefined;
      let lastCheckinTimezone: string | undefined;
      let lastCheckinDayLabel: string | undefined;
      let lastCheckinDate: string | undefined;

      if (latest) {
        hasCheckedIn = true;
        const ciWc = wallClock(latest.timezone || tz, new Date(latest.checkedInAt));
        lastCheckinLocal = formatHm(ciWc);
        lastCheckinTimezone = latest.timezone || tz;
        // 标签用「墙上日期」而非打卡日 date：凌晨 00:36 打卡应算「今天凌晨」而非「昨天」
        const ciDate = `${ciWc.year}-${pad(ciWc.month)}-${pad(ciWc.day)}`;
        const nowWc = wallClock(viewerTz, now);
        const today = `${nowWc.year}-${pad(nowWc.month)}-${pad(nowWc.day)}`;
        const lbl = dayLabel(ciDate, today, ciWc.hour);
        lastCheckinDayLabel = lbl.label;
        // 相对标签已按查看者时区算（见上），daysAgo 可负（「明天」）；仅久远记录附具体日期。
        lastCheckinDate = lbl.daysAgo >= 3 ? lbl.monthDay : undefined;
      }

      return {
        memberId: m.id,
        nickname: m.nickname,
        emoji: m.emoji,
        status,
        timezone: tz,
        customLabel,
        hasCheckedIn,
        lastCheckinLocal,
        lastCheckinTimezone,
        lastCheckinDayLabel,
        lastCheckinDate,
      };
    });

    return c.json({ visibility: group.visibility, members: entries });
  });

  return router;
}
