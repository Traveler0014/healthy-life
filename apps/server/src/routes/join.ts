import { Hono } from 'hono';
import { deriveLinkToken, generateToken, hashPassword, sha256 } from '@healthy-life/shared';
import {
  createMember,
  getGroupByInviteCode,
  getMemberById,
  getMemberByNickname,
  listMembers,
  updateMember,
} from '@healthy-life/db';
import type { AppDeps, Env } from '../types';
import { toPublicMember } from '../lib/serialize';

const MIN_PASSWORD_LEN = 4;

/**
 * 公开端点：注册 / 找回 合一。
 * - 昵称+口令首次出现 → 注册新成员（首位自动 admin），返回派生的打卡链接。
 * - 昵称已存在且口令正确 → 找回（返回同一条链接）。
 * - 口令错误 → 401。
 *
 * 打卡链接 token 由 deriveLinkToken(groupId, nickname, password) 确定性派生，
 * 因此链接稳定不变；服务端只存 sha256(token)，不存明文链接。
 */
export function joinRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.post('/join', async (c) => {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;

    const inviteCode = typeof body?.inviteCode === 'string' ? body.inviteCode.trim() : '';
    const nickname = typeof body?.nickname === 'string' ? body.nickname.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const targetBedtime =
      typeof body?.targetBedtime === 'string' ? body.targetBedtime.trim() : '';
    const emoji =
      typeof body?.emoji === 'string' && body.emoji.trim() !== '' ? body.emoji.trim() : undefined;
    const timezone =
      typeof body?.timezone === 'string' && body.timezone.trim() !== ''
        ? body.timezone.trim()
        : undefined;

    if (!inviteCode || !nickname) {
      return c.json({ error: 'inviteCode and nickname are required' }, 400);
    }
    if (password.length < MIN_PASSWORD_LEN) {
      return c.json({ error: `password must be at least ${MIN_PASSWORD_LEN} characters` }, 400);
    }
    if (targetBedtime && !/^\d{2}:\d{2}$/.test(targetBedtime)) {
      return c.json({ error: 'targetBedtime must be HH:mm' }, 400);
    }

    const group = getGroupByInviteCode(deps.db, inviteCode);
    if (!group) return c.json({ error: 'invalid invite code' }, 404);

    const base = deps.config.baseUrl.replace(/\/+$/, '');
    const linkToken = deriveLinkToken(group.id, nickname, password);

    // 找回：昵称已存在 → 校验口令后返回同一条链接
    const existing = getMemberByNickname(deps.db, group.id, nickname);
    if (existing) {
      if (hashPassword(password, existing.passwordSalt) !== existing.passwordHash) {
        return c.json({ error: '口令不正确' }, 401);
      }
      return c.json({
        member: toPublicMember(existing),
        token: linkToken,
        link: `${base}/c/${linkToken}`,
      });
    }

    // 注册：新成员
    const passwordSalt = generateToken(16);
    const member = createMember(deps.db, {
      groupId: group.id,
      nickname,
      emoji,
      targetBedtime: targetBedtime || undefined,
      tokenHash: sha256(linkToken),
      passwordHash: hashPassword(password, passwordSalt),
      passwordSalt,
      lastTimezone: timezone,
    });

    // 首位成员自动成为 admin（建群者即组织者）。
    if (listMembers(deps.db, group.id).length === 1) {
      updateMember(deps.db, member.id, { role: 'admin' });
    }

    const finalMember = getMemberById(deps.db, member.id) ?? member;
    return c.json(
      {
        member: toPublicMember(finalMember),
        token: linkToken,
        link: `${base}/c/${linkToken}`,
      },
      201,
    );
  });

  return router;
}
