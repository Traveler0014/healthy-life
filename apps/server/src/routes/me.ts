import { Hono } from 'hono';
import type { Env } from '../types';

/**
 * 示例路由：返回当前登录成员。
 * 既验证了鉴权链路，也是后续 agent 挂载业务路由的参考范式。
 */
export const meRoutes = new Hono<Env>();

meRoutes.get('/me', (c) => c.json({ member: c.get('member') }));
