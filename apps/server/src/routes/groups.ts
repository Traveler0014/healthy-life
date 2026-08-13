import { Hono } from 'hono';
import { generateToken, type Group } from '@healthy-life/shared';
import { createGroup, getGroupById, listMembers, updateGroup } from '@healthy-life/db';
import type { AppDeps, Env } from '../types';
import { requireAdmin } from '../middleware/requireAdmin';
import { toPublicMember } from '../lib/serialize';

type GroupPatch = Partial<Pick<Group, 'name' | 'timezone' | 'visibility'>>;

function isValidVisibility(v: unknown): v is Group['visibility'] {
  return v === 'exact' || v === 'presence';
}

/**
 * 公开端点：建群（无需鉴权）。服务端生成 inviteCode，返回 { group }（含 inviteCode）。
 * 建群者随后经 POST /join 首位加入，自动成为 admin。
 */
export function groupPublicRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.post('/groups', async (c) => {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) return c.json({ error: 'name is required' }, 400);

    if (body?.visibility !== undefined && !isValidVisibility(body.visibility)) {
      return c.json({ error: 'visibility must be exact or presence' }, 400);
    }

    const group = createGroup(deps.db, {
      name,
      inviteCode: generateToken(),
      timezone:
        typeof body?.timezone === 'string' && body.timezone.trim() !== ''
          ? body.timezone.trim()
          : undefined,
      visibility: isValidVisibility(body?.visibility) ? body.visibility : undefined,
    });

    return c.json({ group }, 201);
  });

  return router;
}

/** 群管理端点（均需 admin 角色）。 */
export function groupRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.use('/groups/*', requireAdmin());

  router.get('/groups/:id/members', (c) => {
    const id = c.req.param('id');
    const group = getGroupById(deps.db, id);
    if (!group) return c.json({ error: 'group not found' }, 404);

    const members = listMembers(deps.db, id);
    return c.json({ group: group.id, members: members.map(toPublicMember) });
  });

  // v1 语义：幂等返回现有 inviteCode + 完整链接，不轮换邀请码。
  router.post('/groups/:id/invites', (c) => {
    const id = c.req.param('id');
    const group = getGroupById(deps.db, id);
    if (!group) return c.json({ error: 'group not found' }, 404);

    const base = deps.config.baseUrl.replace(/\/+$/, '');
    return c.json({ inviteCode: group.inviteCode, link: `${base}/i/${group.inviteCode}` });
  });

  router.patch('/groups/:id', async (c) => {
    const id = c.req.param('id');
    const group = getGroupById(deps.db, id);
    if (!group) return c.json({ error: 'group not found' }, 404);

    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;

    const patch: GroupPatch = {};
    if (typeof body?.name === 'string' && body.name.trim() !== '') {
      patch.name = body.name.trim();
    }
    if (typeof body?.timezone === 'string' && body.timezone.trim() !== '') {
      patch.timezone = body.timezone.trim();
    }
    if (body?.visibility !== undefined) {
      if (!isValidVisibility(body.visibility)) {
        return c.json({ error: 'visibility must be exact or presence' }, 400);
      }
      patch.visibility = body.visibility;
    }

    const updated = updateGroup(deps.db, id, patch);
    return c.json({ group: updated });
  });

  return router;
}
