# 03 · HTTP API 契约

## 约定

- 前缀 `/api/v1`，除特别说明外**全部需鉴权**：请求头 `Authorization: Bearer <member token>`
- 响应统一 JSON；错误 `{ "error": "..." }` + 对应状态码（401 未登录 / 403 无权限 / 404 / 400 / 500）
- 时间字段一律 ISO 8601；「日期」一律 `YYYY-MM-DD`（群时区打卡日）

## Phase 1 端点（待实现）

### 鉴权 / 加入

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/join` | 用邀请码加入：`{ inviteCode, nickname, targetBedtime, emoji? }` → 返回 `{ member, token }`（token 明文只在此时返回一次） |
| GET | `/api/v1/me` | ✅ 已实现（示例）：返回当前成员 |
| PATCH | `/api/v1/me` | 改自己昵称 / emoji / 目标就寝时间 |

### 打卡

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/checkin` | 打卡（记录当前时刻）。幂等：同一天重复调用=更新。返回 `{ checkin, outcome: 'early'\|'late', message }` |
| GET | `/api/v1/checkin/today` | 今晚我的打卡状态（未打/已打+时间+早或晚） |
| GET | `/api/v1/board` | 今日打卡墙（按群 visibility 返回精确时间或仅状态） |
| GET | `/api/v1/prompts/random` | 领一道睡前思考题（仅限已打卡者？见 §05） |

### 统计 / 报告

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/stats` | 我的累计早睡天数、早睡占比（不展示 streak！） |
| GET | `/api/v1/report/monthly?month=YYYY-MM` | 月报数据 |
| GET | `/api/v1/report/yearly?year=YYYY` | 年报数据 |

### 群管理（admin）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/groups` | 建群（返回邀请码） |
| GET | `/api/v1/groups/:id/members` | 成员列表 |
| POST | `/api/v1/groups/:id/invites` | 生成邀请（返回 `inviteCode` + 完整链接） |
| PATCH | `/api/v1/groups/:id` | 改群设置（visibility / 提醒时间等） |

## 鉴权细节

- `join` 时服务端生成随机 token，**只返回一次明文**，库存 sha256（`tokenHash`）。
- 客户端把 token 存 localStorage / cookie，后续请求带 `Authorization: Bearer <token>`。
- 邀请链接 `BASE_URL/i/<inviteCode>` 打开后前端引导走 `join`（或仅填昵称，token 已内嵌链接）。具体交互由 web agent 定，但**接口契约以上表为准**。

## 实现注意

- `POST /checkin` 的 `date` 用 `currentCheckinDay(tz)` 计算，**不要**用客户端传来的日期。
- `outcome` 用 `classifyNight` 判定。
- `message` 用 notify/templates 的 `earlyCheckinMessage` / `lateCheckinMessage`。
