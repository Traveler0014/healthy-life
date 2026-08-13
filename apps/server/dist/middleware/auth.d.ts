import type { AppDeps, Env } from '../types';
/**
 * 统一鉴权：读取 `Authorization: Bearer <token>`，取 sha256 后查成员表。
 * 校验通过则把成员挂到 `c.get('member')`。
 */
export declare function authMiddleware(deps: AppDeps): import("hono").MiddlewareHandler<Env, string, {}, Response>;
//# sourceMappingURL=auth.d.ts.map