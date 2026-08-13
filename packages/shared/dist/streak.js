"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeStreak = computeStreak;
const day_1 = require("./day");
/**
 * 计算连续天数。
 *
 * `dates` 是「合格日期」集合（YYYY-MM-DD）。对于「隐藏连续早睡」，
 * 调用方只传入「早睡」的日期——这样晚睡/漏打卡那天不在集合里，自然打断连续。
 *
 * 语义：若 `today` 已合格则从 today 往回数；否则（今天尚未产生记录，
 * 不算已断）从昨天往回数。
 */
function computeStreak(dates, today) {
    const set = new Set(dates);
    let current = 0;
    let cursor = set.has(today) ? today : (0, day_1.addDays)(today, -1);
    while (set.has(cursor)) {
        current += 1;
        cursor = (0, day_1.addDays)(cursor, -1);
    }
    let longest = 0;
    let run = 0;
    let prev = null;
    for (const d of [...set].sort()) {
        run = prev && (0, day_1.addDays)(prev, 1) === d ? run + 1 : 1;
        if (run > longest)
            longest = run;
        prev = d;
    }
    return { current, longest };
}
//# sourceMappingURL=streak.js.map