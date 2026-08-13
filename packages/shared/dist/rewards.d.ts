/**
 * 隐藏奖励：连续早睡里程碑。
 * 注意——这些阈值对用户是「隐藏」的：日常只展示累计早睡天数与占比，
 * 只有达到阈值时才以惊喜奖牌揭示。见 docs/05-mechanics.md。
 */
export declare const HIDDEN_STREAK_MILESTONES: readonly number[];
export declare function isStreakMilestone(streak: number): boolean;
export declare function nextStreakMilestone(streak: number): number | null;
//# sourceMappingURL=rewards.d.ts.map