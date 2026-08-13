import { currentCheckinDay, SYSTEM_GROUP_ID } from '@healthy-life/shared';
import { getCheckin, listGroups, listMembers } from '@healthy-life/db';
import { createNotifyClient, reminderMessage } from '@healthy-life/notify';
import type { JobDeps } from '../types';

/**
 * 每晚睡前提醒（Phase 1 简化版）：
 * - 在固定提醒时刻（config.reminderTime，如 22:30）对「今晚尚未打卡」的 active 成员
 *   推送一条温和提醒到 reminder topic。
 * - 个性化目标时间提醒留到 Phase 2，本任务不做。
 * - 日期判定按每个群自己的时区（group.timezone），与 server 写入 checkin.date 的口径一致。
 * 见 docs/04-ntfy.md、docs/05-mechanics.md。
 */
export async function runReminder(deps: JobDeps): Promise<void> {
  const { config, db } = deps;
  const notify = createNotifyClient(config.ntfyBaseUrl, config.ntfyToken);

  let sent = 0;
  for (const group of listGroups(db)) {
    if (group.id === SYSTEM_GROUP_ID) continue; // 跳过系统群
    const members = listMembers(db, group.id).filter((m) => m.status === 'active');

    for (const member of members) {
      // 每人自己的「今晚」：按各自最近时区算
      const today = currentCheckinDay(member.lastTimezone || group.timezone);
      if (getCheckin(db, member.id, today)) continue;

      await notify.publish(config.ntfyTopicReminder, reminderMessage(member.nickname, member.targetBedtime), {
        priority: 3,
      });
      sent += 1;
    }
  }

  console.log(`[jobs] reminder sent ${sent} reminder(s) at ${new Date().toISOString()}`);
}
