"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const day_1 = require("./day");
(0, vitest_1.describe)('addDays', () => {
    (0, vitest_1.it)('handles month boundary', () => {
        (0, vitest_1.expect)((0, day_1.addDays)('2026-01-31', 1)).toBe('2026-02-01');
        (0, vitest_1.expect)((0, day_1.addDays)('2026-03-01', -1)).toBe('2026-02-28');
    });
});
(0, vitest_1.describe)('currentCheckinDay', () => {
    const tz = 'Asia/Shanghai'; // UTC+8
    (0, vitest_1.it)('before boundary hour counts as previous day', () => {
        // 上海 2026-01-02 04:30 = UTC 2026-01-01 20:30
        (0, vitest_1.expect)((0, day_1.currentCheckinDay)(tz, new Date('2026-01-01T20:30:00Z'), 5)).toBe('2026-01-01');
    });
    (0, vitest_1.it)('after boundary hour counts as same day', () => {
        // 上海 2026-01-02 05:30 = UTC 2026-01-01 21:30
        (0, vitest_1.expect)((0, day_1.currentCheckinDay)(tz, new Date('2026-01-01T21:30:00Z'), 5)).toBe('2026-01-02');
    });
});
//# sourceMappingURL=day.test.js.map