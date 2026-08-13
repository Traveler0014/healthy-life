/**
 * 睡前思考题（助眠工具）。
 *
 * 定位：用户已打卡、躺下却睡不着时，再次打开链接即可领取一道
 * 「闭眼可思考」的题目，帮助清空杂念、放慢大脑。睡着了 = 成功。
 *
 * 因此它**不是测验**：无判题、无对错压力、可随时中断。少数题目带答案，
 * 也只用于「次日清晨好奇时查看」，绝不要求睡前作答。
 */
export type PromptCategory = 'visualization' | 'counting' | 'serial' | 'category' | 'spatial' | 'scenario';
export interface SleepPrompt {
    id: string;
    category: PromptCategory;
    prompt: string;
    hasAnswer: boolean;
    answer?: string;
}
export interface PromptSource {
    randomPrompt(excludeIds?: string[]): SleepPrompt;
    list(): SleepPrompt[];
}
export declare function createPromptSource(prompts?: SleepPrompt[]): PromptSource;
//# sourceMappingURL=index.d.ts.map