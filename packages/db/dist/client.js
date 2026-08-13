"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.closeDb = closeDb;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
let db = null;
/** 进程内单例打开 SQLite（WAL + 外键）。路径默认可被 DB_PATH 覆盖。 */
function getDb(path = process.env.DB_PATH ?? './data/healthy-life.db') {
    if (db)
        return db;
    (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(path), { recursive: true });
    db = new better_sqlite3_1.default(path);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    return db;
}
function closeDb() {
    db?.close();
    db = null;
}
//# sourceMappingURL=client.js.map