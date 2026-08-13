"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("@healthy-life/shared");
const db_1 = require("@healthy-life/db");
const schedule_1 = require("./schedule");
const config = (0, shared_1.loadConfig)();
const db = (0, db_1.getDb)(config.dbPath);
(0, db_1.migrate)(db);
(0, schedule_1.registerTasks)({ config, db });
//# sourceMappingURL=index.js.map