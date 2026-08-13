/**
 * 消息文案模板（占位实现，Phase 1 由负责 agent 精修）。
 * 文案基调：正反馈、不羞辱、把「早睡」而非「打卡」放在中心。见 docs/05-mechanics.md。
 */
export declare function reminderMessage(nickname: string, target: string): string;
export declare function earlyCheckinMessage(nickname: string, time: string): string;
export declare function lateCheckinMessage(nickname: string, time: string, minutesLate: number): string;
export declare function morningReportMessage(lines: string[]): string;
export declare function rewardMessage(nickname: string, label: string): string;
//# sourceMappingURL=templates.d.ts.map