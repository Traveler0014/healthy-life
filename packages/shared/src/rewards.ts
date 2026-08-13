/**
 * 隐藏奖励：连续早睡里程碑。
 * 注意——这些阈值对用户是「隐藏」的：日常只展示累计早睡天数与占比，
 * 只有达到阈值时才以惊喜奖牌揭示。见 docs/05-mechanics.md。
 */
export const HIDDEN_STREAK_MILESTONES: readonly number[] = [7, 21, 30, 66, 100];

export function isStreakMilestone(streak: number): boolean {
  return HIDDEN_STREAK_MILESTONES.includes(streak);
}

export function nextStreakMilestone(streak: number): number | null {
  return HIDDEN_STREAK_MILESTONES.find((m) => m > streak) ?? null;
}
