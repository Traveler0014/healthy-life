"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMember = createMember;
exports.getMemberById = getMemberById;
exports.getMemberByTokenHash = getMemberByTokenHash;
exports.listMembers = listMembers;
exports.updateMember = updateMember;
const node_crypto_1 = require("node:crypto");
function toMember(r) {
    return {
        id: r.id,
        groupId: r.group_id,
        nickname: r.nickname,
        emoji: r.emoji,
        targetBedtime: r.target_bedtime,
        tokenHash: r.token_hash,
        role: r.role,
        status: r.status,
        createdAt: r.created_at,
    };
}
function createMember(db, input) {
    const createdAt = new Date().toISOString();
    db.prepare(`INSERT INTO members (id, group_id, nickname, emoji, target_bedtime, token_hash, role, status, created_at)
     VALUES (@id, @groupId, @nickname, @emoji, @targetBedtime, @tokenHash, @role, 'active', @createdAt)`).run({
        id: (0, node_crypto_1.randomUUID)(),
        groupId: input.groupId,
        nickname: input.nickname,
        emoji: input.emoji ?? '😴',
        targetBedtime: input.targetBedtime ?? '23:00',
        tokenHash: input.tokenHash,
        role: input.role ?? 'member',
        createdAt,
    });
    return getMemberByTokenHash(db, input.tokenHash);
}
function getMemberById(db, id) {
    const row = db.prepare(`SELECT * FROM members WHERE id = ?`).get(id);
    return row ? toMember(row) : undefined;
}
function getMemberByTokenHash(db, tokenHash) {
    const row = db.prepare(`SELECT * FROM members WHERE token_hash = ?`).get(tokenHash);
    return row ? toMember(row) : undefined;
}
function listMembers(db, groupId) {
    const rows = db.prepare(`SELECT * FROM members WHERE group_id = ? ORDER BY created_at`).all(groupId);
    return rows.map(toMember);
}
function updateMember(db, id, patch) {
    const fields = [];
    const params = { id };
    if (patch.nickname !== undefined) {
        fields.push('nickname = @nickname');
        params.nickname = patch.nickname;
    }
    if (patch.emoji !== undefined) {
        fields.push('emoji = @emoji');
        params.emoji = patch.emoji;
    }
    if (patch.targetBedtime !== undefined) {
        fields.push('target_bedtime = @targetBedtime');
        params.targetBedtime = patch.targetBedtime;
    }
    if (patch.role !== undefined) {
        fields.push('role = @role');
        params.role = patch.role;
    }
    if (patch.status !== undefined) {
        fields.push('status = @status');
        params.status = patch.status;
    }
    if (fields.length === 0)
        return getMemberById(db, id);
    db.prepare(`UPDATE members SET ${fields.join(', ')} WHERE id = @id`).run(params);
    return getMemberById(db, id);
}
//# sourceMappingURL=members.js.map