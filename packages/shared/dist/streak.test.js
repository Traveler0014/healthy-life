"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const streak_1 = require("./streak");
(0, vitest_1.describe)('computeStreak', () => {
    (0, vitest_1.it)('counts consecutive days ending today', () => {
        (0, vitest_1.expect)((0, streak_1.computeStreak)(['2026-01-01', '2026-01-02', '2026-01-03'], '2026-01-03')).toEqual({
            current: 3,
            longest: 3,
        });
    });
    (0, vitest_1.it)('tolerates today not yet recorded', () => {
        (0, vitest_1.expect)((0, streak_1.computeStreak)(['2026-01-01', '2026-01-02'], '2026-01-03')).toEqual({
            current: 2,
            longest: 2,
        });
    });
    (0, vitest_1.it)('breaks when yesterday missing', () => {
        (0, vitest_1.expect)((0, streak_1.computeStreak)(['2026-01-01'], '2026-01-03')).toEqual({ current: 0, longest: 1 });
    });
    (0, vitest_1.it)('computes longest across gaps', () => {
        (0, vitest_1.expect)((0, streak_1.computeStreak)(['2026-01-01', '2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07'], '2026-01-07')).toEqual({ current: 3, longest: 3 });
    });
});
//# sourceMappingURL=streak.test.js.map