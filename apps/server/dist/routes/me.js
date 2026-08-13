"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meRoutes = void 0;
const hono_1 = require("hono");
/**
 * 示例路由：返回当前登录成员。
 * 既验证了鉴权链路，也是后续 agent 挂载业务路由的参考范式。
 */
exports.meRoutes = new hono_1.Hono();
exports.meRoutes.get('/me', (c) => c.json({ member: c.get('member') }));
//# sourceMappingURL=me.js.map