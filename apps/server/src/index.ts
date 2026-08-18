import { serve } from '@hono/node-server';
import { loadConfig } from '@healthy-life/shared';
import { CORE_BUNDLE } from '@healthy-life/prompts';
import { getDb, migrate, ensureSystemGroup, ensureAdmin, seedPromptsFromBundle } from '@healthy-life/db';
import { createApp } from './app';

const config = loadConfig();
const db = getDb(config.dbPath);
migrate(db);
ensureSystemGroup(db);
ensureAdmin(db, config.adminPassword);
// 题库首启 seed：prompts 表为空时导入内置包；之后由 admin 导入/定时任务更新
seedPromptsFromBundle(db, CORE_BUNDLE);

const app = createApp({ config, db });

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`[server] healthy-life listening on http://localhost:${info.port}`);
});
