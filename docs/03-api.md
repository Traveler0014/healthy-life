# 03 · HTTP API 契约

## 约定

- 前缀 `/api/v1`，除特别说明外**全部需鉴权**：请求头 `Authorization: Bearer <member token>`
- 响应统一 JSON；错误 `{ "error": "..." }` + 对应状态码（401 未登录 / 403 无权限 / 404 / 400 / 500）
- 时间字段一律 ISO 8601；「日期」一律 `YYYY-MM-DD`（成员各自时区的打卡日）

## Phase 1 端点（✅ 已实现）

> 公开端点（无需鉴权）：`POST /api/v1/join`、`POST /api/v1/admin/login`。
> **管理员是部署时预置的系统账号**（用户名 `admin`、默认口令 `ADMIN_PASSWORD`），不属于任何房间、不出现在打卡墙。

### 鉴权 / 加入

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/join` | ✅ 公开。注册/找回合一：`{ inviteCode, nickname, password, targetBedtime?, timezone?, emoji? }` → 返回 `{ member, token, link }`。同名+同口令再次调用 = 找回同一条 link。新成员一律 `member` |
| GET | `/api/v1/me` | ✅ 返回 `{ member, notifySubscribeUrl }`；`member` 含 `notifyTopic` / `notifyEnabled`（不含 tokenHash）。`notifySubscribeUrl` = 该成员的 ntfy 订阅链接（`NTFY_BASE_URL/<topic>`） |
| PATCH | `/api/v1/me` | ✅ 改自己昵称 / emoji / 目标就寝时间 / `notifyEnabled`（boolean，启用/禁用通知） |

### 打卡

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/checkin` | ✅ 打卡（记录当前时刻，body 带 `timezone`，date 由服务端按该时区算）。幂等：同一天重复调用=更新。返回 `{ checkin, outcome: 'early'\|'late', message }` |
| GET | `/api/v1/checkin/today` | ✅ 今晚我的打卡状态（未打/已打+时间+outcome） |
| GET | `/api/v1/board` | ✅ 今日打卡墙（按群 visibility 返回精确时间或仅状态）。每成员按各自时区算「今天」，返回 `timezone` / `checkedInAtLocal` / `checkedInAt` |
| POST | `/api/v1/events` | ✅ 记录原始事件 `{ type, payload? }`（如 `visit_after_checkin`），追加不覆盖 |
| GET | `/api/v1/prompts/random` | 领一道睡前思考题（Phase 3，未实现） |

### 统计 / 报告

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/stats` | ✅ 我的累计早睡天数、早睡占比（不展示 streak！） |
| GET | `/api/v1/report/monthly?month=YYYY-MM` | 月报数据（Phase 2，未实现） |
| GET | `/api/v1/report/yearly?year=YYYY` | 年报数据（Phase 2，未实现） |

### 管理员（系统级，均需 admin 鉴权）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/admin/login` | ✅ 公开。`{ password }` → 返回管理员专属链接 |
| PATCH | `/api/v1/admin/password` | ✅ `{ oldPassword, newPassword }` 改口令，改后重新派生链接 |
| GET | `/api/v1/groups` | ✅ 房间列表（排除系统群） |
| POST | `/api/v1/groups` | ✅ 建房间（服务端生成 inviteCode） |
| GET | `/api/v1/groups/:id/members` | ✅ 成员列表 |
| POST | `/api/v1/groups/:id/invites` | ✅ 幂等返回邀请码 + 完整链接 |
| PATCH | `/api/v1/groups/:id` | ✅ 改房间设置（name / timezone / visibility） |
| DELETE | `/api/v1/groups/:id/members/:memberId` | ✅ 移除成员（连带其记录） |
| POST | `/api/v1/groups/:id/members/:memberId/reset` | ✅ 重设成员口令（兜底找回），返回新链接 |

## 身份与鉴权

- **打卡链接 = 身份**：`join` 返回 `link = BASE_URL/c/<token>`，打开即进打卡页（可收藏、跨设备）。
- token 由 `deriveLinkToken(groupId, nickname, password)` 确定性派生 → 链接稳定不变；服务端只存 sha256（`tokenHash`），找回时可重算同一条链接。
- **找回 = 登录**：`join` 合并注册/找回——同名+同口令再次调用返回同一条 link；口令错误 401。
- 口令只存加盐哈希（`passwordHash` + `passwordSalt`），不存明文。
- 客户端把 token 存 localStorage，请求带 `Authorization: Bearer <token>`。

## 实现注意

- `POST /checkin` 的 `date` 用 `currentCheckinDay(tz)` 计算，**不要**用客户端传来的日期。
- `outcome` 用 `classifyNight` 判定。
- `message` 用 notify/templates 的 `earlyCheckinMessage` / `lateCheckinMessage`。
