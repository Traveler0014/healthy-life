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
  /** 打卡链接 token 的 sha256，不存明文（token 由 群+昵称+口令 确定性派生） */
  tokenHash: string;
  /** 口令的加盐哈希，不存明文 */
  passwordHash: string;
  /** 口令盐 */
  passwordSalt: string;
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

export interface Event {
  id: string;
  memberId: string;
  /** 开放类型，如 'visit_after_checkin'、'prompt_claimed'、'prompt_viewed' */
  type: string;
  /** 打卡日 'YYYY-MM-DD'（群时区） */
  date: string;
  /** 事件发生 ISO 时间戳 */
  occurredAt: string;
  /** JSON 字符串，可空，存类型特定的附加数据 */
  payload: string | null;
  createdAt: string;
}
