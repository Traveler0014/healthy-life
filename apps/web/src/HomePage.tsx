import { useCallback, useEffect, useRef, useState } from 'react';
import {
  api,
  ApiError,
  formatRelative,
  getBrowserTimezone,
  timezoneName,
  type BoardResponse,
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

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 忽略复制失败（例如非 https 环境）
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

  async function handleCheckin() {
    setCheckingIn(true);
    setError(null);
    try {
      const res = await api.checkin();
      setReceipt(res);
      checkedInThisSession.current = true;
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
              return (
                <li key={m.memberId} className={`board-item ${m.checkedIn ? 'done' : ''}`}>
                  <span className="board-emoji">{m.emoji}</span>
                  <span className="board-name">
                    {m.nickname}
                    {m.memberId === me?.id && <em className="me">我</em>}
                  </span>
                  <span className="board-state">
                    {m.checkedIn
                      ? board.visibility === 'exact' && m.checkedInAtLocal
                        ? (
                            <>
                              {m.checkedInAtLocal}
                              {isDiffTz && (
                                <span className="tz-hint">
                                  {' '}· {timezoneName(m.timezone!)}
                                  {m.checkedInAt ? ` · ${formatRelative(m.checkedInAt)}` : ''}
                                </span>
                              )}
                            </>
                          )
                        : '已打卡'
                      : '还没睡'}
                  </span>
                </li>
              );
            })}
          </ul>
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
    </main>
  );
}
