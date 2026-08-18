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
  /** 相对查看者今天的展示标签：明天凌晨 / 今天 / 昨天 / 前天 / 今天凌晨 / 昨天凌晨 / 前天凌晨 / N天前 */
  label: string;
  /** 打卡距查看者今天的天数（可负：负值表示打卡日期在查看者的「明天」，跨时区时出现） */
  daysAgo: number;
  /** 打卡的中文月日（如 '8月17日'），用于 daysAgo >= 3 时附上具体日期 */
  monthDay: string;
}

/**
 * 把「打卡的墙上时钟日期」换算成相对「查看者今天」的展示标签。
 *
 * 关键：date 是打卡那一刻在**成员当地时区**的墙上日期（日历日），而不是打卡日
 * （currentCheckinDay 口径，凌晨归前一晚）；today 是**查看者当地时区**的今天。
 * 二者作差得到「相对查看者」的 N 天，跨时区下查看者读「昨天/今天」不会错位。
 *
 * 成员时区比查看者快时，date 可能比 today 晚一天（成员已进入次日、查看者还停在当天），
 * 此时 daysAgo 为负，标签显示「明天（凌晨）」——这是多时区的自然结果，并非错误。
 *
 * hour 为打卡时刻的墙上小时：小于日切边界（凌晨 00:00-04:59）时，且 daysAgo<=2，
 * 标签追加「凌晨」（如「今天凌晨 00:36」），更贴合熬夜场景；久远（>=3 天）不强调凌晨。
 */
export function lastCheckinDayLabel(date: string, today: string, hour: number): CheckinDayLabel {
  // 可负：成员时区比查看者快 → 成员墙上日期可能是查看者的「明天」
  const daysAgo = diffDays(date, today);
  let base: string;
  if (daysAgo <= -1) base = '明天';
  else if (daysAgo === 0) base = '今天';
  else if (daysAgo === 1) base = '昨天';
  else if (daysAgo === 2) base = '前天';
  else base = `${daysAgo}天前`;
  const earlyMorning = hour < DEFAULT_DAY_BOUNDARY_HOUR;
  const label = earlyMorning && daysAgo <= 2 ? `${base}凌晨` : base;
  const [, m, d] = date.split('-').map(Number);
  return { label, daysAgo, monthDay: `${m}月${d}日` };
}
