# 07 · 部署指南

目标：把服务部署到**境外 VPS（2c2g）**，让朋友用手机公网访问打卡 + 收到 ntfy 推送。

## 前置条件

- 一台境外 VPS（本项目目标：2c2g，已部署 ntfy）
- Node.js **≥ 22**（better-sqlite3 v13 要求）
- pnpm（`npm i -g pnpm`）
- 一个域名（可选，但强烈建议，用于 HTTPS；没有域名可用 Cloudflare Tunnel）

## 1. 获取代码 + 构建

```bash
git clone git@github.com:Traveler0014/healthy-life.git
cd healthy-life
pnpm install
pnpm build        # 会产出 apps/server/dist、apps/web/dist 等
```

> 注意：pnpm 11 默认拦截原生模块构建脚本。本项目 `pnpm-workspace.yaml` 已配置 `allowBuilds: { better-sqlite3, esbuild }`，`pnpm install` 时会自动放行。

## 2. 配置环境变量

```bash
cp .env.example .env
vim .env
```

关键项：

```bash
PORT=8787
# 公网访问地址（生成打卡链接用，务必填对，带 https）
BASE_URL=https://你的域名

DB_PATH=./data/healthy-life.db

# ntfy（已部署）
NTFY_BASE_URL=https://你的ntfy地址
NTFY_TOKEN=发布token（若你的 ntfy 需要）
NTFY_TOPIC_REMINDER=healthy-life-reminder
NTFY_TOPIC_REPORT=healthy-life-report

TIMEZONE=Asia/Shanghai
REMINDER_TIME=22:30
REPORT_TIME=08:00

# 管理员默认口令（首次启动创建 admin，之后在 /admin 后台改）
ADMIN_PASSWORD=admin123
```

## 3. systemd 常驻（两个进程）

`/etc/systemd/system/healthy-server.service`：

```ini
[Unit]
Description=healthy-life server
After=network.target

[Service]
WorkingDirectory=/root/healthy-life
EnvironmentFile=/root/healthy-life/.env
ExecStart=/usr/bin/node apps/server/dist/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/healthy-jobs.service`（定时提醒 + 晨报）：

```ini
[Unit]
Description=healthy-life jobs
After=network.target

[Service]
WorkingDirectory=/root/healthy-life
EnvironmentFile=/root/healthy-life/.env
ExecStart=/usr/bin/node apps/jobs/dist/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

启动：

```bash
systemctl daemon-reload
systemctl enable --now healthy-server healthy-jobs
systemctl status healthy-server healthy-jobs
```

## 4. HTTPS

任选其一：

### 方案 A：Caddy 反向代理（推荐，需域名）

```bash
# 安装 Caddy 后，Caddyfile：
你的域名 {
    reverse_proxy 127.0.0.1:8787
}
```

Caddy 自动申请并续期 Let's Encrypt 证书。

### 方案 B：Cloudflare Tunnel（无需开放端口，域名托管在 CF）

```bash
cloudflared tunnel --url http://127.0.0.1:8787
```

在 Cloudflare Zero Trust 里把子域名指向该 tunnel。

### 方案 C：直连（无域名，临时可用）

`http://VPS公网IP:8787` 直接访问。⚠️ 无 HTTPS，打卡链接里的 token 会明文传输；仅建议测试用。

## 5. 首次使用

1. 打开 `https://你的域名/admin`，用 `admin / admin123` 登录（**登录后立即改口令**）
2. 后台「新建房间」，得到邀请链接
3. 把邀请链接发进朋友群，大家打开 → 设昵称+口令 → 得到各自的专属打卡链接
4. 朋友收藏自己的专属链接，之后打开即打卡

## 6. 常见问题

- **ntfy 收不到提醒**：确认 `NTFY_BASE_URL`/`NTFY_TOKEN` 正确，且朋友手机装了 ntfy App 并订阅了 reminder/report 两个 topic（订阅链接发给朋友）。
- **打卡链接打不开**：确认 `BASE_URL` 与公网访问地址一致（域名/端口）。
- **改口令后旧链接失效**：这是预期行为——口令变了，派生链接自动轮换，用新链接即可。
- **数据备份**：`data/healthy-life.db` 是全部数据（SQLite 单文件），定期复制该文件即可备份。
- **升级**：`git pull && pnpm install && pnpm build && systemctl restart healthy-server healthy-jobs`。

## 附：Docker 部署（推荐）

`Dockerfile` 把 server 与 jobs 两个常驻进程打包为**同一镜像**，compose 用两个容器共享一个 SQLite 数据卷。相比 systemd 方案，免去手动 `pnpm build` / 配置 node-gyp。

### 镜像与 CI

- 镜像推送到 **GHCR**：`ghcr.io/traveler0014/healthy-life`。
- GitHub Actions（`.github/workflows/docker-publish.yml`）在 push 到 `main` / 打 `v*` tag / 手动触发时自动构建推送，tag：`latest`（默认分支）、`main`、`v*`、`<sha>`。
- 首次使用前：到仓库 **Settings → Packages** 把镜像包设为 **Public**（否则拉取需要登录 token）。

### 方式一：拉取 GHCR 镜像（部署机，推荐）

```bash
cp docker-compose.example.yml docker-compose.yml
cp .env.example .env            # 修改 BASE_URL 为公网 https 地址、NTFY_BASE_URL/NTFY_TOKEN 等
vim .env
docker compose pull
docker compose up -d
```

### 方式二：本地构建（开发/无外网）

```bash
cp .env.example .env
vim .env
docker compose up -d --build   # 用根目录的 docker-compose.yml（build: .）
```

### 要点

- **两个容器**：`server`（HTTP :8787）与 `jobs`（cron 提醒/晨报）。`jobs` 用 `depends_on: condition: service_healthy` 等 server 先完成 migrate 与管理员引导，避免首次并发迁移。
- **数据持久化**：`./data:/app/data`，SQLite（WAL）文件落在宿主机 `data/` 目录，备份即复制该文件。
- **时区**：compose 里 `TZ` 默认 `Asia/Shanghai`，与 `.env` 的 `TIMEZONE` 保持一致；否则 node-cron 会按容器 UTC 触发，提醒时间会偏。
- **HTTPS**：容器只暴露 8787，公网 HTTPS 仍按上文「§4 HTTPS」用 Caddy 反代或 Cloudflare Tunnel，把域名指向 `127.0.0.1:8787`。
- **升级**：`git pull && docker compose pull && docker compose up -d`（镜像版）或 `git pull && docker compose up -d --build`（本地构建版）。
- **镜像体积**：当前为单阶段构建（镜像内含源码 + node_modules），体积偏大但可靠；若在意体积可后续改成多阶段（copy 各包 `dist/` + 精简 node_modules）。

> 基础镜像刻意选 `node:22-bookworm-slim`（Debian/glibc）而非 Alpine：better-sqlite3 v13 有 glibc 预编译二进制，Debian 上免源码编译。若在 arm64 机器构建并在 amd64 VPS 部署，需加 `--platform linux/amd64`。

## 附：本地演示

```bash
node scripts/seed-demo.cjs   # 造演示数据（早睡小分队 + 3 成员）
pnpm dev:server              # 本地起服务
```
