import { DEFAULT_DAY_BOUNDARY_HOUR } from './constants';

export interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** 返回某一时刻在指定时区的「墙上时钟」 */
export function wallClock(tz: string, now: Date = new Date()): WallClock {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(now)) parts[p.type] = p.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** 在 'YYYY-MM-DD' 上加减天数（UTC 运算，避免时区/夏令时 bug） */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/**
 * 当前「打卡日」（YYYY-MM-DD）。
 * 规则：若墙上时钟的小时数 < 日切边界小时，则归入前一天。
 * 例如边界=5：凌晨 04:30 打卡仍算「昨晚」；05:30 起算「今天」。
 */
export function currentCheckinDay(
  tz: string,
  now: Date = new Date(),
  boundaryHour: number = DEFAULT_DAY_BOUNDARY_HOUR,
): string {
  const wc = wallClock(tz, now);
  const base = `${wc.year}-${pad(wc.month)}-${pad(wc.day)}`;
  return wc.hour < boundaryHour ? addDays(base, -1) : base;
}

/** 两个 'YYYY-MM-DD' 之间的天数差（to - from，UTC 运算，跨月/跨年正确） */
export function diffDays(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((b - a) / 86400000);
}

export interface CheckinDayLabel {
  /** 相对今天的展示标签：今天 / 昨天 / 前天 / 今天凌晨 / 昨天凌晨 / 前天凌晨 / N天前 */
  label: string;
  /** 打卡距今天的天数（>=0，打卡在“今天”之后时按 0 处理） */
  daysAgo: number;
  /** 打卡的中文月日（如 '8月17日'），用于跨时区绝对日期显示或 daysAgo >= 3 时附上具体日期 */
  monthDay: string;
}

/**
 * 把「打卡的墙上时钟日期」换算成相对「今天」的展示标签。
 *
 * 关键：date 与 today 都用**墙上时钟日期**（成员当地时区的日历日），而不是
 * 打卡日（currentCheckinDay 口径，凌晨归前一晚）。否则凌晨 00:36 打卡会被
 * 错标成「昨天 00:36」——墙上时钟明明是今天，很别扭。
 *
 * 「今天」由调用方用成员当地时区的墙上日期计算——保证跨时区下「N 天前」的
 * N 按对方当地时区口径（而非查看者时区）。
 *
 * hour 为打卡时刻的墙上小时：小于日切边界（凌晨 00:00-04:59）时，且 daysAgo<=2，
 * 标签追加「凌晨」（如「今天凌晨 00:36」），更贴合熬夜场景；久远（>=3 天）不强调凌晨。
 */
export function lastCheckinDayLabel(date: string, today: string, hour: number): CheckinDayLabel {
  const daysAgo = Math.max(0, diffDays(date, today));
  const base =
    daysAgo === 0 ? '今天' : daysAgo === 1 ? '昨天' : daysAgo === 2 ? '前天' : `${daysAgo}天前`;
  const earlyMorning = hour < DEFAULT_DAY_BOUNDARY_HOUR;
  const label = earlyMorning && daysAgo <= 2 ? `${base}凌晨` : base;
  const [, m, d] = date.split('-').map(Number);
  return { label, daysAgo, monthDay: `${m}月${d}日` };
}
