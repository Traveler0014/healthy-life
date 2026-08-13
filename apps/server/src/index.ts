import { serve } from '@hono/node-server';
import { loadConfig } from '@healthy-life/shared';
import { getDb, migrate } from '@healthy-life/db';
import { createApp } from './app';

const config = loadConfig();
const db = getDb(config.dbPath);
migrate(db);

const app = createApp({ config, db });

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`[server] healthy-life listening on http://localhost:${info.port}`);
});
