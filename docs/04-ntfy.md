# 04 · ntfy 推送设计

## 角色

ntfy 是**单向推送**（服务端 → 成员手机），负责：
1. 睡前提醒
2. 晨报
3. 隐藏奖励揭示（附在晨报或独立推送）

**打卡输入不经过 ntfy**（走 Web `/api/v1/checkin`）。

## Topic 规划

| topic | 用途 | 订阅者 |
|---|---|---|
| `{reminder}`（默认 `healthy-life-reminder`） | 睡前提醒 | 全员 |
| `{report}`（默认 `healthy-life-report`） | 晨报 / 奖励揭示 | 全员 |

可选（Phase 2）：按个人目标时间做**个性化提醒**，为每人建 topic（如 `healthy-life-reminder-{nickname}`），在各自目标前 N 分钟推送。

## 鉴权（ACL）

- 服务端用**发布 token**（`NTFY_TOKEN`）发消息。
- 成员端用**订阅 token** 或不可猜的 topic 名订阅。
- 私密群建议：topic 名用足够随机后缀（如 `healthy-life-report-a1b2c3`），并把链接私发进群。

## 客户端使用

`packages/notify` 的 `createNotifyClient(baseUrl, token)` 已封装 `publish(topic, message, { title, priority, tags })`。用法：

```ts
const notify = createNotifyClient(config.ntfyBaseUrl, config.ntfyToken);
await notify.publish(config.ntfyTopicReminder, reminderMessage('小明', '23:00'), {
  title: '该睡啦',
  priority: 3,
});
```

## 消息基调（重要）

- **早睡 = 庆祝**；**晚睡 = 温和提醒**（"明天提前一点点"），**不羞辱**。
- **无记录 = 不点名批评**，晨报里至多一句中性的「昨晚有 N 人未记录」。
- 文案集中在 `notify/templates.ts`，基调见 docs/00-overview.md。
