import type { Member } from '@healthy-life/shared';

/** 返回给前端的成员形状：剥离 tokenHash / passwordHash / passwordSalt 等内部字段。 */
export type PublicMember = Omit<Member, 'tokenHash' | 'passwordHash' | 'passwordSalt'>;

export function toPublicMember(m: Member): PublicMember {
  return {
    id: m.id,
    groupId: m.groupId,
    nickname: m.nickname,
    emoji: m.emoji,
    targetBedtime: m.targetBedtime,
    role: m.role,
    status: m.status,
    createdAt: m.createdAt,
  };
}
