import { useState, type FormEvent } from 'react';
import { api } from './api';
import { EmojiPicker } from './EmojiPicker';

interface JoinPageProps {
  inviteCode: string;
  /** 加入成功后由 App 接管：存 token 并跳转到专属链接 /c/<token> */
  onJoined: (token: string) => void;
}

/**
 * 加入 / 找回流程：昵称 + 口令 + 目标就寝时间 → POST /api/v1/join。
 * 同昵称+口令再次提交 = 找回同一条打卡链接（服务端判定）。
 */
export function JoinPage({ inviteCode, onJoined }: JoinPageProps) {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [targetBedtime, setTargetBedtime] = useState('23:00');
  const [emoji, setEmoji] = useState('😴');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const name = nickname.trim();
    if (!name) {
      setError('先告诉我你叫什么呀');
      return;
    }
    if (password.length < 4) {
      setError('口令至少 4 位');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.join({ inviteCode, nickname: name, password, targetBedtime, emoji });
      onJoined(res.token);
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

          <div className="field">
            <span>选个表情</span>
            <EmojiPicker value={emoji} onChange={setEmoji} />
          </div>

          <label className="field">
            <span>口令</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="设置一个口令（至少 4 位）"
              autoComplete="new-password"
              required
            />
            <small>用于找回打卡链接；已加入的话，填「昵称 + 口令」即可找回</small>
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

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="button primary" disabled={submitting}>
            {submitting ? '处理中…' : '加入小组'}
          </button>
        </form>
      </div>
    </main>
  );
}
