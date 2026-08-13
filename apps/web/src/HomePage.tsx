import { useCallback, useEffect, useRef, useState } from 'react';
import { EmojiPicker } from './EmojiPicker';
import {
  api,
  ApiError,
  formatRelative,
  getBrowserTimezone,
  timezoneName,
  type BoardResponse,
  type BoardStatus,
  type CheckinResponse,
  type Member,
  type Outcome,
  type StatsResponse,
  type TodayResponse,
} from './api';

interface HomePageProps {
  onLogout: () => void;
  /** 刚完成身份绑定（跳转到专属链接时）为 true，用于展示一次性提示 */
  justJoined?: boolean;
  onDismissJoinHint?: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function outcomeLabel(outcome: Outcome): string {
  if (outcome === 'early') return '早睡';
  if (outcome === 'late') return '晚睡';
  return '未打卡';
}

const STATUS_LABEL: Record<BoardStatus, string> = {
  sleeping: '已打卡',
  reversed: '白日做梦中',
  'not-slept': '还没睡',
  awake: '醒着',
};

const DAYTIME_LABEL_PRESETS = ['上夜班中', '午睡中', '倒时差中', '补觉中'];

/** ntfy 订阅/使用说明外链（站内中文指南页 /ntfy-guide.html，见 public/ntfy-guide.html） */
const NTFY_DOCS_URL = '/ntfy-guide.html';

/** 主界面（打卡页）：大按钮打卡 + 今晚状态 + 打卡墙 + 我的统计（绝不显示 streak）。 */
export function HomePage({ onLogout, justJoined = false, onDismissJoinHint }: HomePageProps) {
  const [me, setMe] = useState<Member | null>(null);
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [board, setBoard] = useState<BoardResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [receipt, setReceipt] = useState<CheckinResponse | null>(null);
  // 「打卡后再次访问」事件：本次会话内完成打卡的，不再算作“再次访问”
  const checkedInThisSession = useRef(false);
  const visitLogged = useRef(false);
  const [copied, setCopied] = useState(false);
  const [daytimePrompt, setDaytimePrompt] = useState<{ date: string } | null>(null);
  const [labelInput, setLabelInput] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [notifySubscribeUrl, setNotifySubscribeUrl] = useState<string | null>(null);
  const [togglingNotify, setTogglingNotify] = useState(false);
  const [testingNotify, setTestingNotify] = useState(false);
  const [notifyTestMsg, setNotifyTestMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 忽略复制失败（例如非 https 环境）
    }
  }

  async function saveDaytimeLabel(label: string | null) {
    if (!daytimePrompt) return;
    setSavingLabel(true);
    try {
      await api.setCheckinLabel(label, daytimePrompt.date);
      setDaytimePrompt(null);
      await loadData();
    } catch {
      // 忽略标签保存失败
    } finally {
      setSavingLabel(false);
    }
  }

  async function changeEmoji(emoji: string) {
    try {
      const res = await api.updateMe({ emoji });
      setMe(res.member);
      setShowEmojiPicker(false);
    } catch {
      // 忽略失败
    }
  }

