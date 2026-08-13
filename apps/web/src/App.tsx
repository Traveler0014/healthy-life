import { useCallback, useEffect, useState } from 'react';
import {
  api,
  ApiError,
  clearToken,
  getToken,
  isSystemAdmin,
  setToken,
  type Member,
} from './api';
import { JoinPage } from './JoinPage';
import { HomePage } from './HomePage';
import { AdminPage } from './AdminPage';
import { AdminLoginPage } from './AdminLoginPage';

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

function isAdminPath(pathname: string): boolean {
  return /^\/admin\/?$/.test(pathname);
}

export function App() {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [justJoined, setJustJoined] = useState(false);
  const [me, setMe] = useState<Member | null>(null);
  const [booting, setBooting] = useState<boolean>(() => Boolean(getToken()));

  // /c/:token → 提取并持久化 token（URL 保持不变）
  useEffect(() => {
    const linkToken = parseLinkToken(window.location.pathname);
    if (linkToken && linkToken !== token) {
      setToken(linkToken);
      setTokenState(linkToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 已登录但地址栏非 /c/... → 规范化到专属链接
  useEffect(() => {
    if (token && !parseLinkToken(window.location.pathname) && !isAdminPath(window.location.pathname)) {
      window.history.replaceState(null, '', `/c/${token}`);
    }
  }, [token]);

  // 拉取当前成员，区分 系统管理员 / 普通成员
  useEffect(() => {
    if (!token) {
      setMe(null);
      setBooting(false);
      return;
    }
    let cancelled = false;
    setBooting(true);
    api
      .me()
      .then((res) => {
        if (!cancelled) setMe(res.member);
      })
      .catch((err) => {
        if (!cancelled && err instanceof ApiError && err.status === 401) {
          clearToken();
          setTokenState(null);
          window.history.replaceState(null, '', '/');
        }
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleJoined = useCallback((newToken: string) => {
    setToken(newToken);
    setTokenState(newToken);
    setJustJoined(true);
    window.history.replaceState(null, '', `/c/${newToken}`);
  }, []);

  const handleAdminLoggedIn = useCallback((newToken: string) => {
    setToken(newToken);
    setTokenState(newToken);
    window.history.replaceState(null, '', `/c/${newToken}`);
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setMe(null);
    setJustJoined(false);
    window.history.replaceState(null, '', '/');
  }, []);

  if (token) {
    if (booting || !me) {
      return (
        <main className="page">
          <p className="hint">加载中…</p>
        </main>
      );
    }
    if (isSystemAdmin(me)) {
      return <AdminPage onLogout={handleLogout} />;
    }
    return (
      <HomePage
        onLogout={handleLogout}
        justJoined={justJoined}
        onDismissJoinHint={() => setJustJoined(false)}
      />
    );
  }

  if (isAdminPath(window.location.pathname)) {
    return <AdminLoginPage onLoggedIn={handleAdminLoggedIn} />;
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
