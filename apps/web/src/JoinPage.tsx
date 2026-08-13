import { useState, type FormEvent } from 'react';
import { api, setToken } from './api';

interface JoinPageProps {
  inviteCode: string;
  onJoined: () => void;
}

/** 加入流程：昵称 + 目标就寝时间 → POST /api/v1/join → 保存 token → 进主界面。 */
export function JoinPage({ inviteCode, onJoined }: JoinPageProps) {
  const [nickname, setNickname] = useState('');
  const [targetBedtime, setTargetBedtime] = useState('23:00');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const name = nickname.trim();
    if (!name) {
      setError('先告诉我你叫什么呀');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.join({ inviteCode, nickname: name, targetBedtime });
      setToken(res.token);
      onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page join-page">
      <div className="card join-card">
        <div className="join-emoji">🌙</div>
        <h1>加入朋友的早睡小组</h1>
        <p className="subtitle">定一个小目标，互相陪伴早点睡。忘打卡没有惩罚，晚睡也只是温和提醒。</p>

        <form onSubmit={handleSubmit} className="join-form">
          <label className="field">
            <span>昵称</span>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="大家怎么称呼你"
              maxLength={24}
              autoFocus
              required
            />
          </label>

          <label className="field">
            <span>目标就寝时间</span>
            <input
              type="time"
              value={targetBedtime}
              onChange={(e) => setTargetBedtime(e.target.value)}
              required
            />
            <small>默认 23:00，按自己舒服的节奏来</small>
          </label>

          {error && <p className="error" role="alert">{error}</p>}

          <button type="submit" className="button primary" disabled={submitting}>
            {submitting ? '加入中…' : '加入小组'}
          </button>
        </form>
      </div>
    </main>
  );
}
