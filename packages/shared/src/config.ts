import {
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_DAY_BOUNDARY_HOUR,
  DEFAULT_REMINDER_TIME,
  DEFAULT_REPORT_TIME,
  DEFAULT_TIMEZONE,
} from './constants';

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
  /** 系统管理员默认口令（仅首次创建 admin 时用） */
  adminPassword: string;
  /** 网页 favicon（浏览器标签页图标）URL，留空用默认月亮 /icon.svg */
  faviconUrl: string;
  /** 外部题目包发布产物 URL（如 GitHub Release bundle.json），留空则 jobs 不自动更新题库 */
  promptBundleUrl: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env.PORT ?? 8787),
    baseUrl: env.BASE_URL ?? 'http://localhost:8787',
    dbPath: env.DB_PATH ?? './data/healthy-life.db',
    ntfyBaseUrl: env.NTFY_BASE_URL ?? 'https://ntfy.sh',
    ntfyToken: env.NTFY_TOKEN ?? '',
    ntfyTopicReminder: env.NTFY_TOPIC_REMINDER ?? 'healthy-life-reminder',
    ntfyTopicReport: env.NTFY_TOPIC_REPORT ?? 'healthy-life-report',
    timezone: env.TIMEZONE ?? DEFAULT_TIMEZONE,
    dayBoundaryHour: Number(env.DAY_BOUNDARY_HOUR ?? DEFAULT_DAY_BOUNDARY_HOUR),
    reminderTime: env.REMINDER_TIME ?? DEFAULT_REMINDER_TIME,
    reportTime: env.REPORT_TIME ?? DEFAULT_REPORT_TIME,
    adminPassword: env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD,
    faviconUrl: env.FAVICON_URL ?? '',
    promptBundleUrl: env.PROMPT_BUNDLE_URL ?? '',
  };
}
