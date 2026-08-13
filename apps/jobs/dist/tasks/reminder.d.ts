import type { JobDeps } from '../types';
/**
 * 每晚睡前提醒。Phase 1 实现：
 * - 按每位成员的个人目标就寝时间，在目标前若干分钟推送提醒（ntfy）
 * - 也可触发「今晚谁还没打卡」的温和群提醒（不含指责）
 * 见 docs/04-ntfy.md、docs/05-mechanics.md。
 */
export declare function runReminder(deps: JobDeps): void;
//# sourceMappingURL=reminder.d.ts.map