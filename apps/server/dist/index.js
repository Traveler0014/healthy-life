"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_server_1 = require("@hono/node-server");
const shared_1 = require("@healthy-life/shared");
const db_1 = require("@healthy-life/db");
const app_1 = require("./app");
const config = (0, shared_1.loadConfig)();
const db = (0, db_1.getDb)(config.dbPath);
(0, db_1.migrate)(db);
const app = (0, app_1.createApp)({ config, db });
(0, node_server_1.serve)({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`[server] healthy-life listening on http://localhost:${info.port}`);
});
//# sourceMappingURL=index.js.map