import { createHash, randomBytes } from 'node:crypto';

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** 生成随机令牌（邀请链接 / 成员 token 用），默认 24 字节 → 48 位 hex */
export function generateToken(bytes = 24): string {
  return randomBytes(bytes).toString('hex');
}
