import { Hono } from 'hono';
import type { AppDeps, Env } from '../types';
import { toPublicMember } from '../lib/serialize';

/**
 * 返回当前登录成员 + 其 ntfy 订阅链接（打卡页「开启通知」按钮指向它）。
 */
export function meRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.get('/me', (c) => {
    const member = c.get('member');
    const base = deps.config.ntfyBaseUrl.replace(/\/+$/, '');
    return c.json({
      member: toPublicMember(member),
      notifySubscribeUrl: member.notifyTopic ? `${base}/${member.notifyTopic}` : null,
    });
  });

  return router;
}
