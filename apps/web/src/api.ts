/**
 * 前端 API 客户端。
 * 契约以 docs/03-api.md + apps/server 实际实现为准。
 * - 前缀 /api/v1（dev 下由 Vite 代理到 :8787）
 * - token 存 localStorage，请求带 Authorization: Bearer <token>
 */

export type Role = 'admin' | 'member';
export type MemberStatus = 'active' | 'disabled';
export type Outcome = 'early' | 'late' | 'missing';

export interface Member {
  id: string;
  groupId: string;
  nickname: string;
  emoji: string;
  /** 'HH:mm'，个人目标就寝时间（群时区） */
  targetBedtime: string;
  role: Role;
  status: MemberStatus;
  createdAt: string;
}

export interface Checkin {
  id: string;
  memberId: string;
  /** 打卡日 'YYYY-MM-DD' */
  date: string;
  /** 实际打卡 ISO 时间戳 */
  checkedInAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface JoinResponse {
  member: Member;
  /** 明文 token 只返回一次 */
  token: string;
  /** 完整打卡链接 BASE_URL/c/<token>（可收藏/跨设备） */
  link: string;
}

export interface MeResponse {
  member: Member;
}

export interface CheckinResponse {
  checkin: Checkin;
  outcome: 'early' | 'late';
  message: string;
}

export interface TodayResponse {
  date: string;
  checkedIn: boolean;
  checkin: Checkin | null;
  outcome: Outcome;
}

export type BoardStatus = 'sleeping' | 'reversed' | 'not-slept' | 'awake';

export interface BoardEntry {
  memberId: string;
  nickname: string;
  emoji: string;
  status: BoardStatus;
  /** 该成员当前时区（IANA） */
  timezone?: string;
  /** 原始打卡 ISO 时间戳（用于相对时间显示） */
  checkedInAt?: string;
  /** 已按该成员时区格式化（HH:mm），仅 sleeping/reversed 且 exact 时存在 */
  checkedInAtLocal?: string;
}

export interface BoardResponse {
  visibility: 'exact' | 'presence';
  members: BoardEntry[];
}

export interface StatsResponse {
  earlyDays: number;
  lateDays: number;
  /** 早睡占比 = early / (early + late) */
  earlyRate: number;
}

export interface RecordEventResponse {
  event: {
    id: string;
    memberId: string;
    type: string;
    date: string;
    occurredAt: string;
    payload: string | null;
    createdAt: string;
  };
}

const TOKEN_KEY = 'healthy-life:token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
  } catch {
    return 'Asia/Shanghai';
  }
}

export function timezoneName(tz: string): string {
  try {
    const part = new Intl.DateTimeFormat('zh-CN', { timeZone: tz, timeZoneName: 'short' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName');
    return part?.value ?? tz;
  } catch {
    return tz;
  }
}

/** 相对时间：刚刚 / X分钟前 / X小时前 / X天前（跨时区友好） */
export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api/v1${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(data?.error ?? `请求失败（${res.status}）`, res.status);
  }

  return (await res.json()) as T;
}

export const api = {
  /** 公开端点：注册 / 找回合一（同昵称+口令再次调用 = 找回同一条链接） */
  join: (body: {
    inviteCode: string;
    nickname: string;
    password: string;
    targetBedtime?: string;
    emoji?: string;
  }) =>
    request<JoinResponse>('/join', {
      method: 'POST',
      body: { ...body, timezone: getBrowserTimezone() },
    }),
  me: () => request<MeResponse>('/me'),
  checkin: () =>
    request<CheckinResponse>('/checkin', {
      method: 'POST',
      body: { timezone: getBrowserTimezone() },
    }),
  today: () => request<TodayResponse>('/checkin/today'),
  board: () => request<BoardResponse>('/board'),
  stats: () => request<StatsResponse>('/stats'),
  recordEvent: (type: string, payload?: unknown) =>
    request<RecordEventResponse>('/events', { method: 'POST', body: { type, payload } }),
};
