"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HIDDEN_STREAK_MILESTONES = void 0;
exports.isStreakMilestone = isStreakMilestone;
exports.nextStreakMilestone = nextStreakMilestone;
/**
 * 隐藏奖励：连续早睡里程碑。
 * 注意——这些阈值对用户是「隐藏」的：日常只展示累计早睡天数与占比，
 * 只有达到阈值时才以惊喜奖牌揭示。见 docs/05-mechanics.md。
 */
exports.HIDDEN_STREAK_MILESTONES = [7, 21, 30, 66, 100];
function isStreakMilestone(streak) {
    return exports.HIDDEN_STREAK_MILESTONES.includes(streak);
}
function nextStreakMilestone(streak) {
    return exports.HIDDEN_STREAK_MILESTONES.find((m) => m > streak) ?? null;
}
//# sourceMappingURL=rewards.js.map