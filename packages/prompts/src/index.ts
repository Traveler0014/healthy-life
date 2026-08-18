/**
 * 睡前趣味思考题（哄睡工具）。
 *
 * 定位：用户已打卡、躺下却睡不着时，抽一道「闭眼可思考」的趣味题，
 * 帮助转移注意力、放慢大脑。题目**带答案**，但抽题接口睡前不返回答案——
 * 答案只在次日（该打卡日结束后）通过「历史题库」查看，绝不给睡前压力。
 *
 * 内容组织：题目以「题目包（PromptBundle）」为单位。
 * - 内置包 CORE_BUNDLE 随包发布（见 core.ts）
 * - 外部包通过 admin 导入（文件 / URL / jobs 定时拉取），统一走 validateBundle 校验
 */

export * from './types';
export * from './io';
export { CORE_BUNDLE } from './core';

import type { Prompt, PromptBundle } from './types';
import { CORE_BUNDLE } from './core';

export const PROMPT_CATEGORIES: string[] = CORE_BUNDLE.categories.map((c) => c.id);

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CORE_BUNDLE.categories.map((c) => [c.id, c.label]),
);

/** 内置包题目池 */
export function listPrompts(): Prompt[] {
  return [...CORE_BUNDLE.prompts];
}

export function getPromptById(id: string): Prompt | undefined {
  return CORE_BUNDLE.prompts.find((p) => p.id === id);
}

/** 兼容：server 端改用 DB 后不再直接依赖内置池随机，此函数保留供测试/工具使用 */
