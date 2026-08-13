import { createMiddleware } from 'hono/factory';
import { SYSTEM_GROUP_ID } from '@healthy-life/shared';
import type { Env } from '../types';

/** 系统管理员专用：要求当前成员为系统管理员（系统群 + admin），否则 403。 */
export function requireAdmin() {
  return createMiddleware<Env>(async (c, next) => {
    const member = c.get('member');
    if (!member || member.groupId !== SYSTEM_GROUP_ID || member.role !== 'admin') {
      return c.json({ error: 'forbidden' }, 403);
    }
    await next();
  });
}
