import { Hono } from 'hono';
import type { Env } from '../types';
/**
 * 示例路由：返回当前登录成员。
 * 既验证了鉴权链路，也是后续 agent 挂载业务路由的参考范式。
 */
export declare const meRoutes: Hono<Env, import("hono/types").BlankSchema, "/">;
//# sourceMappingURL=me.d.ts.map