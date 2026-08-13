import { Hono } from 'hono';
import type { Member } from '@healthy-life/shared';
import { updateMember } from '@healthy-life/db';
import type { AppDeps, Env } from '../types';
import { toPublicMember } from '../lib/serialize';

type ProfilePatch = Partial<Pick<Member, 'nickname' | 'emoji' | 'targetBedtime' | 'notifyEnabled'>>;

/** 修改自己的昵称 / emoji / 目标就寝时间 / 通知开关。 */
export function profileRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.patch('/me', async (c) => {
    const member = c.get('member');
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;

    const patch: ProfilePatch = {};
    if (typeof body?.nickname === 'string' && body.nickname.trim() !== '') {
      patch.nickname = body.nickname.trim();
    }
    if (typeof body?.emoji === 'string') {
      patch.emoji = body.emoji.trim();
    }
    if (typeof body?.targetBedtime === 'string') {
      const targetBedtime = body.targetBedtime.trim();
      if (targetBedtime && !/^\d{2}:\d{2}$/.test(targetBedtime)) {
        return c.json({ error: 'targetBedtime must be HH:mm' }, 400);
      }
      if (targetBedtime) patch.targetBedtime = targetBedtime;
    }
    if (typeof body?.notifyEnabled === 'boolean') {
      patch.notifyEnabled = body.notifyEnabled;
    }

    const updated = updateMember(deps.db, member.id, patch);
    if (!updated) return c.json({ error: 'member not found' }, 404);

    const base = deps.config.ntfyBaseUrl.replace(/\/+$/, '');
    return c.json({
      member: toPublicMember(updated),
      notifySubscribeUrl: updated.notifyTopic ? `${base}/${updated.notifyTopic}` : null,
    });
  });

  return router;
}
