# healthy-life · 朋友早睡互助打卡

一个**正反馈驱动**的睡眠打卡服务：每晚 ntfy 提醒早睡 → 睡前一键打卡 → 次日晨报推送，连续早睡还能解锁隐藏奖励。

设计目标不是「记录打卡」，而是「帮大家更早睡」。核心原则：**忘打卡无惩罚、晚睡温和提醒、连续早睡给隐藏奖励**。

## 已实现功能

- 🔗 **口令 + 专属打卡链接**：昵称+口令注册，得到一条稳定链接，持有即本人（跨设备、可收藏）；同名+同口令可找回
- 🌍 **跨时区**：早/晚判定以打卡设备当地时区为准，旅行自适应；打卡墙跨时区显示时区名 + 相对时间
- 😴 **早睡榜四态**：已打卡 / 白日做梦中（可自定义标签）/ 还没睡 / 醒着
- 🐼 **emoji 头像**：睡眠主题 + 全套动物，加入时选择、随时可改
- 🏅 **隐藏连续奖励**：连续早睡达标（7/21/30/66/100）才揭示惊喜奖牌，日常不展示 streak
- 🛠️ **系统管理员**：部署时预置 admin 账号（默认口令 `admin123`），建房间、管理成员、兜底重设成员口令

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
| [docs/05-mechanics.md](./docs/05-mechanics.md) | 核心机制规则（日切、早/晚判定、早睡榜、隐藏奖励、事件流） |
| [docs/06-roadmap.md](./docs/06-roadmap.md) | 分阶段规划与验收标准 |
| [docs/07-deployment.md](./docs/07-deployment.md) | 部署指南（VPS + systemd + HTTPS） |
