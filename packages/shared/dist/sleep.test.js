"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sleep_1 = require("./sleep");
(0, vitest_1.describe)('classifyNight', () => {
    const tz = 'Asia/Shanghai';
    const target = '23:00';
    (0, vitest_1.it)('missing when no check-in', () => {
        (0, vitest_1.expect)((0, sleep_1.classifyNight)({ targetBedtime: target, timezone: tz })).toBe('missing');
    });
    (0, vitest_1.it)('early when before target', () => {
        // 上海 22:50 = UTC 14:50
        (0, vitest_1.expect)((0, sleep_1.classifyNight)({ checkedInAt: '2026-01-01T14:50:00Z', targetBedtime: target, timezone: tz })).toBe('early');
    });
    (0, vitest_1.it)('late when after target', () => {
        // 上海 23:45 = UTC 15:45
        (0, vitest_1.expect)((0, sleep_1.classifyNight)({ checkedInAt: '2026-01-01T15:45:00Z', targetBedtime: target, timezone: tz })).toBe('late');
    });
    (0, vitest_1.it)('equal to target counts as early', () => {
        // 上海 23:00 = UTC 15:00
        (0, vitest_1.expect)((0, sleep_1.classifyNight)({ checkedInAt: '2026-01-01T15:00:00Z', targetBedtime: target, timezone: tz })).toBe('early');
    });
});
//# sourceMappingURL=sleep.test.js.map