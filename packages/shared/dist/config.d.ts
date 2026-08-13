export interface AppConfig {
    port: number;
    baseUrl: string;
    dbPath: string;
    ntfyBaseUrl: string;
    ntfyToken: string;
    ntfyTopicReminder: string;
    ntfyTopicReport: string;
    timezone: string;
    dayBoundaryHour: number;
    reminderTime: string;
    reportTime: string;
}
export declare function loadConfig(env?: NodeJS.ProcessEnv): AppConfig;
//# sourceMappingURL=config.d.ts.map