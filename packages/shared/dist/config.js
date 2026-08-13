"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const constants_1 = require("./constants");
function loadConfig(env = process.env) {
    return {
        port: Number(env.PORT ?? 8787),
        baseUrl: env.BASE_URL ?? 'http://localhost:8787',
        dbPath: env.DB_PATH ?? './data/healthy-life.db',
        ntfyBaseUrl: env.NTFY_BASE_URL ?? 'https://ntfy.sh',
        ntfyToken: env.NTFY_TOKEN ?? '',
        ntfyTopicReminder: env.NTFY_TOPIC_REMINDER ?? 'healthy-life-reminder',
        ntfyTopicReport: env.NTFY_TOPIC_REPORT ?? 'healthy-life-report',
        timezone: env.TIMEZONE ?? constants_1.DEFAULT_TIMEZONE,
        dayBoundaryHour: Number(env.DAY_BOUNDARY_HOUR ?? constants_1.DEFAULT_DAY_BOUNDARY_HOUR),
        reminderTime: env.REMINDER_TIME ?? constants_1.DEFAULT_REMINDER_TIME,
        reportTime: env.REPORT_TIME ?? constants_1.DEFAULT_REPORT_TIME,
    };
}
//# sourceMappingURL=config.js.map