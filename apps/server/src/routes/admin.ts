import { Hono } from 'hono';
import {
  ADMIN_NICKNAME,
  SYSTEM_GROUP_ID,
  deriveLinkToken,
  generateToken,
  hashPassword,
  sha256,
} from '@healthy-life/shared';
import { getMemberById, getMemberByNickname, updateMemberPassword } from '@healthy-life/db';
import type { AppDeps, Env } from '../types';
import { requireAdmin } from '../middleware/requireAdmin';
import { toPublicMember } from '../lib/serialize';

function baseUrl(deps: AppDeps): string {
  return deps.config.baseUrl.replace(/\/+$/, '');
}

/** 管理员登录（公开）：口令正确返回管理员专属链接。 */
export function adminPublicRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.post('/admin/login', async (c) => {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const password = typeof body?.password === 'string' ? body.password : '';

    const admin = getMemberByNickname(deps.db, SYSTEM_GROUP_ID, ADMIN_NICKNAME);
    if (!admin || hashPassword(password, admin.passwordSalt) !== admin.passwordHash) {
      return c.json({ error: '口令不正确' }, 401);
    }

    const linkToken = deriveLinkToken(SYSTEM_GROUP_ID, ADMIN_NICKNAME, password);
    return c.json({
      member: toPublicMember(admin),
      token: linkToken,
      link: `${baseUrl(deps)}/c/${linkToken}`,
    });
  });

  return router;
}

/** 管理员改口令（需管理员鉴权）：改后重新派生链接，旧链接失效。 */
export function adminRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.patch('/admin/password', requireAdmin(), async (c) => {
    const admin = c.get('member');
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;

    const oldPassword = typeof body?.oldPassword === 'string' ? body.oldPassword : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword.trim() : '';
    if (newPassword.length < 4) {
      return c.json({ error: 'new password must be at least 4 characters' }, 400);
    }
    if (hashPassword(oldPassword, admin.passwordSalt) !== admin.passwordHash) {
      return c.json({ error: '原口令不正确' }, 401);
    }

    const salt = generateToken(16);
    const linkToken = deriveLinkToken(SYSTEM_GROUP_ID, ADMIN_NICKNAME, newPassword);
    updateMemberPassword(deps.db, admin.id, {
      passwordHash: hashPassword(newPassword, salt),
      passwordSalt: salt,
      tokenHash: sha256(linkToken),
    });

    const updated = getMemberById(deps.db, admin.id);
    return c.json({
      member: updated ? toPublicMember(updated) : null,
      token: linkToken,
      link: `${baseUrl(deps)}/c/${linkToken}`,
    });
  });

  return router;
}
