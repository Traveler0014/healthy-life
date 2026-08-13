# 02 · 数据模型

## groups

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | uuid |
| name | TEXT | 群名 |
| invite_code | TEXT UNIQUE | 邀请码（也用于邀请链接） |
| timezone | TEXT | IANA 时区，默认 Asia/Shanghai |
| visibility | TEXT | `exact`（精确时间）/ `presence`（仅显示已睡/未睡） |
| created_at | TEXT | ISO |

## members

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | uuid |
| group_id | TEXT FK | 所属群 |
| nickname | TEXT | 昵称（群内唯一：UNIQUE(group_id, nickname)） |
| emoji | TEXT | 头像 emoji |
| target_bedtime | TEXT | 个人目标就寝 `HH:mm`（群时区） |
| token_hash | TEXT UNIQUE | 打卡链接 token 的 **sha256**（token 由 群+昵称+口令 确定性派生） |
| password_hash | TEXT | 口令加盐哈希 |
| password_salt | TEXT | 口令盐 |
| role | TEXT | `admin` / `member` |
| status | TEXT | `active` / `disabled` |
| created_at | TEXT | ISO |

## checkins

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | uuid |
| member_id | TEXT FK | |
| date | TEXT | 打卡日 `YYYY-MM-DD`（按群时区 + 日切边界归入） |
| checked_in_at | TEXT | 实际打卡 ISO 时间戳（用于早/晚判定） |
| created_at / updated_at | TEXT | |

约束：`UNIQUE(member_id, date)` — 每晚一人一条，重复打卡是**更新**而非新增（幂等）。

## events（原始事件流）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | uuid |
| member_id | TEXT FK | |
| type | TEXT | 开放类型：`visit_after_checkin`、`prompt_claimed` 等 |
| date | TEXT | 打卡日 `YYYY-MM-DD`（群时区） |
| occurred_at | TEXT | 事件发生 ISO 时间戳 |
| payload | TEXT | JSON 字符串，可空 |
| created_at | TEXT | |

**追加不覆盖、不去重**——完整保留原始数据，供后续称号/失眠判定等迭代使用。

## 关键点

- **没有「makeups / 补卡」表**：无惩罚模型下不需要补卡。睡前思考题是纯出题、不落库（或仅做「今晚已领」的会话态）。
- **没有「streak」字段**：连续天数由 `checkins` 实时算出（`computeStreak`），不落库，避免改时间后重算脏数据。
- **没有「晚睡」字段**：早/晚是 `classifyNight(checkin, targetBedtime, tz)` 实时判定，不落库。目标时间变了，历史口径也一致变化（可接受）。
- **奖励揭示的持久化**：Phase 2+ 若需「已颁发奖牌」去重，再新增 `rewards` 表（migration v2），v1 不预建。
