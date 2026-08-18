import { Hono } from 'hono';
import { currentCheckinDay } from '@healthy-life/shared';
import {
  CATEGORY_LABELS,
  PROMPT_CATEGORIES,
  getPromptById,
  randomPrompt,
  type PromptCategory,
} from '@healthy-life/prompts';
import {
  claimPrompt,
  getGroupById,
  listPromptClaimsForMember,
  updateMember,
  upsertCheckin,
} from '@healthy-life/db';
import type { AppDeps, Env } from '../types';

/** 从请求体解析领域过滤：非法 / 空数组 → undefined（表示全部领域）。 */
function normalizeCategories(input: unknown): PromptCategory[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const valid = input.filter(
    (x): x is PromptCategory =>
      typeof x === 'string' && (PROMPT_CATEGORIES as string[]).includes(x),
  );
  return valid.length > 0 ? valid : undefined;
}

/**
 * 睡前趣味思考题（Phase 3）：
 * - 只在「已打卡 + 睡眠状态」下由前端触发（服务端不强制状态，前端控制展示）。
 * - 抽题即触发一次打卡（更新打卡时间），保持低唤醒定位：不返回早/晚回执。
 * - 睡前只返回题目，答案在「该打卡日结束后」的历史题库里才可见。
 */
export function promptRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.get('/prompts/categories', (c) => {
    return c.json({
      categories: PROMPT_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] })),
    });
  });

  router.post('/prompts/random', async (c) => {
    const member = c.get('member');
    const group = getGroupById(deps.db, member.groupId);
    if (!group) return c.json({ error: 'group not found' }, 404);

    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const categories = normalizeCategories(body?.categories);
    const timezone =
      typeof body?.timezone === 'string' && body.timezone.trim() !== ''
        ? body.timezone.trim()
        : member.lastTimezone || group.timezone;

    // 排除已抽过的题，尽量每次给新题
    const excludeIds = listPromptClaimsForMember(deps.db, member.id).map((p) => p.promptId);
    const prompt = randomPrompt(categories, excludeIds);

    // 抽题即触发打卡（更新打卡时间），不返回早/晚回执
    const now = new Date();
    const date = currentCheckinDay(timezone, now);
    const checkin = upsertCheckin(deps.db, {
      memberId: member.id,
      date,
      checkedInAt: now.toISOString(),
      timezone,
    });
    if (timezone !== member.lastTimezone) {
      updateMember(deps.db, member.id, { lastTimezone: timezone });
    }

    claimPrompt(deps.db, {
      memberId: member.id,
      promptId: prompt.id,
      category: prompt.category,
      date,
      claimedAt: now.toISOString(),
    });

    // 睡前不返回答案
    return c.json({
      prompt: { id: prompt.id, category: prompt.category, question: prompt.question },
      checkin,
    });
  });

  router.get('/prompts/history', (c) => {
    const member = c.get('member');
    const group = getGroupById(deps.db, member.groupId);
    if (!group) return c.json({ error: 'group not found' }, 404);

    const timezone = member.lastTimezone || group.timezone;
    const today = currentCheckinDay(timezone);

    // 仅「已结束的打卡日」（次日健康起床时段后）可查看答案
    const claims = listPromptClaimsForMember(deps.db, member.id)
      .filter((cl) => cl.date < today)
      .map((cl) => {
        const p = getPromptById(cl.promptId);
        return {
          id: cl.id,
          date: cl.date,
          category: cl.category,
          question: p?.question ?? '',
          answer: p?.answer ?? '',
        };
      });

    return c.json({ claims });
  });

  return router;
}
