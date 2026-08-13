import { useState, type FormEvent } from 'react';
import { api, setToken } from './api';

/** 管理员登录页：输入口令 → 换取管理员专属链接。 */
export function AdminLoginPage({ onLoggedIn }: { onLoggedIn: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.adminLogin(password);
      setToken(res.token);
      onLoggedIn(res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page join-page">
      <div className="card join-card">
        <div className="join-emoji">🛠️</div>
        <h1>管理后台</h1>
        <p className="subtitle">输入管理员口令登录</p>
        <form onSubmit={handleSubmit} className="join-form">
          <label className="field">
            <span>口令</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" className="button primary" disabled={submitting}>
            {submitting ? '登录中…' : '登录'}
          </button>
        </form>
      </div>
    </main>
  );
}
