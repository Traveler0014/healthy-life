import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { resolve } from 'node:path';
import type { AppDeps, Env } from './types';
import { authMiddleware } from './middleware/auth';
import { meRoutes } from './routes/me';

export function createApp(deps: AppDeps): Hono<Env> {
  const app = new Hono<Env>();

  app.get('/healthz', (c) => c.json({ ok: true, time: new Date().toISOString() }));

  // 所有业务接口统一走鉴权；Phase 1 的 route（auth/checkin/report/groups）挂载到这里。
  // API 契约见 docs/03-api.md
  app.use('/api/*', authMiddleware(deps));
  app.route('/api/v1', meRoutes);

  // 托管 web 构建产物（SPA）
  app.use('*', serveStatic({ root: resolve(process.cwd(), 'apps/web/dist') }));

  return app;
}
