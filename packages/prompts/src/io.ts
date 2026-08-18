/**
 * 题目包的网络获取与解析（供 server 导入接口与 jobs 定时更新共用）。
 *
 * 安全约束：
 * - 仅允许公网 http/https，拒绝内网/环回地址（防 SSRF）
 * - 限制拉取大小与超时
 */
import { lookup } from 'node:dns/promises';
import { validateBundle, type PromptBundle } from './types';

export const MAX_BUNDLE_TEXT = 2 * 1024 * 1024; // 直接 POST 的 JSON 文本上限 2MB
export const MAX_BUNDLE_URL_BYTES = 5 * 1024 * 1024; // URL 拉取上限 5MB
const FETCH_TIMEOUT_MS = 10_000;

/** 轻量 SSRF 防护：只允许公网 http/https，拒绝内网/环回地址。 */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('URL 格式不正确');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('仅支持 http/https 地址');
  }
  const host = url.hostname;
  const isIpLiteral = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':');
  if (isIpLiteral) {
    const first = host.split('.')[0];
    if (
      host === 'localhost' ||
      host === '::1' ||
      host === '::' ||
      first === '0' ||
      first === '10' ||
      first === '127' ||
      first === '169' ||
      first === '192' ||
      first === '172'
    ) {
      throw new Error('不允许访问内网地址');
    }
  } else {
    try {
      const { address } = await lookup(host);
      const first = address.split('.')[0];
      if (
        address === '127.0.0.1' ||
        address === '::1' ||
        first === '0' ||
        first === '10' ||
        first === '127' ||
        first === '169' ||
        first === '192' ||
        first === '172'
      ) {
        throw new Error('不允许访问内网地址');
      }
    } catch (err) {
      if (err instanceof Error && err.message === '不允许访问内网地址') throw err;
      throw new Error('无法解析域名');
    }
  }
  return url;
}

export async function fetchBundleText(url: string): Promise<string> {
  const u = await assertPublicHttpUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(u, { signal: controller.signal, redirect: 'follow' });
    if (!res.ok) throw new Error(`拉取失败：HTTP ${res.status}`);
    const length = Number(res.headers.get('content-length') ?? 0);
    if (length > MAX_BUNDLE_URL_BYTES) throw new Error('题目包超过大小上限');
    const text = await res.text();
    if (text.length > MAX_BUNDLE_URL_BYTES) throw new Error('题目包超过大小上限');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export function parseBundleText(text: string): PromptBundle {
  if (text.length > MAX_BUNDLE_TEXT) throw new Error('题目包 JSON 超过大小上限');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('不是合法的 JSON');
  }
  const validation = validateBundle(parsed);
  if (!validation.ok) {
    throw new Error(`题目包校验失败：${validation.errors.slice(0, 5).join('；')}`);
  }
  return parsed as PromptBundle;
}
