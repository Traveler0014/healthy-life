"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const hono_1 = require("hono");
const serve_static_1 = require("@hono/node-server/serve-static");
const node_path_1 = require("node:path");
const auth_1 = require("./middleware/auth");
const me_1 = require("./routes/me");
function createApp(deps) {
    const app = new hono_1.Hono();
    app.get('/healthz', (c) => c.json({ ok: true, time: new Date().toISOString() }));
    // 所有业务接口统一走鉴权；Phase 1 的 route（auth/checkin/report/groups）挂载到这里。
    // API 契约见 docs/03-api.md
    app.use('/api/*', (0, auth_1.authMiddleware)(deps));
    app.route('/api/v1', me_1.meRoutes);
    // 托管 web 构建产物（SPA）
    app.use('*', (0, serve_static_1.serveStatic)({ root: (0, node_path_1.resolve)(process.cwd(), 'apps/web/dist') }));
    return app;
}
//# sourceMappingURL=app.js.map