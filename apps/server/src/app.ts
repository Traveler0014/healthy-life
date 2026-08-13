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
import { groupPublicRoutes, groupRoutes } from './routes/groups';

export function createApp(deps: AppDeps): Hono<Env> {
  const app = new Hono<Env>();

  app.get('/healthz', (c) => c.json({ ok: true, time: new Date().toISOString() }));

  // 公开端点（无需鉴权）：必须在 authMiddleware 之前注册。
  app.route('/api/v1', joinRoutes(deps)); // POST /join
  app.route('/api/v1', groupPublicRoutes(deps)); // POST /groups

  // 其余业务接口统一走鉴权。
  app.use('/api/*', authMiddleware(deps));

  app.route('/api/v1', meRoutes); // GET /me
  app.route('/api/v1', profileRoutes(deps)); // PATCH /me
  app.route('/api/v1', checkinRoutes(deps)); // POST /checkin, GET /checkin/today
  app.route('/api/v1', boardRoutes(deps)); // GET /board
  app.route('/api/v1', statsRoutes(deps)); // GET /stats
  app.route('/api/v1', groupRoutes(deps)); // 群管理（admin）

  // 托管 web 构建产物（SPA）
  app.use('*', serveStatic({ root: resolve(process.cwd(), 'apps/web/dist') }));

  return app;
}
