import { createMiddleware } from 'hono/factory';
import { sha256 } from '@healthy-life/shared';
import { getMemberByTokenHash } from '@healthy-life/db';
import type { AppDeps, Env } from '../types';

/**
 * 统一鉴权：读取 `Authorization: Bearer <token>`，取 sha256 后查成员表。
 * 校验通过则把成员挂到 `c.get('member')`。
 */
export function authMiddleware(deps: AppDeps) {
  return createMiddleware<Env>(async (c, next) => {
    const header = c.req.header('Authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return c.json({ error: 'unauthorized' }, 401);
    const member = getMemberByTokenHash(deps.db, sha256(token));
    if (!member || member.status !== 'active') return c.json({ error: 'unauthorized' }, 401);
    c.set('member', member);
    await next();
  });
}
