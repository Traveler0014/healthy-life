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
 *   时间按打卡那一刻的设备时区显示，「今天/昨天/前天/N天前」按成员当地时区计算。
 */
export function boardRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.get('/board', (c) => {
    const member = c.get('member');
    const group = getGroupById(deps.db, member.groupId);
    if (!group) return c.json({ error: 'group not found' }, 404);

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
        const nowWc = wallClock(tz, now);
        const today = `${nowWc.year}-${pad(nowWc.month)}-${pad(nowWc.day)}`;
        const lbl = dayLabel(ciDate, today, ciWc.hour);
        lastCheckinDayLabel = lbl.label;
        // 始终带上打卡的墙上日期（'M-D'）：跨时区时前端显示「8-18 23:50 · GMT+9」这种
        // 绝对日期，避免「今天/昨天」这类相对标签被不同时区的查看者误读（GMT+9 的成员
        // 已进入次日，GMT+8 的查看者还停在当天，看到「昨天」会误以为隔了一整天）。
        lastCheckinDate = lbl.monthDay;
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
