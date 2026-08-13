export interface PublishOptions {
  title?: string;
  priority?: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
}

export interface NotifyClient {
  publish(topic: string, message: string, opts?: PublishOptions): Promise<void>;
}

/** 基于 ntfy 的极简发布客户端（Node 18+ 全局 fetch）。 */
export function createNotifyClient(baseUrl: string, token?: string): NotifyClient {
  const base = baseUrl.replace(/\/+$/, '');
  return {
    async publish(topic, message, opts = {}) {
      const url = `${base}/${encodeURIComponent(topic)}`;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (opts.title) headers['X-Title'] = opts.title;
      if (opts.tags && opts.tags.length > 0) headers['X-Tags'] = opts.tags.join(',');
      if (opts.priority) headers['X-Priority'] = String(opts.priority);

      const res = await fetch(url, { method: 'POST', headers, body: message });
      if (!res.ok) throw new Error(`ntfy publish failed (${res.status}) for topic "${topic}"`);
    },
  };
}
