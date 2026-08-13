export interface WallClock {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
}
/** 返回某一时刻在指定时区的「墙上时钟」 */
export declare function wallClock(tz: string, now?: Date): WallClock;
/** 在 'YYYY-MM-DD' 上加减天数（UTC 运算，避免时区/夏令时 bug） */
export declare function addDays(dateStr: string, n: number): string;
/**
 * 当前「打卡日」（YYYY-MM-DD）。
 * 规则：若墙上时钟的小时数 < 日切边界小时，则归入前一天。
 * 例如边界=5：凌晨 04:30 打卡仍算「昨晚」；05:30 起算「今天」。
 */
export declare function currentCheckinDay(tz: string, now?: Date, boundaryHour?: number): string;
//# sourceMappingURL=day.d.ts.map