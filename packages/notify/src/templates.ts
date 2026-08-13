/**
 * 消息文案模板（占位实现，Phase 1 由负责 agent 精修）。
 * 文案基调：正反馈、不羞辱、把「早睡」而非「打卡」放在中心。见 docs/05-mechanics.md。
 */

export function reminderMessage(nickname: string, target: string): string {
  return `${nickname}，目标就寝时间 ${target} 快到啦，准备洗漱、放下手机吧 🌙 睡前来打卡～`;
}

export function earlyCheckinMessage(nickname: string, time: string): string {
  return `✅ ${nickname} ${time} 就寝，今晚早睡了！`;
}

export function lateCheckinMessage(nickname: string, time: string, minutesLate: number): string {
  return `🌙 ${nickname} ${time} 就寝，比目标晚了约 ${minutesLate} 分钟。没关系，明天提前一点点～`;
}

export function morningReportMessage(lines: string[]): string {
  return lines.join('\n');
}

export function rewardMessage(nickname: string, label: string): string {
  return `🏅 ${nickname} 解锁隐藏成就「${label}」！`;
}
