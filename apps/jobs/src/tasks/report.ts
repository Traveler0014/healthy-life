import {
  addDays,
  classifyNight,
  computeStreak,
  currentCheckinDay,
  isStreakMilestone,
  wallClock,
  type WallClock,
} from '@healthy-life/shared';
import { getCheckin, listCheckinsForMember, listGroups, listMembers } from '@healthy-life/db';
import {
  createNotifyClient,
  earlyCheckinMessage,
  lateCheckinMessage,
  morningReportMessage,
  rewardMessage,
} from '@healthy-life/notify';
import type { JobDeps } from '../types';

const pad = (n: number): string => String(n).padStart(2, '0');

function formatHm(wc: WallClock): string {
  return `${pad(wc.hour)}:${pad(wc.minute)}`;
}

function minutesLate(targetBedtime: string, wc: WallClock): number {
  const [th, tm] = targetBedtime.split(':').map(Number);
  return wc.hour * 60 + wc.minute - (th * 60 + tm);
}

/**
 * 次日晨报（Phase 1）：结算「昨晚」。
 * - 昨晚日期 = currentCheckinDay(group.timezone) - 1（晨报在 08:00 触发，已过 05:00 日切边界）。
 * - 对每个 active 成员按昨晚打卡结果分类 early / late / missing。
 * - 隐藏连续奖励：昨晚为 early 的成员，取该成员所有 early 日期算连续早睡天数，
 *   仅当昨晚「刚好跨过」里程碑（7/21/30/66/100）时揭示奖牌，避免重复揭示。
 * 见 docs/05-mechanics.md §7。
 */
export async function runReport(deps: JobDeps): Promise<void> {
  const { config, db } = deps;
  const notify = createNotifyClient(config.ntfyBaseUrl, config.ntfyToken);

  const earlyLines: string[] = [];
  const lateLines: string[] = [];
  const rewardLines: string[] = [];
  let recorded = 0;
  let missing = 0;

  for (const group of listGroups(db)) {
    const yesterday = addDays(currentCheckinDay(group.timezone), -1);
    const members = listMembers(db, group.id).filter((m) => m.status === 'active');

    for (const member of members) {
      const yesterdayCheckin = getCheckin(db, member.id, yesterday);
      const outcome = classifyNight({
        checkedInAt: yesterdayCheckin?.checkedInAt ?? null,
        targetBedtime: member.targetBedtime,
        timezone: group.timezone,
      });

      if (outcome === 'early') {
        recorded += 1;
        const wc = wallClock(group.timezone, new Date(yesterdayCheckin!.checkedInAt));
        earlyLines.push(earlyCheckinMessage(member.nickname, formatHm(wc)));
      } else if (outcome === 'late') {
        recorded += 1;
        const wc = wallClock(group.timezone, new Date(yesterdayCheckin!.checkedInAt));
        lateLines.push(
          lateCheckinMessage(
            member.nickname,
            formatHm(wc),
            Math.max(0, minutesLate(member.targetBedtime, wc)),
          ),
        );
      } else {
        missing += 1;
      }

      // 隐藏奖励只与「昨晚是否跨过里程碑」绑定：昨晚必须是 early，才可能新跨里程碑。
      if (outcome === 'early') {
        const checkins = listCheckinsForMember(db, member.id);
        const earlyDates = checkins
          .filter(
            (c) =>
              classifyNight({
                checkedInAt: c.checkedInAt,
                targetBedtime: member.targetBedtime,
                timezone: group.timezone,
              }) === 'early',
          )
          .map((c) => c.date);

        const streak = computeStreak(earlyDates, yesterday).current;
        if (isStreakMilestone(streak)) {
          rewardLines.push(rewardMessage(member.nickname, `连续早睡 ${streak} 天`));
        }
      }
    }
  }

  const lines: string[] = [
    ...earlyLines,
    ...lateLines,
    ...rewardLines,
    `昨晚 ${recorded} 人记录、${missing} 人未记录。`,
  ];

  await notify.publish(config.ntfyTopicReport, morningReportMessage(lines), {
    priority: 3,
  });

  console.log(`[jobs] report sent at ${new Date().toISOString()} (recorded=${recorded}, missing=${missing})`);
}
