import type { AppConfig, Member } from '@healthy-life/shared';
import type { Db } from '@healthy-life/db';
export interface Env {
    Variables: {
        member: Member;
    };
}
export interface AppDeps {
    config: AppConfig;
    db: Db;
}
//# sourceMappingURL=types.d.ts.map