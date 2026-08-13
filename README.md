# healthy-life · 朋友早睡互助打卡

一个**正反馈驱动**的睡眠打卡服务：每晚 ntfy 提醒早睡 → 睡前一键打卡 → 次日晨报推送 + 连续打卡（streak）与成就，长期坚持后可输出打卡报告。

设计目标不是「记录打卡」，而是「帮大家更早睡」。所有机制（打卡、streak、晨报、补卡任务）都围绕「把即时代价改造成即时奖励、把延迟回报变得具体可见」展开。

## 快速开始

```bash
pnpm install          # 安装依赖
pnpm build            # 构建所有包（tsc -b 拓扑构建 + web 打包）
pnpm test             # 运行单元测试
```

开发（三个进程，分别终端运行）：

```bash
cp .env.example .env  # 按需修改
pnpm dev:server       # API 服务 :8787
pnpm dev:web          # 前端 Vite（/api 代理到 :8787）
pnpm dev:jobs         # 定时任务
```

## 文档

| 文档 | 内容 |
|---|---|
| [AGENTS.md](./AGENTS.md) | **给参与实现的 agent 看的工作约定**（先读这个） |
| [docs/00-overview.md](./docs/00-overview.md) | 愿景、设计原则、技术选型 |
| [docs/01-architecture.md](./docs/01-architecture.md) | 模块边界、依赖关系、数据流 |
| [docs/02-data-model.md](./docs/02-data-model.md) | 数据模型 |
| [docs/03-api.md](./docs/03-api.md) | HTTP API 契约 |
| [docs/04-ntfy.md](./docs/04-ntfy.md) | ntfy 推送设计 |
| [docs/05-mechanics.md](./docs/05-mechanics.md) | 核心机制规则（日切、打卡、streak、补卡） |
| [docs/06-roadmap.md](./docs/06-roadmap.md) | 分阶段规划与验收标准 |
