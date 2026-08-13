#!/usr/bin/env node
// 演示数据播种：在 data/demo.db 创建「早睡小分队」群 + 3 名成员 + 打卡记录。
// 用法：node scripts/seed-demo.cjs
const path = require('path');
process.chdir(path.resolve(__dirname, '..')); // 确保 cwd = 仓库根

const {
  getDb,
  migrate,
  createGroup,
  createMember,
  upsertCheckin,
} = require(path.resolve(__dirname, '../packages/db/dist/index.js'));
const {
  sha256,
  generateToken,
  currentCheckinDay,
  addDays,
  deriveLinkToken,
  hashPassword,
} = require(path.resolve(__dirname, '../packages/shared/dist/index.js'));

const DB_PATH = process.env.DB_PATH || './data/demo.db';
const TZ = 'Asia/Shanghai';

const db = getDb(DB_PATH);
migrate(db);

const today = currentCheckinDay(TZ);
// dateStr 为 'YYYY-MM-DD'（群时区），返回该日 hhmm 的 ISO 时间戳
const isoAt = (dateStr, hhmm) => new Date(`${dateStr}T${hhmm}:00+08:00`).toISOString();

const group = createGroup(db, {
  name: '早睡小分队',
  inviteCode: 'DEMO-2026',
  timezone: TZ,
  visibility: 'exact', // 打卡墙显示精确时间
});

function mk(nickname, emoji, targetBedtime, password, role = 'member') {
  const salt = generateToken(16);
  const linkToken = deriveLinkToken(group.id, nickname, password);
  const member = createMember(db, {
    groupId: group.id,
    nickname,
    emoji,
    targetBedtime,
    tokenHash: sha256(linkToken),
    passwordHash: hashPassword(password, salt),
    passwordSalt: salt,
    role,
  });
  return { member, linkToken, password };
}

const ming = mk('小明', '🌙', '23:00', '1234', 'admin');
const hong = mk('小红', '⭐', '23:30', '1234');
const gang = mk('小刚', '🐼', '23:00', '1234');

// 今晚：小明 22:45 早睡、小红 23:45 晚睡（>23:30）、小刚 未打卡
upsertCheckin(db, { memberId: ming.member.id, date: today, checkedInAt: isoAt(today, '22:45') });
upsertCheckin(db, { memberId: hong.member.id, date: today, checkedInAt: isoAt(today, '23:45') });

// 历史（让统计有积累）：小明过去 6 天早睡；小红 3 早 + 1 晚
for (let i = 1; i <= 6; i++) {
  const d = addDays(today, -i);
  upsertCheckin(db, { memberId: ming.member.id, date: d, checkedInAt: isoAt(d, '22:30') });
}
for (let i = 1; i <= 3; i++) {
  const d = addDays(today, -i);
  upsertCheckin(db, { memberId: hong.member.id, date: d, checkedInAt: isoAt(d, '23:00') });
}
upsertCheckin(db, { memberId: hong.member.id, date: addDays(today, -4), checkedInAt: isoAt(addDays(today, -4), '00:10') });

console.log('=== 演示数据已就绪 ===');
console.log('群:', group.name, '| 邀请码:', group.inviteCode, '| 可见性:', group.visibility);
console.log('成员（口令均为 1234）:');
for (const x of [ming, hong, gang]) {
  console.log(
    `  ${x.member.nickname}(${x.member.targetBedtime},${x.member.role}) 口令=${x.password} 链接=/c/${x.linkToken}`,
  );
}
console.log('今晚:', today, '→ 小明 22:45(早睡) / 小红 23:45(晚睡) / 小刚(未打卡)');
console.log('邀请链接: /i/' + group.inviteCode);
