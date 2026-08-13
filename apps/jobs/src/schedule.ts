import cron from 'node-cron';
import type { JobDeps } from './types';
import { runReminder } from './tasks/reminder';
import { runReport } from './tasks/report';

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
  console.log(
    `[jobs] scheduled: reminder=${deps.config.reminderTime} report=${deps.config.reportTime} (tz=${deps.config.timezone})`,
  );
}
