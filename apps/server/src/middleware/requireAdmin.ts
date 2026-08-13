import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';

/** 管理端点专用：要求当前成员为 admin，否则 403。 */
export function requireAdmin() {
  return createMiddleware<Env>(async (c, next) => {
    const member = c.get('member');
    if (!member || member.role !== 'admin') {
      return c.json({ error: 'forbidden' }, 403);
    }
    await next();
  });
}
