import Database from 'better-sqlite3';
export type Db = Database.Database;
/** 进程内单例打开 SQLite（WAL + 外键）。路径默认可被 DB_PATH 覆盖。 */
export declare function getDb(path?: string): Db;
export declare function closeDb(): void;
//# sourceMappingURL=client.d.ts.map