import { Hono } from 'hono';
import {
  classifyNight,
  currentCheckinDay,
  isNightHour,
  wallClock,
  type WallClock,
} from '@healthy-life/shared';
import { getCheckin, getGroupById, setCheckinCustomLabel, updateMember, upsertCheckin } from '@healthy-life/db';
import { earlyCheckinMessage, lateCheckinMessage } from '@healthy-life/notify';
import type { AppDeps, Env } from '../types';

const pad = (n: number): string => String(n).padStart(2, '0');

function formatHm(wc: WallClock): string {
  return `${pad(wc.hour)}:${pad(wc.minute)}`;
}

function minutesBetween(targetBedtime: string, wc: WallClock): number {
  const [th, tm] = targetBedtime.split(':').map(Number);
  return wc.hour * 60 + wc.minute - (th * 60 + tm);
}

/**
 * 打卡（记录当前时刻，幂等更新）与今日状态查询。
 * 时区以「打卡设备的当地时区」为准（前端上报 IANA 时区），跨时区/旅行都正确。
 */
export function checkinRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.post('/checkin', async (c) => {
    const member = c.get('member');
    const group = getGroupById(deps.db, member.groupId);
    if (!group) return c.json({ error: 'group not found' }, 404);

    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const timezone =
      typeof body?.timezone === 'string' && body.timezone.trim() !== ''
        ? body.timezone.trim()
        : member.lastTimezone || group.timezone;

    const now = new Date();
    const date = currentCheckinDay(timezone, now);
    const checkedInAt = now.toISOString();

    const checkin = upsertCheckin(deps.db, {
      memberId: member.id,
      date,
      checkedInAt,
      timezone,
    });

    // 更新成员「最近时区」，供打卡墙等算「今天」用（旅行后自动更新）
    if (timezone !== member.lastTimezone) {
      updateMember(deps.db, member.id, { lastTimezone: timezone });
    }

    const outcome = classifyNight({
      checkedInAt,
      targetBedtime: member.targetBedtime,
      timezone,
    });

    const wc = wallClock(timezone, now);
    const time = formatHm(wc);
    const message =
      outcome === 'early'
        ? earlyCheckinMessage(member.nickname, time)
        : lateCheckinMessage(member.nickname, time, Math.max(0, minutesBetween(member.targetBedtime, wc)));

    // 白天打卡（05:00-20:00）→ 前端弹窗让用户自选状态标签
    const isDaytimeCheckin = !isNightHour(wc.hour);

    return c.json({ checkin, outcome, message, isDaytimeCheckin });
  });

  router.get('/checkin/today', (c) => {
    const member = c.get('member');
    const group = getGroupById(deps.db, member.groupId);
    if (!group) return c.json({ error: 'group not found' }, 404);

    const timezone = member.lastTimezone || group.timezone;
    const date = currentCheckinDay(timezone);
    const checkin = getCheckin(deps.db, member.id, date);
    const outcome = classifyNight({
      checkedInAt: checkin?.checkedInAt ?? null,
      targetBedtime: member.targetBedtime,
      timezone: checkin?.timezone ?? timezone,
    });

    return c.json({ date, checkedIn: Boolean(checkin), checkin: checkin ?? null, outcome });
  });

  // 设置白天打卡的自定义状态标签
  router.patch('/checkin/label', async (c) => {
    const member = c.get('member');
    const group = getGroupById(deps.db, member.groupId);
    if (!group) return c.json({ error: 'group not found' }, 404);

    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const date =
      typeof body?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : '';
    if (!date) return c.json({ error: 'date is required (YYYY-MM-DD)' }, 400);

    const rawLabel = body?.label;
    const label =
      typeof rawLabel === 'string' && rawLabel.trim() !== '' ? rawLabel.trim().slice(0, 20) : null;

    const checkin = setCheckinCustomLabel(deps.db, member.id, date, label);
    if (!checkin) return c.json({ error: 'checkin not found' }, 404);

    return c.json({ checkin });
  });

  return router;
}
