import { Hono } from 'hono';
import { fetchBundleText, parseBundleText, type PromptBundle } from '@healthy-life/prompts';
import {
  deletePrompt,
  getPrompt,
  importBundle,
  listPrompts,
  updatePrompt,
  type PromptStatus,
} from '@healthy-life/db';
import type { AppDeps, Env } from '../types';
import { requireAdmin } from '../middleware/requireAdmin';

/** 管理员题库管理：列表 / 编辑 / 上下线 / 删除 / 导入（文本或 URL）。 */
export function adminPromptRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.get('/admin/prompts', requireAdmin(), (c) => {
    const status = (c.req.query('status') ?? 'all') as PromptStatus | 'all';
    const prompts = listPrompts(deps.db, status);
    return c.json({
      prompts: prompts.map((p) => ({
        ...p,
        sourceUrl: p.sourceUrl ?? '',
        author: p.author ?? '',
        difficulty: p.difficulty ?? 2,
      })),
    });
  });

  router.patch('/admin/prompts/:id', requireAdmin(), async (c) => {
    const id = c.req.param('id');
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return c.json({ error: '请求体无效' }, 400);
    const patch: Record<string, unknown> = {};
    if (body.status !== undefined) {
      if (body.status !== 'active' && body.status !== 'disabled') {
        return c.json({ error: 'status 必须为 active/disabled' }, 400);
      }
      patch.status = body.status;
    }
    for (const key of ['category', 'question', 'answer', 'source', 'sourceUrl', 'author'] as const) {
      if (body[key] !== undefined) {
        if (typeof body[key] !== 'string') return c.json({ error: `${key} 必须为字符串` }, 400);
        patch[key] = body[key];
      }
    }
    if (body.difficulty !== undefined) {
      if (![1, 2, 3].includes(Number(body.difficulty))) {
        return c.json({ error: 'difficulty 必须为 1/2/3' }, 400);
      }
      patch.difficulty = Number(body.difficulty);
    }
    const updated = updatePrompt(deps.db, id, patch);
    if (!updated) return c.json({ error: '题目不存在' }, 404);
    return c.json({ prompt: updated });
  });

  router.delete('/admin/prompts/:id', requireAdmin(), (c) => {
    const id = c.req.param('id');
    if (!getPrompt(deps.db, id)) return c.json({ error: '题目不存在' }, 404);
    deletePrompt(deps.db, id);
    return c.json({ ok: true });
  });

  // 导入题目包：{ bundleText }（文件内容直接 POST）或 { url }（拉取 release 产物）
  router.post('/admin/prompts/import', requireAdmin(), async (c) => {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return c.json({ error: '请求体无效' }, 400);

    let bundle: PromptBundle;
    try {
      if (typeof body.url === 'string' && body.url.trim() !== '') {
        const text = await fetchBundleText(body.url.trim());
        bundle = parseBundleText(text);
      } else if (typeof body.bundleText === 'string' && body.bundleText.trim() !== '') {
        bundle = parseBundleText(body.bundleText);
      } else {
        return c.json({ error: '需要 bundleText（JSON 文本）或 url' }, 400);
      }
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : '导入失败' }, 400);
    }

    const result = importBundle(deps.db, bundle);
    if (result.errors.length > 0) {
      return c.json({ ...result, error: result.errors.slice(0, 5).join('；') }, 400);
    }
    return c.json(result);
  });

  return router;
}
