"use strict";
/**
 * 消息文案模板（占位实现，Phase 1 由负责 agent 精修）。
 * 文案基调：正反馈、不羞辱、把「早睡」而非「打卡」放在中心。见 docs/05-mechanics.md。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminderMessage = reminderMessage;
exports.earlyCheckinMessage = earlyCheckinMessage;
exports.lateCheckinMessage = lateCheckinMessage;
exports.morningReportMessage = morningReportMessage;
exports.rewardMessage = rewardMessage;
function reminderMessage(nickname, target) {
    return `${nickname}，目标就寝时间 ${target} 快到啦，准备洗漱、放下手机吧 🌙 睡前来打卡～`;
}
function earlyCheckinMessage(nickname, time) {
    return `✅ ${nickname} ${time} 就寝，今晚早睡了！`;
}
function lateCheckinMessage(nickname, time, minutesLate) {
    return `🌙 ${nickname} ${time} 就寝，比目标晚了约 ${minutesLate} 分钟。没关系，明天提前一点点～`;
}
function morningReportMessage(lines) {
    return lines.join('\n');
}
function rewardMessage(nickname, label) {
    return `🏅 ${nickname} 解锁隐藏成就「${label}」！`;
}
//# sourceMappingURL=templates.js.map