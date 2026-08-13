import { loadConfig } from '@healthy-life/shared';
import { getDb, migrate } from '@healthy-life/db';
import { registerTasks } from './schedule';

const config = loadConfig();
const db = getDb(config.dbPath);
migrate(db);

registerTasks({ config, db });
