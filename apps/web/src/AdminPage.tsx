import { useCallback, useEffect, useState } from 'react';
import { api, setToken, type Group, type Member } from './api';

interface AdminPageProps {
  onLogout: () => void;
}

/** 管理后台：建房间、管理成员（移除/重设口令）、改管理员口令。 */
export function AdminPage({ onLogout }: AdminPageProps) {
  const [rooms, setRooms] = useState<Group[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');

  const loadRooms = useCallback(async () => {
    try {
      const res = await api.listGroups();
      setRooms(res.groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载房间失败');
    }
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice('已复制到剪贴板');
    } catch {
      // ignore
    }
  }

  function inviteLink(room: Group): string {
    return `${window.location.origin}/i/${room.inviteCode}`;
  }

  async function toggleRoom(room: Group) {
    if (expanded === room.id) {
      setExpanded(null);
      return;
    }
    setExpanded(room.id);
    try {
      const res = await api.listRoomMembers(room.id);
      setMembers(res.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载成员失败');
    }
  }

  async function createRoom() {
    const name = newRoomName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await api.createGroup(name);
      setNewRoomName('');
      setNotice(`房间「${name}」已创建`);
      await loadRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(room: Group, m: Member) {
    if (!window.confirm(`确定移除「${m.nickname}」？其打卡记录将一并删除。`)) return;
    try {
      await api.removeMember(room.id, m.id);
      setNotice(`已移除「${m.nickname}」`);
      const res = await api.listRoomMembers(room.id);
      setMembers(res.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : '移除失败');
    }
  }

  async function resetMember(room: Group, m: Member) {
    setBusy(true);
    try {
      const res = await api.resetMemberPassword(room.id, m.id);
      await copy(res.link);
      setNotice(
        `已重置「${m.nickname}」的口令${res.password ? `（新口令 ${res.password}）` : ''}，新链接已复制到剪贴板`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败');
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    if (newPwd.length < 4) {
      setError('新口令至少 4 位');
      return;
    }
    setBusy(true);
    try {
      const res = await api.adminChangePassword(oldPwd, newPwd);
      setToken(res.token);
      setOldPwd('');
      setNewPwd('');
      setShowPwd(false);
      await copy(res.link);
      setNotice('口令已修改，新链接已复制到剪贴板');
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page admin-page">
      <header className="topbar">
        <div className="brand">🛠️ 管理后台</div>
        <div className="topbar-actions">
          <button type="button" className="button ghost small" onClick={() => setShowPwd(true)}>
            改口令
          </button>
          <button type="button" className="button ghost" onClick={onLogout}>
            退出
          </button>
        </div>
      </header>

      {notice && <div className="notice" role="status">{notice}</div>}
      {error && <p className="error" role="alert">{error}</p>}

      <section className="card">
        <h2>新建房间</h2>
        <div className="row">
          <input
            type="text"
            className="label-input"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="房间名，如「早睡小分队」"
            maxLength={24}
          />
          <button type="button" className="button primary small" onClick={createRoom} disabled={busy}>
            创建
          </button>
        </div>
      </section>

      <section className="card">
        <h2>房间</h2>
        {rooms.length === 0 && <p className="hint">还没有房间，先创建一个吧</p>}
        {rooms.map((room) => (
          <div key={room.id} className="room-block">
            <div className="room-head">
              <span className="room-name">{room.name}</span>
              <button type="button" className="button ghost small" onClick={() => copy(inviteLink(room))}>
                复制邀请链接
              </button>
              <button type="button" className="button ghost small" onClick={() => toggleRoom(room)}>
                {expanded === room.id ? '收起' : '成员'}
              </button>
            </div>
            {expanded === room.id && (
              <ul className="board">
                {members.map((m) => (
                  <li key={m.id} className="board-item">
                    <span className="board-emoji">{m.emoji}</span>
                    <span className="board-name">{m.nickname}</span>
                    <span className="board-state">
                      <button type="button" className="button ghost small" onClick={() => resetMember(room, m)} disabled={busy}>
                        重置口令
                      </button>
                      <button type="button" className="button ghost small danger" onClick={() => removeMember(room, m)}>
                        移除
                      </button>
                    </span>
                  </li>
                ))}
                {members.length === 0 && <p className="hint">暂无成员</p>}
              </ul>
            )}
          </div>
        ))}
      </section>

      {showPwd && (
        <div className="overlay">
          <div className="dialog" role="dialog" aria-label="修改管理员口令">
            <h2>修改管理员口令</h2>
            <input
              type="password"
              className="label-input"
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              placeholder="原口令"
            />
            <input
              type="password"
              className="label-input"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="新口令（至少 4 位）"
            />
            <div className="dialog-actions">
              <button type="button" className="button ghost" onClick={() => setShowPwd(false)}>
                取消
              </button>
              <button type="button" className="button primary small" onClick={changePassword} disabled={busy}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