  const viewerTz = getBrowserTimezone();

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [meRes, todayRes, boardRes, statsRes] = await Promise.all([
        api.me(),
        api.today(),
        api.board(),
        api.stats(),
      ]);
      setMe(meRes.member);
      setNotifySubscribeUrl(meRes.notifySubscribeUrl);
      setToday(todayRes);
      setBoard(boardRes);
      setStats(statsRes);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onLogout();
        return;
      }
      setError(err instanceof Error ? err.message : '加载失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // 记录「打卡后再次访问」事件（原始数据，供后续失眠判定/称号迭代）
  useEffect(() => {
    if (today?.checkedIn && !checkedInThisSession.current && !visitLogged.current) {
      visitLogged.current = true;
      api.recordEvent('visit_after_checkin').catch(() => {});
    }
  }, [today]);

  async function toggleNotify() {
    if (!me) return;
    setTogglingNotify(true);
    try {
      const res = await api.updateMe({ notifyEnabled: !me.notifyEnabled });
      setMe(res.member);
    } catch {
      // 忽略失败
    } finally {
      setTogglingNotify(false);
    }
  }

  async function handleTestNotify() {
    setTestingNotify(true);
    setNotifyTestMsg(null);
    try {
      await api.notifyTest();
      setNotifyTestMsg({ ok: true, text: '测试通知已发送，去 ntfy 看看收到没～' });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : '发送失败，请稍后再试';
      setNotifyTestMsg({ ok: false, text: `测试通知发送失败：${msg}` });
    } finally {
      setTestingNotify(false);
    }
  }

  async function handleCheckin() {
    setCheckingIn(true);
    setError(null);
    try {
      const res = await api.checkin();
      setReceipt(res);
      checkedInThisSession.current = true;
      if (res.isDaytimeCheckin) {
        setDaytimePrompt({ date: res.checkin.date });
        setLabelInput('');
      }
      await loadData();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onLogout();
        return;
      }
      setError(err instanceof Error ? err.message : '打卡失败，请稍后再试');
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <main className="page home-page">
      <header className="topbar">
        <div className="brand">🌙 早睡打卡</div>
        <div className="topbar-actions">
          <button
            type="button"
            className="button ghost small emoji-btn"
            onClick={() => setShowEmojiPicker(true)}
            aria-label="更换表情"
          >
            {me?.emoji ?? '😴'}
          </button>
          <button type="button" className="button ghost small" onClick={copyLink}>
            {copied ? '已复制 ✓' : '复制链接'}
          </button>
          <button type="button" className="button ghost" onClick={onLogout}>
            退出
          </button>
        </div>
      </header>

      {justJoined && (
        <div className="toast" role="status">
          <p>🔗 这是你的专属打卡链接，收藏或复制当前地址，下次直接打开就能打卡～</p>
          <div className="toast-actions">
            <button type="button" className="button ghost small" onClick={copyLink}>
              {copied ? '已复制 ✓' : '复制链接'}
            </button>
            <button type="button" className="button primary small" onClick={onDismissJoinHint}>
              知道了
            </button>
          </div>
        </div>
      )}

      {loading && <p className="hint">加载中…</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {!loading && (
        <section className="checkin-section">
          <p className="greeting">
            {me ? `${me.emoji} ${me.nickname}，今晚也要早点睡呀` : '今晚也要早点睡呀'}
          </p>
          {me?.targetBedtime && <p className="target">目标就寝时间 {me.targetBedtime}</p>}

          <button
            type="button"
            className="button checkin-button"
            onClick={handleCheckin}
            disabled={checkingIn}
          >
            {checkingIn ? '打卡中…' : '我睡了'}
          </button>

          {receipt && (
            <div className={`receipt ${receipt.outcome}`} role="status">
              {receipt.message}
            </div>
          )}
        </section>
      )}

      {!loading && today && (
        <section className="card">
          <h2>今晚状态</h2>
          <div className="today-status">
            <span className={`status-dot ${today.outcome}`} />
            <span>
              {today.checkedIn
                ? `已打卡${today.checkin?.checkedInAt ? `（${formatTime(today.checkin.checkedInAt)}）` : ''} · ${outcomeLabel(today.outcome)}`
                : '还没打卡，困了就来点一下'}
            </span>
          </div>
        </section>
      )}

      {!loading && board && (
        <section className="card">
          <h2>今日打卡墙</h2>
          <ul className="board">
            {board.members.map((m) => {
              const isDiffTz = Boolean(m.timezone && m.timezone !== viewerTz);
              const exact = board.visibility === 'exact';
              const isSleeping = m.status === 'sleeping';
              const isReversed = m.status === 'reversed';
              return (
                <li
                  key={m.memberId}
                  className={`board-item ${isSleeping ? 'done' : ''} ${isReversed ? 'reversed' : ''}`}
                >
                  <span className="board-emoji">{m.emoji}</span>
                  <span className="board-name">
                    {m.nickname}
                    {m.memberId === me?.id && <em className="me">我</em>}
                  </span>
                  <span className="board-state">
                    {isSleeping && exact && m.checkedInAtLocal ? (
                      <>
                        {m.checkedInAtLocal}
                        {isDiffTz && (
                          <span className="tz-hint">
                            {' '}· {timezoneName(m.timezone!)}
                            {m.checkedInAt ? ` · ${formatRelative(m.checkedInAt)}` : ''}
                          </span>
                        )}
                      </>
                    ) : isReversed && exact && m.checkedInAtLocal ? (
                      <>
                        {m.customLabel || '白日做梦中'} · {m.checkedInAtLocal}
                      </>
                    ) : (
                      STATUS_LABEL[m.status]
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!loading && me && (
        <section className="card">
          <h2>睡前提醒</h2>
          <p className="hint small">
            到点前 ntfy 会给你发一条温和提醒；先在 App 里订阅一次就能收到。
          </p>
          <div className="notify-row">
            <span className={`status-dot ${me.notifyEnabled ? 'early' : 'missing'}`} />
            <span>{me.notifyEnabled ? '已开启' : '已关闭'}</span>
            <button
              type="button"
              className="button chip notify-toggle"
              disabled={togglingNotify}
              onClick={toggleNotify}
            >
              {me.notifyEnabled ? '关闭' : '开启'}
            </button>
          </div>
          <div className="notify-actions">
            {notifySubscribeUrl && (
              <a
                className="button primary small"
                href={notifySubscribeUrl}
                target="_blank"
                rel="noreferrer"
              >
                订阅 ntfy 提醒
              </a>
            )}
            <button
              type="button"
              className="button chip"
              disabled={testingNotify}
              onClick={handleTestNotify}
            >
              {testingNotify ? '发送中…' : '发送测试通知'}
            </button>
          </div>
          {notifyTestMsg && (
            <p className={notifyTestMsg.ok ? 'notice' : 'error'} role="status">
              {notifyTestMsg.text}
            </p>
          )}
          <p className="hint small notify-docs">
            <a href={NTFY_DOCS_URL} target="_blank" rel="noreferrer">
              ntfy 怎么用？（App / 网页 / 桌面端）
            </a>
          </p>
        </section>
      )}

      {!loading && stats && (
        <section className="card">
          <h2>我的统计</h2>
          <div className="stats">
            <div className="stat">
              <div className="stat-value">{stats.earlyDays}</div>
              <div className="stat-label">累计早睡天数</div>
            </div>
            <div className="stat">
              <div className="stat-value">{Math.round(stats.earlyRate * 100)}%</div>
              <div className="stat-label">早睡占比</div>
            </div>
          </div>
          <p className="hint small">只看你打卡过的夜晚，忘打卡不计入统计。</p>
        </section>
      )}

      {daytimePrompt && (
        <div className="overlay">
          <div className="dialog" role="dialog" aria-label="设置睡眠状态">
            <h2>白天睡觉呀？</h2>
            <p className="subtitle">给这个状态起个名字，大家看到就不会误会啦～</p>
            <div className="preset-chips">
              {DAYTIME_LABEL_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="button chip"
                  disabled={savingLabel}
                  onClick={() => saveDaytimeLabel(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="label-input"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder="或自己写一个，比如「通宵值班」"
              maxLength={20}
            />
            <div className="dialog-actions">
              <button type="button" className="button ghost" onClick={() => setDaytimePrompt(null)}>
                跳过，用默认
              </button>
              <button
                type="button"
                className="button primary small"
                disabled={savingLabel}
                onClick={() => saveDaytimeLabel(labelInput.trim() || null)}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
      {showEmojiPicker && (
        <div className="overlay">
          <div className="dialog" role="dialog" aria-label="选择表情">
            <h2>选个表情</h2>
            <p className="subtitle">打卡墙上的你就是这个模样～</p>
            <EmojiPicker value={me?.emoji ?? '😴'} onChange={changeEmoji} />
            <div className="dialog-actions">
              <button type="button" className="button ghost" onClick={() => setShowEmojiPicker(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
