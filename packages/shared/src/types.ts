export type Role = 'admin' | 'member';
export type MemberStatus = 'active' | 'disabled';
export type GroupVisibility = 'exact' | 'presence';

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  timezone: string;
  /** 打卡墙可见性：exact=精确时间；presence=仅显示是否已打卡 */
  visibility: GroupVisibility;
  createdAt: string;
}

export interface Member {
  id: string;
  groupId: string;
  nickname: string;
  emoji: string;
  /** 个人目标就寝时间，'HH:mm'（按群时区） */
  targetBedtime: string;
  /** 邀请令牌的 sha256，不存明文 */
  tokenHash: string;
  role: Role;
  status: MemberStatus;
  createdAt: string;
}

export interface Checkin {
  id: string;
  memberId: string;
  /** 打卡日 'YYYY-MM-DD'（按群时区 + 日切边界归入） */
  date: string;
  /** 实际打卡的 ISO 时间戳 */
  checkedInAt: string;
  createdAt: string;
  updatedAt: string;
}
