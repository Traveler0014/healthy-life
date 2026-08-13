import type { Db } from '../client';
import type { Group, GroupVisibility } from '@healthy-life/shared';
export declare function createGroup(db: Db, input: {
    name: string;
    inviteCode: string;
    timezone?: string;
    visibility?: GroupVisibility;
}): Group;
export declare function getGroupById(db: Db, id: string): Group | undefined;
export declare function getGroupByInviteCode(db: Db, inviteCode: string): Group | undefined;
//# sourceMappingURL=groups.d.ts.map