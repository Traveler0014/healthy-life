import cron from 'node-cron';
import type { JobDeps } from './types';
import { runReminder } from './tasks/reminder';
import { runReport } from './tasks/report';
import { runPromptBundleUpdate } from './tasks/promptBundle';

function toCron(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return `${m} ${h} * * *`;
}

export function registerTasks(deps: JobDeps): void {
  cron.schedule(toCron(deps.config.reminderTime), () => {
    runReminder(deps).catch((err) => console.error('[jobs] reminder task failed:', err));
  });
  cron.schedule(toCron(deps.config.reportTime), () => {
    runReport(deps).catch((err) => console.error('[jobs] report task failed:', err));
  });
  // 题库自动更新：每天 03:10（群时区），未配置 PROMPT_BUNDLE_URL 则跳过
  cron.schedule('10 3 * * *', () => {
    runPromptBundleUpdate(deps).catch((err) => console.error('[jobs] prompt bundle task failed:', err));
  });
  console.log(
    `[jobs] scheduled: reminder=${deps.config.reminderTime} report=${deps.config.reportTime} promptBundle=03:10 (tz=${deps.config.timezone})`,
  );
}
