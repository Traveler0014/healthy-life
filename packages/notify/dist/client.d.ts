export interface PublishOptions {
    title?: string;
    priority?: 1 | 2 | 3 | 4 | 5;
    tags?: string[];
}
export interface NotifyClient {
    publish(topic: string, message: string, opts?: PublishOptions): Promise<void>;
}
/** 基于 ntfy 的极简发布客户端（Node 18+ 全局 fetch）。 */
export declare function createNotifyClient(baseUrl: string, token?: string): NotifyClient;
//# sourceMappingURL=client.d.ts.map