"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroup = createGroup;
exports.getGroupById = getGroupById;
exports.getGroupByInviteCode = getGroupByInviteCode;
const node_crypto_1 = require("node:crypto");
function toGroup(r) {
    return {
        id: r.id,
        name: r.name,
        inviteCode: r.invite_code,
        timezone: r.timezone,
        visibility: r.visibility,
        createdAt: r.created_at,
    };
}
function createGroup(db, input) {
    const createdAt = new Date().toISOString();
    db.prepare(`INSERT INTO groups (id, name, invite_code, timezone, visibility, created_at)
     VALUES (@id, @name, @inviteCode, @timezone, @visibility, @createdAt)`).run({
        id: (0, node_crypto_1.randomUUID)(),
        name: input.name,
        inviteCode: input.inviteCode,
        timezone: input.timezone ?? 'Asia/Shanghai',
        visibility: input.visibility ?? 'presence',
        createdAt,
    });
    return getGroupByInviteCode(db, input.inviteCode);
}
function getGroupById(db, id) {
    const row = db.prepare(`SELECT * FROM groups WHERE id = ?`).get(id);
    return row ? toGroup(row) : undefined;
}
function getGroupByInviteCode(db, inviteCode) {
    const row = db.prepare(`SELECT * FROM groups WHERE invite_code = ?`).get(inviteCode);
    return row ? toGroup(row) : undefined;
}
//# sourceMappingURL=groups.js.map