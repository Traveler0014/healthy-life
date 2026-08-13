"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotifyClient = createNotifyClient;
/** 基于 ntfy 的极简发布客户端（Node 18+ 全局 fetch）。 */
function createNotifyClient(baseUrl, token) {
    const base = baseUrl.replace(/\/+$/, '');
    return {
        async publish(topic, message, opts = {}) {
            const url = `${base}/${encodeURIComponent(topic)}`;
            const headers = {};
            if (token)
                headers['Authorization'] = `Bearer ${token}`;
            if (opts.title)
                headers['X-Title'] = opts.title;
            if (opts.tags && opts.tags.length > 0)
                headers['X-Tags'] = opts.tags.join(',');
            if (opts.priority)
                headers['X-Priority'] = String(opts.priority);
            const res = await fetch(url, { method: 'POST', headers, body: message });
            if (!res.ok)
                throw new Error(`ntfy publish failed (${res.status}) for topic "${topic}"`);
        },
    };
}
//# sourceMappingURL=client.js.map