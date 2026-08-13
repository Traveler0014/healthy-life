"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrate = migrate;
const schema_1 = require("./schema");
const migrations = [{ version: 1, sql: schema_1.SCHEMA_V1 }];
function migrate(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`);
    const applied = new Set(db.prepare(`SELECT version FROM schema_migrations`).all().map((r) => r.version));
    const apply = db.transaction(() => {
        for (const m of migrations) {
            if (applied.has(m.version))
                continue;
            db.exec(m.sql);
            db.prepare(`INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`).run(m.version, new Date().toISOString());
        }
    });
    apply();
}
//# sourceMappingURL=migrate.js.map