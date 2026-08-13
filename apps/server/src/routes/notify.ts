import { Hono } from 'hono';
import { createNotifyClient, testNotifyMessage } from '@healthy-life/notify';
import type { AppDeps, Env } from '../types';

/**
 * 通知相关接口。
 * - POST /notify/test：向当前成员的 notify_topic 发一条测试推送，供用户在打卡页
 *   验证自己的 ntfy 订阅/推送配置是否生效。
 */
export function notifyRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.post('/notify/test', async (c) => {
    const member = c.get('member');
    if (!member.notifyTopic) {
      return c.json({ error: '未找到你的通知 topic' }, 400);
    }
    if (!deps.config.ntfyToken) {
      return c.json({ error: '服务端未配置 NTFY_TOKEN，无法推送' }, 500);
    }

    const notify = createNotifyClient(deps.config.ntfyBaseUrl, deps.config.ntfyToken);
    try {
      await notify.publish(member.notifyTopic, testNotifyMessage(member.nickname), { priority: 3 });
      return c.json({ ok: true });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : '推送失败' }, 502);
    }
  });

  return router;
}
