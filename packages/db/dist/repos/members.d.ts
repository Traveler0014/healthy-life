import type { Db } from '../client';
import type { Member, Role } from '@healthy-life/shared';
export declare function createMember(db: Db, input: {
    groupId: string;
    nickname: string;
    emoji?: string;
    targetBedtime?: string;
    tokenHash: string;
    role?: Role;
}): Member;
export declare function getMemberById(db: Db, id: string): Member | undefined;
export declare function getMemberByTokenHash(db: Db, tokenHash: string): Member | undefined;
export declare function listMembers(db: Db, groupId: string): Member[];
export declare function updateMember(db: Db, id: string, patch: Partial<Pick<Member, 'nickname' | 'emoji' | 'targetBedtime' | 'role' | 'status'>>): Member | undefined;
//# sourceMappingURL=members.d.ts.map