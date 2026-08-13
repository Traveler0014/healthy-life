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
| `{member.notify_topic}`（每成员独立，`hl-<hex>`） | 睡前提醒（逐人推送） | 该成员本人 |
| `{report}`（默认 `healthy-life-report`） | 晨报 / 奖励揭示 | 全员（暂未个性化） |

- **提醒逐人推送**：每成员一个随机不可猜的 topic（`members.notify_topic`），睡前提醒任务遍历成员、向各自 topic 推送。这样成员可独立开启/关闭，不会收到别人的提醒。
- **订阅链接从打卡页获取**：`GET /api/v1/me` 返回 `notifySubscribeUrl = NTFY_BASE_URL/<topic>`，打卡页展示「开启通知」按钮指向该链接（ntfy 网页/App 内订阅）。
- **启用/禁用**：`PATCH /api/v1/me { notifyEnabled }` 控制服务端是否向该成员推送；关闭后 jobs 跳过，但**不会**代用户从 ntfy App 退订（退订需用户在 App 里操作）。
- **手动测试推送**：`POST /api/v1/notify/test` 向自己 topic 发一条测试通知，打卡页提供「发送测试通知」按钮，供用户自行验证推送配置。
- **使用说明外链**：打卡页附「ntfy 怎么用」外链，指向站内中文指南页 `/ntfy-guide.html`（源文件 `apps/web/public/ntfy-guide.html`，覆盖 App / 网页 / 桌面端订阅方式，朋友是中文用户；同域托管，国内访问稳定）。
- 日报/周报（晨报）仍走共享 `{report}` topic，个性化推送暂缓。
- 按个人目标时间做**个性化提醒时机**（在各自目标前 N 分钟推送）仍属 Phase 2.4，暂未实现。

## 鉴权（ACL）

- 服务端用**发布 token**（`NTFY_TOKEN`）发消息。
- 成员端用**订阅 token** 或不可猜的 topic 名订阅。
- 私密群建议：topic 名用足够随机后缀（如 `healthy-life-report-a1b2c3`），并把链接私发进群。

## 客户端使用

`packages/notify` 的 `createNotifyClient(baseUrl, token)` 已封装 `publish(topic, message, { title, priority, tags })`。用法：

```ts
const notify = createNotifyClient(config.ntfyBaseUrl, config.ntfyToken);
// 睡前提醒：向该成员自己的 topic 推送（而非共享 topic）
await notify.publish(member.notifyTopic, reminderMessage('小明', '23:00'), {
  title: '该睡啦',
  priority: 3,
});
```

## 消息基调（重要）

- **早睡 = 庆祝**；**晚睡 = 温和提醒**（"明天提前一点点"），**不羞辱**。
- **无记录 = 不点名批评**，晨报里至多一句中性的「昨晚有 N 人未记录」。
- 文案集中在 `notify/templates.ts`，基调见 docs/00-overview.md。
