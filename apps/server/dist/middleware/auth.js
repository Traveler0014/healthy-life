"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const factory_1 = require("hono/factory");
const shared_1 = require("@healthy-life/shared");
const db_1 = require("@healthy-life/db");
/**
 * 统一鉴权：读取 `Authorization: Bearer <token>`，取 sha256 后查成员表。
 * 校验通过则把成员挂到 `c.get('member')`。
 */
function authMiddleware(deps) {
    return (0, factory_1.createMiddleware)(async (c, next) => {
        const header = c.req.header('Authorization') ?? '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : '';
        if (!token)
            return c.json({ error: 'unauthorized' }, 401);
        const member = (0, db_1.getMemberByTokenHash)(deps.db, (0, shared_1.sha256)(token));
        if (!member || member.status !== 'active')
            return c.json({ error: 'unauthorized' }, 401);
        c.set('member', member);
        await next();
    });
}
//# sourceMappingURL=auth.js.map