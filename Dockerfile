# healthy-life 镜像：同时承载 server 与 jobs 两个常驻进程（由 compose 用不同 command 启动）。
#
# 基础镜像选 Debian(glibc) 而非 Alpine(musl)：better-sqlite3 v13 提供 glibc 预编译二进制，
# 在 Debian 上直接复用预编译产物，避免在容器里触发 node-gyp 源码编译（慢且需要编译工具链）。
FROM node:22-bookworm-slim

# better-sqlite3 是原生模块：优先用预编译二进制，平台无预编译时回退 node-gyp 源码编译。
# 预装 python3/make/g++ 以覆盖回退路径（slim 镜像默认缺这些工具，缺了会安装失败）。
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# 启用 corepack 提供的 pnpm（版本由根 package.json 的 packageManager 字段锁定为 11.20.0）
RUN corepack enable

WORKDIR /app

# 先复制依赖清单与源码，最大化利用 Docker 层缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps

# 安装依赖（pnpm-workspace.yaml 已 allowBuilds: better-sqlite3 / esbuild）
RUN pnpm install --frozen-lockfile

# 构建：tsc -b 拓扑构建所有包 + web 打包（产出 apps/web/dist，server 运行时会托管它）
RUN pnpm build

ENV NODE_ENV=production
ENV PORT=8787

EXPOSE 8787

# 默认启动 server；jobs 进程由 compose 用 command 覆盖为 node apps/jobs/dist/index.js
CMD ["node", "apps/server/dist/index.js"]
