import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { resolve } from 'node:path';
import type { AppDeps, Env } from './types';
import { authMiddleware } from './middleware/auth';
import { meRoutes } from './routes/me';
import { joinRoutes } from './routes/join';
import { profileRoutes } from './routes/profile';
import { checkinRoutes } from './routes/checkin';
import { boardRoutes } from './routes/board';
import { statsRoutes } from './routes/stats';
import { groupRoutes } from './routes/groups';
import { adminPublicRoutes, adminRoutes } from './routes/admin';
import { eventRoutes } from './routes/events';
import { notifyRoutes } from './routes/notify';

export function createApp(deps: AppDeps): Hono<Env> {
  const app = new Hono<Env>();

  app.get('/healthz', (c) => c.json({ ok: true, time: new Date().toISOString() }));

  // 公开端点（无需鉴权）：必须在 authMiddleware 之前注册。
  app.route('/api/v1', joinRoutes(deps)); // POST /join
  app.route('/api/v1', adminPublicRoutes(deps)); // POST /admin/login

  // 其余业务接口统一走鉴权。
  app.use('/api/*', authMiddleware(deps));

  app.route('/api/v1', meRoutes(deps)); // GET /me
  app.route('/api/v1', profileRoutes(deps)); // PATCH /me
  app.route('/api/v1', checkinRoutes(deps)); // POST /checkin, GET /checkin/today
  app.route('/api/v1', boardRoutes(deps)); // GET /board
  app.route('/api/v1', statsRoutes(deps)); // GET /stats
  app.route('/api/v1', eventRoutes(deps)); // POST /events
  app.route('/api/v1', notifyRoutes(deps)); // POST /notify/test
  app.route('/api/v1', adminRoutes(deps)); // PATCH /admin/password
  app.route('/api/v1', groupRoutes(deps)); // 房间/成员管理（admin）

  // 托管 web 构建产物（SPA）。
  // 前端路由（如 /i/<inviteCode>）在 dist 下没有对应文件，需要回退到 index.html。
  app.use(
    '*',
    serveStatic({
      root: resolve(process.cwd(), 'apps/web/dist'),
      rewriteRequestPath: (path) => {
        // API 由前面的路由处理；带扩展名的是真实静态资源；其余回退到 index.html（SPA）
        if (path.startsWith('/api/')) return path;
        if (path === '/' || !/\.[a-zA-Z0-9]+$/.test(path)) return '/index.html';
        return path;
      },
    }),
  );

  return app;
}
