import { wallClock } from './day';
import { DEFAULT_DAY_BOUNDARY_HOUR } from './constants';

export type NightOutcome = 'early' | 'late' | 'missing';

const pad = (n: number): string => String(n).padStart(2, '0');

/** 理想睡眠时段判定：20:00（含）至次日 05:00（不含）视为「夜间」 */
export function isNightHour(hour: number): boolean {
  return hour >= 20 || hour < 5;
}

/**
 * 判定某一晚的结果：早睡 / 晚睡 / 无记录。
 * - 无记录（没打卡）→ missing
 * - 有记录：墙上时钟 ≤ 目标就寝时间 → early，否则 late
 * - 凌晨（0 点至日切边界）打卡 → 一律 late（熬夜/极晚睡，不算早睡）
 *
 * 目标就寝时间 targetBedtime 为 'HH:mm'（本地时间锚点），比较用字符串即可（已补零）。
 */
export function classifyNight(opts: {
  checkedInAt?: string | null;
  targetBedtime: string;
  timezone: string;
}): NightOutcome {
  if (!opts.checkedInAt) return 'missing';
  const wc = wallClock(opts.timezone, new Date(opts.checkedInAt));
  if (wc.hour < DEFAULT_DAY_BOUNDARY_HOUR) return 'late';
  const hm = `${pad(wc.hour)}:${pad(wc.minute)}`;
  return hm <= opts.targetBedtime ? 'early' : 'late';
}
