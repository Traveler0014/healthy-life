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
 * - /c/:token      → 专属打卡链接（地址栏即链接，持有即本人，可收藏）
 * - /i/:inviteCode → 邀请加入页（注册 / 找回）
 * - 已登录但地址栏非 /c/... → 自动规范化到专属链接
 */
export function App() {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [justJoined, setJustJoined] = useState(false);

  // /c/:token 访问 → 提取并持久化 token（URL 保持不变）
  useEffect(() => {
    const linkToken = parseLinkToken(window.location.pathname);
    if (linkToken && linkToken !== token) {
      setToken(linkToken);
      setTokenState(linkToken);
    }
    // 仅在挂载时处理一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 已登录但地址栏不是专属链接 → 规范化到 /c/:token
  useEffect(() => {
    if (token && !parseLinkToken(window.location.pathname)) {
      window.history.replaceState(null, '', `/c/${token}`);
    }
  }, [token]);

  const handleJoined = useCallback((newToken: string) => {
    setToken(newToken);
    setTokenState(newToken);
    setJustJoined(true);
    window.history.replaceState(null, '', `/c/${newToken}`);
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setJustJoined(false);
    window.history.replaceState(null, '', '/');
  }, []);

  if (token) {
    return (
      <HomePage
        onLogout={handleLogout}
        justJoined={justJoined}
        onDismissJoinHint={() => setJustJoined(false)}
      />
    );
  }

  const inviteCode = parseInviteCode(window.location.pathname);
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
