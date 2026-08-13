"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyNight = classifyNight;
const day_1 = require("./day");
const pad = (n) => String(n).padStart(2, '0');
/**
 * 判定某一晚的结果：早睡 / 晚睡 / 无记录。
 * - 无记录（没打卡）→ missing，不纳入早/晚统计、无惩罚
 * - 有记录：墙上时钟 ≤ 目标就寝时间 → early，否则 late
 *
 * 目标就寝时间 targetBedtime 为 'HH:mm'（群时区），比较用字符串即可（已补零）。
 */
function classifyNight(opts) {
    if (!opts.checkedInAt)
        return 'missing';
    const wc = (0, day_1.wallClock)(opts.timezone, new Date(opts.checkedInAt));
    const hm = `${pad(wc.hour)}:${pad(wc.minute)}`;
    return hm <= opts.targetBedtime ? 'early' : 'late';
}
//# sourceMappingURL=sleep.js.map