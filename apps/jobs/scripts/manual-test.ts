/**
 * 手动验证 Phase 1.3（睡前提醒）与 1.4（晨报）。
 * 用法（在 apps/jobs 下）：
 *   pnpm --filter @healthy-life/jobs exec tsx scripts/manual-test.ts
 *
 * 用真实 SQLite + mock ntfy HTTP 端点（只记录、不真发），验证：
 * - 早睡 / 晚睡 / 无记录分类
 * - 隐藏连续奖励（streak 达标时揭示奖牌）
 * - 晨报文案顺序与内容
 * - 提醒只发给「今晚尚未打卡」的 active 成员
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  addDays,
  currentCheckinDay,
  type AppConfig,
} from '@healthy-life/shared';
import {
  closeDb,
  createGroup,
  createMember,
  getDb,
  migrate,
  upsertCheckin,
} from '@healthy-life/db';
import {
  earlyCheckinMessage,
  lateCheckinMessage,
  reminderMessage,
  rewardMessage,
} from '@healthy-life/notify';
import type { JobDeps } from '../src/types';
import { runReport } from '../src/tasks/report';
import { runReminder } from '../src/tasks/reminder';

interface Captured {
  topic: string;
  message: string;
}

async function startMockNtfy(): Promise<{
  baseUrl: string;
  messages: Captured[];
  close: () => Promise<void>;
}> {
  const messages: Captured[] = [];
  const server: Server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      const topic = decodeURIComponent((req.url ?? '').replace(/^\//, ''));
      messages.push({ topic, message: body });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    messages,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

interface Result {
  name: string;
  pass: boolean;
  detail: string;
}

const results: Result[] = [];
function check(name: string, pass: boolean, detail: string): void {
  results.push({ name, pass, detail });
}

async function main(): Promise<void> {
  const mock = await startMockNtfy();
  const dir = mkdtempSync(join(tmpdir(), 'healthy-life-jobs-test-'));
  const dbPath = join(dir, 'test.db');

  try {
    const db = getDb(dbPath);
    migrate(db);

    const group = createGroup(db, {
      name: '测试群',
      inviteCode: 'manual-test-invite',
      timezone: 'Asia/Shanghai',
    });

    const alice = createMember(db, {
      groupId: group.id,
      nickname: '爱丽丝',
      targetBedtime: '23:00',
      tokenHash: 'alice-hash',
    });
    const bob = createMember(db, {
      groupId: group.id,
      nickname: '鲍勃',
      targetBedtime: '23:00',
      tokenHash: 'bob-hash',
    });
    const carol = createMember(db, {
      groupId: group.id,
      nickname: '卡萝',
      targetBedtime: '23:00',
      tokenHash: 'carol-hash',
    });
    const dave = createMember(db, {
      groupId: group.id,
      nickname: '戴夫',
      targetBedtime: '23:00',
      tokenHash: 'dave-hash',
    });

    const today = currentCheckinDay('Asia/Shanghai');
    const yesterday = addDays(today, -1);

    // 爱丽丝：昨晚早睡（上海 22:30 → UTC 14:30）
    upsertCheckin(db, {
      memberId: alice.id,
      date: yesterday,
      checkedInAt: `${yesterday}T14:30:00.000Z`,
    });

    // 鲍勃：昨晚晚睡（上海 23:30 → UTC 15:30，比 23:00 晚 30 分钟）
    upsertCheckin(db, {
      memberId: bob.id,
      date: yesterday,
      checkedInAt: `${yesterday}T15:30:00.000Z`,
    });

    // 卡萝：昨晚无记录；但今晚已打卡（提醒应跳过她）
    upsertCheckin(db, {
      memberId: carol.id,
      date: today,
      checkedInAt: new Date().toISOString(),
    });

    // 戴夫：连续 7 晚早睡（含昨晚）→ 应触发隐藏奖励
    for (let i = 0; i < 7; i += 1) {
      const d = addDays(yesterday, -i);
      upsertCheckin(db, {
        memberId: dave.id,
        date: d,
        checkedInAt: `${d}T14:30:00.000Z`,
      });
    }

    const config: AppConfig = {
      port: 8787,
      baseUrl: 'http://localhost:8787',
      dbPath,
      ntfyBaseUrl: mock.baseUrl,
      ntfyToken: '',
      ntfyTopicReminder: 'test-reminder',
      ntfyTopicReport: 'test-report',
      timezone: 'Asia/Shanghai',
      dayBoundaryHour: 5,
      reminderTime: '22:30',
      reportTime: '08:00',
    };

    const deps: JobDeps = { config, db };

    await runReport(deps);
    await runReminder(deps);

    const reportMessages = mock.messages.filter((m) => m.topic === 'test-report');
    const reminderMessages = mock.messages.filter((m) => m.topic === 'test-reminder');

    // ---- 晨报断言 ----
    check(
      '晨报只发布一次',
      reportMessages.length === 1,
      `report 发布次数=${reportMessages.length}`,
    );

    const reportLines = reportMessages[0]?.message.split('\n') ?? [];
    const expectedEarlyAlice = earlyCheckinMessage('爱丽丝', '22:30');
    const expectedEarlyDave = earlyCheckinMessage('戴夫', '22:30');
    const expectedLateBob = lateCheckinMessage('鲍勃', '23:30', 30);
    const expectedRewardDave = rewardMessage('戴夫', '连续早睡 7 天');
    const expectedStats = '昨晚 3 人记录、1 人未记录。';

    check('晨报含爱丽丝早睡庆祝', reportLines.includes(expectedEarlyAlice), JSON.stringify(reportLines));
    check('晨报含戴夫早睡庆祝', reportLines.includes(expectedEarlyDave), JSON.stringify(reportLines));
    check('晨报含鲍勃晚睡温和提醒', reportLines.includes(expectedLateBob), JSON.stringify(reportLines));
    check('晨报含戴夫隐藏奖励', reportLines.includes(expectedRewardDave), JSON.stringify(reportLines));
    check('晨报含中性统计（不点名未记录者）', reportLines.includes(expectedStats), JSON.stringify(reportLines));

    const earlyIdx = reportLines.indexOf(expectedEarlyAlice);
    const lateIdx = reportLines.indexOf(expectedLateBob);
    const rewardIdx = reportLines.indexOf(expectedRewardDave);
    const statsIdx = reportLines.indexOf(expectedStats);
    check(
      '晨报顺序：早睡 → 晚睡 → 奖励 → 统计',
      earlyIdx >= 0 && lateIdx > earlyIdx && rewardIdx > lateIdx && statsIdx > rewardIdx,
      `idx early=${earlyIdx} late=${lateIdx} reward=${rewardIdx} stats=${statsIdx}`,
    );

    // ---- 提醒断言 ----
    const expectedReminderAlice = reminderMessage('爱丽丝', '23:00');
    const expectedReminderBob = reminderMessage('鲍勃', '23:00');
    const expectedReminderDave = reminderMessage('戴夫', '23:00');
    const expectedReminderCarol = reminderMessage('卡萝', '23:00');

    const reminderSet = new Set(reminderMessages.map((m) => m.message));
    check(
      '提醒发 3 条（爱丽丝/鲍勃/戴夫，卡萝今晚已打卡应跳过）',
      reminderMessages.length === 3,
      `提醒次数=${reminderMessages.length}`,
    );
    check('提醒含爱丽丝', reminderSet.has(expectedReminderAlice), JSON.stringify([...reminderSet]));
    check('提醒含鲍勃', reminderSet.has(expectedReminderBob), JSON.stringify([...reminderSet]));
    check('提醒含戴夫', reminderSet.has(expectedReminderDave), JSON.stringify([...reminderSet]));
    check('提醒不含卡萝（今晚已打卡）', !reminderSet.has(expectedReminderCarol), JSON.stringify([...reminderSet]));

    // ---- 输出证据 ----
    console.log('========== 晨报原文 ==========');
    console.log(reportMessages[0]?.message ?? '(no report)');
    console.log('========== 提醒原文 ==========');
    for (const m of reminderMessages) console.log(`- ${m.message}`);
    console.log('==============================');

    const failed = results.filter((r) => !r.pass);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
    if (failed.length > 0) {
      console.log('FAILED:');
      for (const r of failed) console.log(`  ✗ ${r.name} — ${r.detail}`);
      process.exitCode = 1;
    } else {
      console.log('ALL CHECKS PASSED');
    }
  } finally {
    closeDb();
    await mock.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
