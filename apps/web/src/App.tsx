import { useCallback, useState } from 'react';
import { clearToken, getToken } from './api';
import { JoinPage } from './JoinPage';
import { HomePage } from './HomePage';

/**
 * 轻量路由（无额外依赖）：
 * - /i/:inviteCode → 邀请加入页
 * - 已有 token → 直接进主界面（打卡页）
 */
function parseInviteCode(pathname: string): string | null {
  const match = pathname.match(/^\/i\/([^/?#]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function App() {
  const [hasToken, setHasToken] = useState(() => Boolean(getToken()));
  // 每次渲染从当前 URL 读取，配合 history.replaceState 在加入/退出后即时更新。
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
