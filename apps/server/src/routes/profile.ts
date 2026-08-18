import { Hono } from 'hono';
import { hashPassword, isValidTargetBedtime, type Member } from '@healthy-life/shared';
import { deleteMember, listCheckinsForMember, listEventsForMember, updateMember } from '@healthy-life/db';
import type { AppDeps, Env } from '../types';
import { toPublicMember } from '../lib/serialize';

type ProfilePatch = Partial<Pick<Member, 'nickname' | 'emoji' | 'targetBedtime' | 'notifyEnabled'>>;

/** 敏感操作（导出/注销）前，用加盐哈希核验口令。 */
function verifyPassword(member: Member, password: string): boolean {
  return hashPassword(password, member.passwordSalt) === member.passwordHash;
}

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
      if (targetBedtime && !isValidTargetBedtime(targetBedtime)) {
        return c.json({ error: 'targetBedtime must be HH:mm within 20:00-23:59' }, 400);
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

  // 导出个人原始数据（敏感操作，需再次核验口令）
  router.post('/me/export', async (c) => {
    const member = c.get('member');
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!verifyPassword(member, password)) {
      return c.json({ error: '口令不正确' }, 401);
    }
    return c.json({
      exportedAt: new Date().toISOString(),
      member: toPublicMember(member),
      checkins: listCheckinsForMember(deps.db, member.id),
      events: listEventsForMember(deps.db, member.id),
    });
  });

  // 注销（敏感操作，需再次核验口令；连带删除打卡记录与事件）
  router.post('/me/delete', async (c) => {
    const member = c.get('member');
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!verifyPassword(member, password)) {
      return c.json({ error: '口令不正确' }, 401);
    }
    deleteMember(deps.db, member.id);
    return c.json({ ok: true });
  });

  return router;
}
