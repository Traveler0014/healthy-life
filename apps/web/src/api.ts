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

export interface BoardEntry {
  memberId: string;
  nickname: string;
  emoji: string;
  checkedIn: boolean;
  /** 仅 visibility === 'exact' 且已打卡时存在 */
  checkedInAt?: string;
}

export interface BoardResponse {
  date: string;
  visibility: 'exact' | 'presence';
  members: BoardEntry[];
}

export interface StatsResponse {
  earlyDays: number;
  lateDays: number;
  /** 早睡占比 = early / (early + late) */
  earlyRate: number;
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
  /** 公开端点：用邀请码加入 */
  join: (body: { inviteCode: string; nickname: string; targetBedtime?: string }) =>
    request<JoinResponse>('/join', { method: 'POST', body }),
  me: () => request<MeResponse>('/me'),
  checkin: () => request<CheckinResponse>('/checkin', { method: 'POST' }),
  today: () => request<TodayResponse>('/checkin/today'),
  board: () => request<BoardResponse>('/board'),
  stats: () => request<StatsResponse>('/stats'),
};
