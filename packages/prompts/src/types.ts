/**
 * 睡前思考题类型与「题目包」契约。
 *
 * 题目包（PromptBundle）是题库的唯一交换格式：
 * - 内置题库 `CORE_BUNDLE` 随包发布（packages/prompts/src/core.ts）
 * - 外部题库以 JSON 形式导入（admin 上传文件 / 指向 release URL / jobs 定时拉取）
 * - 校验统一走 validateBundle()，任何来源的题目包都必须通过
 *
 * 契约版本：schemaVersion = 1。变更需同步 docs/ 与 server/db 实现。
 */

/** 题目难度：1 = 轻松一想，2 = 要想一阵，3 = 想不完正好睡着 */
export type PromptDifficulty = 1 | 2 | 3;

/** 一道思考题（内容层，不含入库/展示状态） */
export interface Prompt {
  /** 包内唯一 id（跨包导入时作为主键 upsert） */
  id: string;
  /** 分类 id，须出现在 bundle.categories[] 中 */
  category: string;
  /** 题目正文：现象入口 + 简单概念说明 + 引导问题（含对直觉答案的证否提示） */
  question: string;
  /** 解答：先证否直觉答案，再给核心机制；无定论题要如实说明 */
  answer: string;
  /** 出处（必填，作为可信度锚点），如「费曼讲义 Vol I §46」 */
  source: string;
  /** 出处链接（可选） */
  sourceUrl?: string;
  /** 作者 / 贡献者昵称（可选） */
  author?: string;
  /** 思考深度，默认 2 */
  difficulty?: PromptDifficulty;
}

export interface PromptBundleCategory {
  id: string;
  /** 展示名，如「天文宇宙」「冷与热」 */
  label: string;
}

/** 题目包：一个可整体导入/发布的题库单元 */
export interface PromptBundle {
  schemaVersion: 1;
  /** 包标识，如 'healthy-life-core' */
  id: string;
  /** 包名，如「核心题库」 */
  name: string;
  /** semver，如 '1.0.0' */
  version: string;
  /** 更新时间 ISO */
  updatedAt: string;
  /** 包状态：draft = 待审核 / published = 可发布 */
  status: 'draft' | 'published';
  categories: PromptBundleCategory[];
  prompts: Prompt[];
}

export interface BundleValidation {
  ok: boolean;
  errors: string[];
}

/** 基础校验：单题必填字段与长度（防注入/超大内容） */
const PROMPT_LIMITS = {
  question: 2000,
  answer: 4000,
  source: 300,
  sourceUrl: 1000,
  author: 100,
} as const;

export function validateBundle(input: unknown): BundleValidation {
  const errors: string[] = [];
  const b = input as PromptBundle;

  if (!b || typeof b !== 'object') return { ok: false, errors: ['题目包不是合法对象'] };
  if (b.schemaVersion !== 1) errors.push(`不支持的 schemaVersion：${String(b.schemaVersion)}`);
  if (typeof b.id !== 'string' || !b.id) errors.push('缺少包 id');
  if (typeof b.name !== 'string' || !b.name) errors.push('缺少包 name');
  if (typeof b.version !== 'string' || !b.version) errors.push('缺少包 version');
  if (typeof b.updatedAt !== 'string' || !b.updatedAt) errors.push('缺少包 updatedAt');
  if (b.status !== 'draft' && b.status !== 'published') errors.push('包 status 必须为 draft/published');
  if (!Array.isArray(b.categories) || b.categories.length === 0) errors.push('categories 不能为空');
  if (!Array.isArray(b.prompts) || b.prompts.length === 0) errors.push('prompts 不能为空');

  if (errors.length > 0) return { ok: false, errors };

  const catIds = new Set(b.categories.map((c) => c.id));
  if (catIds.size !== b.categories.length) errors.push('categories 存在重复 id');
  b.categories.forEach((c) => {
    if (!c.id || !c.label) errors.push(`分类缺少 id/label：${JSON.stringify(c)}`);
  });

  const seen = new Set<string>();
  b.prompts.forEach((p, i) => {
    const where = `prompts[${i}]`;
    if (!p || typeof p !== 'object') return errors.push(`${where} 不是对象`);
    if (!p.id) return errors.push(`${where} 缺少 id`);
    if (seen.has(p.id)) return errors.push(`${where} id 重复：${p.id}`);
    seen.add(p.id);
    if (!catIds.has(p.category)) errors.push(`${where} 分类不存在：${p.category}`);
    if (typeof p.question !== 'string' || p.question.trim().length === 0)
      errors.push(`${where} 缺少 question`);
    if (p.question.length > PROMPT_LIMITS.question) errors.push(`${where} question 超长`);
    if (typeof p.answer !== 'string' || p.answer.trim().length === 0)
      errors.push(`${where} 缺少 answer`);
    if (p.answer.length > PROMPT_LIMITS.answer) errors.push(`${where} answer 超长`);
    if (typeof p.source !== 'string' || p.source.trim().length === 0)
      errors.push(`${where} 缺少 source（出处必填，作为可信度锚点）`);
    if (p.source.length > PROMPT_LIMITS.source) errors.push(`${where} source 超长`);
    if (p.sourceUrl !== undefined && typeof p.sourceUrl !== 'string') errors.push(`${where} sourceUrl 类型错误`);
    if (typeof p.sourceUrl === 'string' && p.sourceUrl.length > PROMPT_LIMITS.sourceUrl)
      errors.push(`${where} sourceUrl 超长`);
    if (p.author !== undefined && typeof p.author !== 'string') errors.push(`${where} author 类型错误`);
    if (p.difficulty !== undefined && ![1, 2, 3].includes(p.difficulty))
      errors.push(`${where} difficulty 必须为 1/2/3`);
  });

  return { ok: errors.length === 0, errors };
}

/**
 * 从候选池随机抽一题（纯函数，无 IO）。
 * @param pool 候选池（如 DB 里 active 的题目，或内置包）
 * @param categories 限定分类；空表示全部
 * @param excludeIds 排除已抽过的题；池被排空时回退到全池
 */
export function randomPrompt(
  pool: Prompt[],
  categories?: string[],
  excludeIds: string[] = [],
): Prompt | undefined {
  const filtered = pool.filter(
    (p) =>
      (!categories || categories.length === 0 || categories.includes(p.category)) &&
      !excludeIds.includes(p.id),
  );
  const src = filtered.length > 0 ? filtered : pool.filter((p) => !categories || categories.includes(p.category));
  if (src.length === 0) return undefined;
  return src[Math.floor(Math.random() * src.length)];
}

/** 包内分类 → label 映射 */
export function bundleCategoryMap(bundle: PromptBundle): Map<string, string> {
  return new Map(bundle.categories.map((c) => [c.id, c.label]));
}
