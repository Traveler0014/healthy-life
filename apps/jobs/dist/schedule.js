"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTasks = registerTasks;
const node_cron_1 = __importDefault(require("node-cron"));
const reminder_1 = require("./tasks/reminder");
const report_1 = require("./tasks/report");
function toCron(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return `${m} ${h} * * *`;
}
function registerTasks(deps) {
    node_cron_1.default.schedule(toCron(deps.config.reminderTime), () => (0, reminder_1.runReminder)(deps));
    node_cron_1.default.schedule(toCron(deps.config.reportTime), () => (0, report_1.runReport)(deps));
    console.log(`[jobs] scheduled: reminder=${deps.config.reminderTime} report=${deps.config.reportTime} (tz=${deps.config.timezone})`);
}
//# sourceMappingURL=schedule.js.map