"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.generateToken = generateToken;
const node_crypto_1 = require("node:crypto");
function sha256(input) {
    return (0, node_crypto_1.createHash)('sha256').update(input).digest('hex');
}
/** 生成随机令牌（邀请链接 / 成员 token 用），默认 24 字节 → 48 位 hex */
function generateToken(bytes = 24) {
    return (0, node_crypto_1.randomBytes)(bytes).toString('hex');
}
//# sourceMappingURL=crypto.js.map