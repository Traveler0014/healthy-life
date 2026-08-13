import { useCallback, useEffect, useState } from 'react';
import { clearToken, getToken, setToken } from './api';
import { JoinPage } from './JoinPage';
import { HomePage } from './HomePage';

function parseInviteCode(pathname: string): string | null {
  const match = pathname.match(/^\/i\/([^/?#]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function parseLinkToken(pathname: string): string | null {
  const match = pathname.match(/^\/c\/([^/?#]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/**
 * 轻量路由（无额外依赖）：
 * - /c/:token     → 专属打卡链接：提取 token 存入本地，进入主界面
 * - /i/:inviteCode → 邀请加入页（注册 / 找回）
 * - 已有 token     → 直接进主界面（打卡页）
 */
export function App() {
  const [hasToken, setHasToken] = useState(() => Boolean(getToken()));

  useEffect(() => {
    const linkToken = parseLinkToken(window.location.pathname);
    if (linkToken) {
      setToken(linkToken);
      window.history.replaceState(null, '', '/');
      setHasToken(true);
    }
  }, []);

  const inviteCode = parseInviteCode(window.location.pathname);

  const handleJoined = useCallback(() => {
    window.history.replaceState(null, '', '/');
    setHasToken(true);
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    window.history.replaceState(null, '', '/');
    setHasToken(false);
  }, []);

  if (hasToken) {
    return <HomePage onLogout={handleLogout} />;
  }

  if (inviteCode) {
    return <JoinPage inviteCode={inviteCode} onJoined={handleJoined} />;
  }

  return (
    <main className="page landing">
      <div className="card">
        <div className="join-emoji">🌙</div>
        <h1>早睡打卡</h1>
        <p className="subtitle">和朋友互相陪伴，早点睡觉。打开小组的邀请链接就能加入～</p>
      </div>
    </main>
  );
}
