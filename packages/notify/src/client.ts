export interface PublishOptions {
  title?: string;
  priority?: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
}

export interface NotifyClient {
  publish(topic: string, message: string, opts?: PublishOptions): Promise<void>;
}

/** HTTP 头只能含 ASCII（ByteString）；非 ASCII 的 title/tags 会被 undici 拒绝。 */
function asciiSafe(s: string): boolean {
  return /^[\x20-\x7E]*$/.test(s);
}

/** 基于 ntfy 的极简发布客户端（Node 18+ 全局 fetch）。 */
export function createNotifyClient(baseUrl: string, token?: string): NotifyClient {
  const base = baseUrl.replace(/\/+$/, '');
  return {
    async publish(topic, message, opts = {}) {
      const url = `${base}/${encodeURIComponent(topic)}`;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      // 中文/emoji 标题无法放入 HTTP 头，只能省略（正文是 UTF-8 不受影响）。
      // TODO(Phase 2): 改用 ntfy 的 JSON publish（POST / 带 JSON body）以支持 UTF-8 title。
      if (opts.title && asciiSafe(opts.title)) headers['X-Title'] = opts.title;
      if (opts.tags && opts.tags.length > 0) {
        const tags = opts.tags.filter(asciiSafe);
        if (tags.length > 0) headers['X-Tags'] = tags.join(',');
      }
      if (opts.priority) headers['X-Priority'] = String(opts.priority);

      const res = await fetch(url, { method: 'POST', headers, body: message });
      if (!res.ok) throw new Error(`ntfy publish failed (${res.status}) for topic "${topic}"`);
    },
  };
}
