"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wallClock = wallClock;
exports.addDays = addDays;
exports.currentCheckinDay = currentCheckinDay;
const constants_1 = require("./constants");
const pad = (n) => String(n).padStart(2, '0');
/** 返回某一时刻在指定时区的「墙上时钟」 */
function wallClock(tz, now = new Date()) {
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
    const parts = {};
    for (const p of fmt.formatToParts(now))
        parts[p.type] = p.value;
    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        hour: Number(parts.hour) % 24,
        minute: Number(parts.minute),
        second: Number(parts.second),
    };
}
/** 在 'YYYY-MM-DD' 上加减天数（UTC 运算，避免时区/夏令时 bug） */
function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + n));
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}
/**
 * 当前「打卡日」（YYYY-MM-DD）。
 * 规则：若墙上时钟的小时数 < 日切边界小时，则归入前一天。
 * 例如边界=5：凌晨 04:30 打卡仍算「昨晚」；05:30 起算「今天」。
 */
function currentCheckinDay(tz, now = new Date(), boundaryHour = constants_1.DEFAULT_DAY_BOUNDARY_HOUR) {
    const wc = wallClock(tz, now);
    const base = `${wc.year}-${pad(wc.month)}-${pad(wc.day)}`;
    return wc.hour < boundaryHour ? addDays(base, -1) : base;
}
//# sourceMappingURL=day.js.map