# 01 · 架构与模块边界

## 包依赖图

```
apps/server ──► shared, db, notify, prompts
apps/jobs  ──► shared, db, notify
apps/web   ──► (仅通过 HTTP API 与 server 交互，无包级依赖)

packages/db      ──► shared
packages/notify  ──► shared
packages/prompts ──► (独立，无依赖)
packages/shared  ──► (无依赖，纯逻辑)
```

依赖方向严格单向、无环。`apps/web` 不 import 任何 workspace 包（它只调 HTTP API）。

## 各包职责

### packages/shared（契约核心）
- `types.ts` — 领域类型（Group / Member / Checkin）
- `config.ts` — 环境变量加载（AppConfig）
- `crypto.ts` — sha256、随机 token、口令哈希 `hashPassword`、打卡链接派生 `deriveLinkToken`
- `day.ts` — 日切边界 `currentCheckinDay`、日期加减 `addDays`、墙上时钟 `wallClock`
- `sleep.ts` — `classifyNight`（早/晚/无记录）、`isNightHour`（夜间窗口 20:00-05:00）
- `streak.ts` — `computeStreak`：连续天数（隐藏连续早睡用它，只喂「早睡日期」）
- `rewards.ts` — 隐藏里程碑常量与查询
- `constants.ts` — 系统群 ID、默认管理员口令、睡眠时长等常量
- `config.ts` — 环境变量加载（含 `adminPassword`）
- 全部纯函数、无 IO、带单元测试

### packages/db
- `schema.ts` / `migrate.ts` — 版本化迁移（当前 v5）
- `client.ts` — SQLite 单例（WAL、外键）
- `repos/*` — 仓储函数（groups / members / checkins / events）
- `bootstrap.ts` — 系统管理员引导（`ensureSystemGroup` + `ensureAdmin`）

### packages/notify
- `client.ts` — ntfy 发布客户端（fetch）
- `templates.ts` — 文案模板（早睡庆祝 / 晚睡提醒 / 晨报 / 奖励揭示）

### packages/prompts
- 睡前趣味思考题（带答案、按领域分类）。**无判题逻辑**，只出题；答案由 server 在「打卡日结束后」才返回。见 §05/§06。

### apps/server（Hono）
- 鉴权中间件（Bearer token → sha256 → 查成员）
- 业务路由挂在 `/api/v1/*`：join / checkin / board / stats / events / admin / groups
- 系统管理员：启动时 bootstrap（预置 admin），`requireAdmin` 校验系统管理员
- 托管 web 构建产物（SPA 回退）

### apps/jobs（node-cron）
- 睡前提醒任务、晨报任务
- 奖励揭示在晨报结算时触发
- 遍历房间时跳过系统群（`SYSTEM_GROUP_ID`）

## 数据流

```
[睡前] jobs.reminder ──ntfy──► 成员手机
[睡前] member ──HTTP POST /api/v1/checkin──► server ──► db.checkins
        └─ 回执：早睡庆祝 / 晚睡温和提醒（server 即时返回 + 可选 ntfy 回执）
[次日] jobs.report ──结算前一晚──► 计算早/晚、隐藏 streak、触发奖励 ──ntfy──► 晨报
```

## 新增功能的正确姿势

1. 新规则/纯函数 → 放 `shared` + 单测
2. 新数据 → `db` 加 migration（新增 version，不要改已应用的旧 migration）
3. 新接口 → `server` 挂 route，同步更新 docs/03-api.md
4. 新定时 → `jobs` 加 task，同步更新 docs/04-ntfy.md / 05-mechanics.md
