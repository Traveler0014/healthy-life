/**
 * 把「原始科普内容」交给 LLM 构造为睡前思考题（draft 题目包）。
 *
 * 提示词要求模型输出符合题目包契约的 JSON，严格包含：
 * - 现象入口 + 简单概念说明（一句话能懂，不用术语也能开始想）
 * - 题目内主动证否「最直觉但错误」的答案（避免用户自以为想完就结束）
 * - 答案有多层推理、或反直觉需纠错、或开放无定论——学过初中物理的人不会秒解
 * - source / sourceUrl 锚定原文，供人工审核回溯
 */
import {
  validateBundle,
  type Prompt,
  type PromptBundle,
  type PromptBundleCategory,
} from '@healthy-life/prompts';
import { chat, type LlmOptions } from './llm';

const SYSTEM_PROMPT = `你是一个「睡前思考题」编辑。给定一篇科普/论文摘要素材，把它改写成一道适合躺下时闭眼思考的趣味题。

硬性要求（违反任何一条都算废稿）：
1. 题目以日常现象或简单概念入口，一句话能听懂，不要求任何背景知识；中文。
2. 题目正文里主动写出一句「最直觉但错误的答案」并引导读者验证它为什么错——让学过初中物理的人也愿意继续想，而不是秒答。
3. 答案要有层次：先证否直觉答案，再给核心机制（可多层），引用素材里的关键事实；如果问题本身尚无定论，明确说明。
4. source 填素材出处（如刊物名/论文标题），sourceUrl 填素材链接；不可编造。
5. 只输出一个 JSON 对象（不要 markdown 代码块、不要额外文字），结构：
{
  "id": "短横线id，如 light-01",
  "category": "英文分类id（沿用素材主题，如 cosmos/thermal/motion/light/open/biology/psychology 等）",
  "question": "题目正文（100-300字）",
  "answer": "解答（150-400字，先证否直觉答案）",
  "source": "出处",
  "sourceUrl": "来源链接",
  "difficulty": 2
}`;

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  // 容忍模型输出 markdown 代码块包裹
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(body);
  } catch {
    // 尝试截取第一个 { 到最后一个 }
    const start = body.indexOf('{');
    const end = body.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(body.slice(start, end + 1));
    throw new Error('模型输出不是合法 JSON');
  }
}

export interface DraftBuildResult {
  bundle: PromptBundle | null;
  /** 每题的构造过程错误（不阻断整体） */
  errors: string[];
}

/** 从一组素材条目构造一个 draft 题目包（逐条调用 LLM，失败条目记入 errors）。 */
export async function buildDraftBundle(
  llm: LlmOptions,
  bundleId: string,
  bundleName: string,
  items: Array<{ title: string; text: string; url?: string; publishedAt?: string }>,
  maxItems = 5,
): Promise<DraftBuildResult> {
  const categories = new Map<string, PromptBundleCategory>();
  const prompts: Prompt[] = [];
  const errors: string[] = [];

  for (const item of items.slice(0, maxItems)) {
    const user = `素材标题：${item.title}\n素材正文：\n${item.text.slice(0, 6000)}\n${item.url ? `素材链接：${item.url}` : ''}\n\n请按系统要求输出题目 JSON。`;
    try {
      const raw = await chat(llm, SYSTEM_PROMPT, user, 2000);
      const parsed = extractJson(raw) as Partial<Prompt> & { category?: string };
      if (!parsed.question || !parsed.answer || !parsed.category || !parsed.id) {
        errors.push(`${item.title}：模型输出缺字段`);
        continue;
      }
      const prompt: Prompt = {
        id: `${bundleId}-${parsed.id}`,
        category: parsed.category,
        question: parsed.question,
        answer: parsed.answer,
        source: parsed.source ?? item.title,
        sourceUrl: parsed.sourceUrl ?? item.url,
        author: 'ai-extract',
        difficulty: parsed.difficulty ?? 2,
      };
      // 分类注册（label 用中文，模型不给就用 id 兜底）
      if (!categories.has(prompt.category)) {
        categories.set(prompt.category, { id: prompt.category, label: prompt.category });
      }
      prompts.push(prompt);
    } catch (err) {
      errors.push(`${item.title}：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (prompts.length === 0) {
    return { bundle: null, errors };
  }

  const bundle: PromptBundle = {
    schemaVersion: 1,
    id: bundleId,
    name: bundleName,
    version: '0.1.0',
    updatedAt: new Date().toISOString(),
    status: 'draft',
    categories: [...categories.values()],
    prompts,
  };
  const validation = validateBundle(bundle);
  if (!validation.ok) {
    return { bundle: null, errors: [...errors, ...validation.errors] };
  }
  return { bundle, errors };
}
