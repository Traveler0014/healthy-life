import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { readFileSync } from 'node:fs';
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
import { adminPromptRoutes } from './routes/adminPrompts';
import { eventRoutes } from './routes/events';
import { notifyRoutes } from './routes/notify';
import { promptRoutes } from './routes/prompts';

/** 若配置了自定义 favicon，替换 index.html 里的默认月亮图标（icon + apple-touch-icon）。 */
function injectFavicon(html: string, faviconUrl: string): string {
  if (!faviconUrl) return html;
  return html
    .replace(
      '<link rel="icon" href="/icon.svg" type="image/svg+xml" />',
      `<link rel="icon" href="${faviconUrl}" />`,
    )
    .replace(
      '<link rel="apple-touch-icon" href="/icon.svg" />',
      `<link rel="apple-touch-icon" href="${faviconUrl}" />`,
    );
}

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
  app.route('/api/v1', promptRoutes(deps)); // GET /prompts/categories, POST /prompts/random, GET /prompts/history
  app.route('/api/v1', adminRoutes(deps)); // PATCH /admin/password
  app.route('/api/v1', adminPromptRoutes(deps)); // 题库管理（admin）
  app.route('/api/v1', groupRoutes(deps)); // 房间/成员管理（admin）

  // 托管 web 构建产物（SPA）。
  // dev 模式下（pnpm --filter 会把 cwd 切到 apps/server，且通常未 build）产物可能缺失：
  // 此时跳过静态托管，仅提供 API（前端由 vite dev server + /api 代理访问）。
  const webCandidates = [
    resolve(process.cwd(), 'apps/web/dist'), // 仓库根目录运行（node apps/server/dist/index.js / Docker）
    resolve(process.cwd(), 'web/dist'),
    resolve(process.cwd(), '../web/dist'), // pnpm --filter 运行时 cwd = apps/server
  ];
  let webRoot: string | null = null;
  let indexHtml: string | null = null;
  for (const candidate of webCandidates) {
    try {
      if (readFileSync(resolve(candidate, 'index.html'), 'utf-8')) {
        webRoot = candidate;
        indexHtml = injectFavicon(
          readFileSync(resolve(webRoot, 'index.html'), 'utf-8'),
          deps.config.faviconUrl,
        );
        break;
      }
    } catch {
      // 尝试下一个候选路径
    }
  }

  if (indexHtml && webRoot) {
    // SPA 入口（/、/c/:token、/i/:invite、/admin 等无扩展名路径）→ 返回注入后的 index.html
    app.use('*', async (c, next) => {
      const p = c.req.path;
      if (p.startsWith('/api/') || /\.[a-zA-Z0-9]+$/.test(p)) return next();
      return c.html(indexHtml);
    });

    // 静态资源（icon.svg / manifest / assets/* 等带扩展名文件）
    app.use(
      '*',
      serveStatic({
        root: webRoot,
        rewriteRequestPath: (path) => path,
      }),
    );
  }

  return app;
}
