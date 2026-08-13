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
  /** 个人目标就寝时间，'HH:mm'（本地时间锚点，跟着人走，跨时区/旅行不变） */
  targetBedtime: string;
  /** 最近一次打卡/加入时的设备时区（IANA，如 America/New_York） */
  lastTimezone: string;
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
  /** 打卡日 'YYYY-MM-DD'（按打卡时的设备时区 + 日切边界归入） */
  date: string;
  /** 实际打卡的 ISO 时间戳 */
  checkedInAt: string;
  /** 打卡那一刻的设备时区（IANA），用于重判早/晚 */
  timezone: string;
  /** 白天打卡时，用户自选的睡眠状态标签（如「上夜班中」），null 用默认「白日做梦中」 */
  customLabel: string | null;
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
