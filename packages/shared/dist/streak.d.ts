export interface Streak {
    current: number;
    longest: number;
}
/**
 * 计算连续天数。
 *
 * `dates` 是「合格日期」集合（YYYY-MM-DD）。对于「隐藏连续早睡」，
 * 调用方只传入「早睡」的日期——这样晚睡/漏打卡那天不在集合里，自然打断连续。
 *
 * 语义：若 `today` 已合格则从 today 往回数；否则（今天尚未产生记录，
 * 不算已断）从昨天往回数。
 */
export declare function computeStreak(dates: string[], today: string): Streak;
//# sourceMappingURL=streak.d.ts.map