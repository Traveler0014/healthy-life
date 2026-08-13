import type { Db } from './client';
import {
  ADMIN_NICKNAME,
  SYSTEM_GROUP_ID,
  deriveLinkToken,
  generateToken,
  hashPassword,
  sha256,
  type Member,
  type Group,
} from '@healthy-life/shared';
import { createGroup, getGroupById } from './repos/groups';
import { createMember, getMemberByNickname } from './repos/members';

/** 确保内置「系统群」存在（系统管理员所在，不对外展示） */
export function ensureSystemGroup(db: Db): Group {
  const existing = getGroupById(db, SYSTEM_GROUP_ID);
  if (existing) return existing;
  return createGroup(db, {
    id: SYSTEM_GROUP_ID,
    name: '系统',
    inviteCode: '__system_invite__',
    timezone: 'Asia/Shanghai',
    visibility: 'presence',
  });
}

/**
 * 确保系统管理员存在（仅首次创建时用默认口令；已存在则不覆盖，管理员可能已改过口令）。
 */
export function ensureAdmin(db: Db, password: string): Member {
  const existing = getMemberByNickname(db, SYSTEM_GROUP_ID, ADMIN_NICKNAME);
  if (existing) return existing;

  const salt = generateToken(16);
  const linkToken = deriveLinkToken(SYSTEM_GROUP_ID, ADMIN_NICKNAME, password);
  return createMember(db, {
    groupId: SYSTEM_GROUP_ID,
    nickname: ADMIN_NICKNAME,
    emoji: '🛠️',
    targetBedtime: '23:00',
    tokenHash: sha256(linkToken),
    passwordHash: hashPassword(password, salt),
    passwordSalt: salt,
    role: 'admin',
  });
}
