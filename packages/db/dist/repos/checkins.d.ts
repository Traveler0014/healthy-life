import type { Db } from '../client';
import type { Checkin } from '@healthy-life/shared';
/** 幂等写入：同一成员同一打卡日只有一条，重复调用更新打卡时间。 */
export declare function upsertCheckin(db: Db, input: {
    memberId: string;
    date: string;
    checkedInAt: string;
}): Checkin;
export declare function getCheckin(db: Db, memberId: string, date: string): Checkin | undefined;
export declare function listCheckinsForMember(db: Db, memberId: string, from?: string, to?: string): Checkin[];
export declare function listCheckinsForGroup(db: Db, groupId: string, from?: string, to?: string): Checkin[];
//# sourceMappingURL=checkins.d.ts.map