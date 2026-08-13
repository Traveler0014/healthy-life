import { createHash, randomBytes } from 'node:crypto';

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** 生成随机令牌（邀请链接 / 成员 token 用），默认 24 字节 → 48 位 hex */
export function generateToken(bytes = 24): string {
  return randomBytes(bytes).toString('hex');
}

/** 口令加盐哈希（sha256，朋友工具够用；无需 bcrypt 依赖） */
export function hashPassword(password: string, salt: string): string {
  return sha256(`healthy-life:pwd:${salt}:${password}`);
}

/**
 * 从 (群ID + 昵称 + 口令) 确定性派生「打卡链接 token」。
 * 确定性派生 ⇒ 链接稳定不变；服务端只存 sha256(token)，找回时可重算同一条链接。
 */
export function deriveLinkToken(groupId: string, nickname: string, password: string): string {
  return sha256(`healthy-life:link:${groupId}:${nickname}:${password}`);
}
