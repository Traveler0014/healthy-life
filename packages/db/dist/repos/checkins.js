"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertCheckin = upsertCheckin;
exports.getCheckin = getCheckin;
exports.listCheckinsForMember = listCheckinsForMember;
exports.listCheckinsForGroup = listCheckinsForGroup;
const node_crypto_1 = require("node:crypto");
function toCheckin(r) {
    return {
        id: r.id,
        memberId: r.member_id,
        date: r.date,
        checkedInAt: r.checked_in_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
/** 幂等写入：同一成员同一打卡日只有一条，重复调用更新打卡时间。 */
function upsertCheckin(db, input) {
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO checkins (id, member_id, date, checked_in_at, created_at, updated_at)
     VALUES (@id, @memberId, @date, @checkedInAt, @createdAt, @updatedAt)
     ON CONFLICT (member_id, date) DO UPDATE SET
       checked_in_at = excluded.checked_in_at,
       updated_at = excluded.updated_at`).run({
        id: (0, node_crypto_1.randomUUID)(),
        memberId: input.memberId,
        date: input.date,
        checkedInAt: input.checkedInAt,
        createdAt: now,
        updatedAt: now,
    });
    return getCheckin(db, input.memberId, input.date);
}
function getCheckin(db, memberId, date) {
    const row = db.prepare(`SELECT * FROM checkins WHERE member_id = ? AND date = ?`).get(memberId, date);
    return row ? toCheckin(row) : undefined;
}
function listCheckinsForMember(db, memberId, from, to) {
    const rows = db
        .prepare(`SELECT * FROM checkins
       WHERE member_id = ? AND (? IS NULL OR date >= ?) AND (? IS NULL OR date <= ?)
       ORDER BY date`)
        .all(memberId, from ?? null, from ?? null, to ?? null, to ?? null);
    return rows.map(toCheckin);
}
function listCheckinsForGroup(db, groupId, from, to) {
    const rows = db
        .prepare(`SELECT c.* FROM checkins c
       JOIN members m ON m.id = c.member_id
       WHERE m.group_id = ? AND (? IS NULL OR c.date >= ?) AND (? IS NULL OR c.date <= ?)
       ORDER BY c.date, c.checked_in_at`)
        .all(groupId, from ?? null, from ?? null, to ?? null, to ?? null);
    return rows.map(toCheckin);
}
//# sourceMappingURL=checkins.js.map