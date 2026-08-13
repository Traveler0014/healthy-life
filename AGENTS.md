# AGENTS.md — 参与实现的工作约定

本文件给**要在这个仓库里写代码的 agent** 看。动手前先读这里 + `docs/` 下的契约文档。

## 项目是什么

朋友早睡互助打卡服务。**核心目标 = 帮大家更早睡，打卡只是记录手段，不是被考核的对象。** 三条铁律（详见 docs/05-mechanics.md）：

1. 忘打卡 / 不打卡 → **无惩罚、不纳入早/晚统计**
2. 打卡但睡得晚 → 即时温和提醒 + 计入统计
3. 连续早睡 → **隐藏奖励**（不展示 streak，达标才以惊喜奖牌揭示）

## 快速开始

```bash
pnpm install        # 装依赖
pnpm build          # tsc -b 拓扑构建所有 node 包 + web 打包（会产出 dist，也会做类型检查）
pnpm test           # 跑单元测试（vitest）
pnpm dev:server     # API :8787
pnpm dev:web        # 前端（/api 代理到 :8787）
pnpm dev:jobs       # 定时任务
```

## 目录与归属（一个 agent 一次只动一个包）

```
packages/shared     规则/类型/纯函数（无 IO）。核心契约，改它要极谨慎
packages/db         SQLite schema + 仓储函数
packages/notify     ntfy 推送客户端 + 文案模板
packages/prompts    睡前思考题（助眠工具，无判题）
apps/server         HTTP API（Hono）
apps/web            前端 PWA（React + Vite）
apps/jobs           定时任务（node-cron）：提醒 / 晨报
```

## 铁律

- **契约不可私自改**：`packages/shared` 里的类型、`docs/` 里的 API/机制/数据模型是「源真相」。要改，必须先改对应文档，并保证其它包能编译。
- **不得跨包引用内部路径**：只通过各包的 `src/index.ts` 导出的公共 API 互相调用。禁止 `import ... from '@healthy-life/db/src/...'`。
- **纯逻辑必须放 shared**：日切、早/晚判定、streak、里程碑等无 IO 的函数放 `packages/shared`，带单元测试。server/jobs 只做编排。
- **类型检查**：用 `lsp_diagnostics`（或 `pnpm typecheck`）。改完自己负责的包必须 0 error。
- **时区**：一切「天」的概念用 `currentCheckinDay` / `addDays`（shared/day），禁止手写日期加减或 `new Date().toDateString()`。
- **密钥**：token 只存 sha256（`shared/crypto`），`.env` 不提交，模板见 `.env.example`。

## 构建顺序注意

monorepo 用 TS project references（`tsc -b` 会按依赖拓扑构建）。`pnpm build` 在根目录一键完成。**改了 shared/db/notify 后，下游（server/jobs）依赖它们的 dist，需要重新 `pnpm build`** 才能在下游看到新类型/实现。

## 一个 agent 接手任务的推荐流程

1. 从 docs/06-roadmap.md 领一个未完成的任务（看清依赖与验收标准）
2. 只在自己的包里改代码
3. `pnpm test` + `lsp_diagnostics` 确认无错
4. 若改了契约（shared 类型 / 文档），同步更新对应 docs
