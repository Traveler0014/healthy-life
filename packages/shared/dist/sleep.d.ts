export type NightOutcome = 'early' | 'late' | 'missing';
/**
 * 判定某一晚的结果：早睡 / 晚睡 / 无记录。
 * - 无记录（没打卡）→ missing，不纳入早/晚统计、无惩罚
 * - 有记录：墙上时钟 ≤ 目标就寝时间 → early，否则 late
 *
 * 目标就寝时间 targetBedtime 为 'HH:mm'（群时区），比较用字符串即可（已补零）。
 */
export declare function classifyNight(opts: {
    checkedInAt?: string | null;
    targetBedtime: string;
    timezone: string;
}): NightOutcome;
//# sourceMappingURL=sleep.d.ts.map