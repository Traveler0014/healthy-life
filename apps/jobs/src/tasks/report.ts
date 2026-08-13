import type { JobDeps } from '../types';

/**
 * 次日晨报（早睡日报）。Phase 1 实现：
 * - 汇总昨晚：谁早睡、谁晚睡、连续早睡奖励揭示、进步（与自己上周比）
 * - 晚睡的人得到温和提醒，而非羞辱
 * - 无记录的人不纳入统计、不点名批评
 * 见 docs/05-mechanics.md。
 */
export function runReport(deps: JobDeps): void {
  console.log(`[jobs] report tick ${new Date().toISOString()} — TODO Phase 1`);
}
