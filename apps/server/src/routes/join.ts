import { Hono } from 'hono';
import { generateToken, sha256 } from '@healthy-life/shared';
import {
  createMember,
  getGroupByInviteCode,
  getMemberById,
  listMembers,
  updateMember,
} from '@healthy-life/db';
import type { AppDeps, Env } from '../types';
import { toPublicMember } from '../lib/serialize';

/**
 * 公开端点：用邀请码加入群（无需鉴权）。
 * 首个加入的成员自动成为该群 admin（见 supervisor 指示）。
 */
export function joinRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.post('/join', async (c) => {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;

    const inviteCode = typeof body?.inviteCode === 'string' ? body.inviteCode.trim() : '';
    const nickname = typeof body?.nickname === 'string' ? body.nickname.trim() : '';
    const targetBedtime =
      typeof body?.targetBedtime === 'string' ? body.targetBedtime.trim() : '';
    const emoji =
      typeof body?.emoji === 'string' && body.emoji.trim() !== '' ? body.emoji.trim() : undefined;

    if (!inviteCode || !nickname) {
      return c.json({ error: 'inviteCode and nickname are required' }, 400);
    }
    if (targetBedtime && !/^\d{2}:\d{2}$/.test(targetBedtime)) {
      return c.json({ error: 'targetBedtime must be HH:mm' }, 400);
    }

    const group = getGroupByInviteCode(deps.db, inviteCode);
    if (!group) return c.json({ error: 'invalid invite code' }, 404);

    const token = generateToken();
    const member = createMember(deps.db, {
      groupId: group.id,
      nickname,
      emoji,
      targetBedtime: targetBedtime || undefined,
      tokenHash: sha256(token),
    });

    // 首位成员自动成为 admin（建群者即组织者）。
    if (listMembers(deps.db, group.id).length === 1) {
      updateMember(deps.db, member.id, { role: 'admin' });
    }

    const finalMember = getMemberById(deps.db, member.id) ?? member;
    return c.json({ member: toPublicMember(finalMember), token }, 201);
  });

  return router;
}
