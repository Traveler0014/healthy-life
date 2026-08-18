import { useCallback, useEffect, useState } from 'react';
import { api, setToken, type AdminPrompt, type Group, type Member } from './api';

interface AdminPageProps {
  onLogout: () => void;
}

/** 管理后台：房间管理 / 题库管理 / 改管理员口令。 */
export function AdminPage({ onLogout }: AdminPageProps) {
  const [tab, setTab] = useState<'rooms' | 'prompts'>('rooms');
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
  const [editRoom, setEditRoom] = useState<Group | null>(null);
  const [editName, setEditName] = useState('');
  const [editTimezone, setEditTimezone] = useState('');
  const [editVisibility, setEditVisibility] = useState<'exact' | 'presence'>('presence');
  // 题库管理
  const [prompts, setPrompts] = useState<AdminPrompt[] | null>(null);
  const [promptFilter, setPromptFilter] = useState<'active' | 'disabled' | 'all'>('all');
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editPrompt, setEditPrompt] = useState<AdminPrompt | null>(null);

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

  const loadPrompts = useCallback(async () => {
    setPrompts(null);
    try {
      const res = await api.adminListPrompts(promptFilter);
      setPrompts(res.prompts);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载题库失败');
      setPrompts([]);
    }
  }, [promptFilter]);

  useEffect(() => {
    if (tab === 'prompts') void loadPrompts();
  }, [tab, loadPrompts]);

  async function togglePromptStatus(p: AdminPrompt) {
    try {
      await api.adminUpdatePrompt(p.id, { status: p.status === 'active' ? 'disabled' : 'active' });
      setNotice(`「${p.id}」已${p.status === 'active' ? '下线' : '上架'}`);
      await loadPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  }

  async function deletePrompt(p: AdminPrompt) {
    if (!window.confirm(`确定删除题目「${p.id}」？历史抽题记录不受影响，但题目内容将不再展示。`)) return;
    try {
      await api.adminDeletePrompt(p.id);
      setNotice(`已删除「${p.id}」`);
      await loadPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  }

  async function runImport() {
    setImportMsg(null);
    try {
      const res = await api.adminImportBundle({
        url: importUrl.trim() || undefined,
        bundleText: importText.trim() || undefined,
      });
      setImportMsg({
        ok: true,
        text: `已导入「${res.bundleName}」v${res.version}：新增 ${res.imported}，更新 ${res.updated}，跳过 ${res.skipped}`,
      });
      setShowImport(false);
      setImportUrl('');
      setImportText('');
      await loadPrompts();
    } catch (err) {
      setImportMsg({ ok: false, text: err instanceof Error ? err.message : '导入失败' });
    }
  }

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

  function openRoomSettings(room: Group) {
    setEditRoom(room);
    setEditName(room.name);
    setEditTimezone(room.timezone);
    setEditVisibility(room.visibility);
  }

  async function saveRoomSettings() {
    if (!editRoom) return;
    const name = editName.trim();
    if (!name) {
      setError('房间名不能为空');
      return;
    }
    setBusy(true);
    try {
      await api.updateGroup(editRoom.id, {
        name,
        timezone: editTimezone.trim() || undefined,
        visibility: editVisibility,
      });
      setEditRoom(null);
      setNotice(`房间「${name}」设置已保存`);
      await loadRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
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

      <nav className="admin-tabs">
        <button
          type="button"
          className={tab === 'rooms' ? 'admin-tab active' : 'admin-tab'}
          onClick={() => setTab('rooms')}
        >
          房间管理
        </button>
        <button
          type="button"
          className={tab === 'prompts' ? 'admin-tab active' : 'admin-tab'}
          onClick={() => setTab('prompts')}
        >
          题库管理
        </button>
      </nav>

      {tab === 'rooms' && (
      <>
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
              <button type="button" className="button ghost small" onClick={() => openRoomSettings(room)}>
                设置
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
      </>
      )}

      {tab === 'prompts' && (
        <section className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0 }}>题库（{prompts === null ? '…' : prompts.length} 题）</h2>
            <button
              type="button"
              className="button primary small"
              onClick={() => {
                setImportMsg(null);
                setShowImport(true);
              }}
            >
              导入题目包
            </button>
          </div>
          <p className="hint small">
            题目存于数据库，抽题读库——上下线即时生效。题目包格式见 docs/07-prompt-bundle.md。
          </p>
          <div className="preset-chips" style={{ marginTop: 10 }}>
            {(['all', 'active', 'disabled'] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={promptFilter === f ? 'button chip selected' : 'button chip'}
                onClick={() => setPromptFilter(f)}
              >
                {f === 'all' ? '全部' : f === 'active' ? '上架中' : '已下线'}
              </button>
            ))}
          </div>
          <ul className="prompt-history">
            {prompts === null ? (
              <li className="hint">加载中…</li>
            ) : prompts.length === 0 ? (
              <li className="hint">没有题目</li>
            ) : (
              prompts.map((p) => (
                <li key={p.id}>
                  <p className="prompt-meta">
                    {p.id} · {p.category} · v{p.version} · {p.status === 'active' ? '上架中' : '已下线'} ·
                    来源：{p.source}
                  </p>
                  <p className="prompt-q">{p.question}</p>
                  <div className="notify-actions">
                    <button type="button" className="button chip" onClick={() => setEditPrompt(p)}>
                      编辑
                    </button>
                    <button type="button" className="button chip" onClick={() => togglePromptStatus(p)}>
                      {p.status === 'active' ? '下线' : '上架'}
                    </button>
                    <button type="button" className="button chip danger" onClick={() => deletePrompt(p)}>
                      删除
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      {showImport && (
        <div className="overlay">
          <div className="dialog" role="dialog" aria-label="导入题目包">
            <h2>导入题目包</h2>
            <p className="subtitle">
              粘贴题目包 JSON，或填写发布产物 URL（如 GitHub Release 上的 bundle.json）。URL 仅支持公网地址。
            </p>
            <div className="dialog-form">
              <label className="field">
                <span>URL（可选）</span>
                <input
                  type="text"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://github.com/.../releases/download/.../bundle.json"
                />
              </label>
              <label className="field">
                <span>题目包 JSON（可选）</span>
                <textarea
                  className="label-input"
                  rows={8}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder='{"schemaVersion":1,...}'
                />
              </label>
            </div>
            {importMsg && (
              <p className={importMsg.ok ? 'notice' : 'error'} role="status">
                {importMsg.text}
              </p>
            )}
            <div className="dialog-actions">
              <button type="button" className="button ghost" onClick={() => setShowImport(false)}>
                取消
              </button>
              <button
                type="button"
                className="button primary small"
                disabled={!importUrl.trim() && !importText.trim()}
                onClick={runImport}
              >
                导入
              </button>
            </div>
          </div>
        </div>
      )}

      {editPrompt && (
        <div className="overlay">
          <div className="dialog" role="dialog" aria-label="编辑题目">
            <h2>编辑题目</h2>
            <div className="dialog-form">
              <label className="field">
                <span>分类 id</span>
                <input
                  type="text"
                  value={editPrompt.category}
                  onChange={(e) => setEditPrompt({ ...editPrompt, category: e.target.value })}
                />
              </label>
              <label className="field">
                <span>题目</span>
                <textarea
                  className="label-input"
                  rows={4}
                  value={editPrompt.question}
                  onChange={(e) => setEditPrompt({ ...editPrompt, question: e.target.value })}
                />
              </label>
              <label className="field">
                <span>答案</span>
                <textarea
                  className="label-input"
                  rows={6}
                  value={editPrompt.answer}
                  onChange={(e) => setEditPrompt({ ...editPrompt, answer: e.target.value })}
                />
              </label>
              <label className="field">
                <span>来源</span>
                <input
                  type="text"
                  value={editPrompt.source}
                  onChange={(e) => setEditPrompt({ ...editPrompt, source: e.target.value })}
                />
              </label>
            </div>
            <div className="dialog-actions">
              <button type="button" className="button ghost" onClick={() => setEditPrompt(null)}>
                取消
              </button>
              <button
                type="button"
                className="button primary small"
                onClick={async () => {
                  try {
                    await api.adminUpdatePrompt(editPrompt.id, {
                      category: editPrompt.category,
                      question: editPrompt.question,
                      answer: editPrompt.answer,
                      source: editPrompt.source,
                    });
                    setEditPrompt(null);
                    setNotice(`「${editPrompt.id}」已保存`);
                    await loadPrompts();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : '保存失败');
                  }
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showPwd && (
        <div className="overlay">
          <div className="dialog" role="dialog" aria-label="修改管理员口令">
            <h2>修改管理员口令</h2>
            <div className="dialog-form">
              <label className="field">
                <span>原口令</span>
                <input
                  type="password"
                  value={oldPwd}
                  onChange={(e) => setOldPwd(e.target.value)}
                  placeholder="输入当前口令"
                />
              </label>
              <label className="field">
                <span>新口令</span>
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="至少 4 位"
                />
              </label>
            </div>
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

      {editRoom && (
        <div className="overlay">
          <div className="dialog" role="dialog" aria-label="房间设置">
            <h2>房间设置</h2>
            <div className="dialog-form">
              <label className="field">
                <span>房间名</span>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="房间名"
                  maxLength={24}
                />
              </label>
              <label className="field">
                <span>时区（IANA，如 Asia/Shanghai）</span>
                <input
                  type="text"
                  value={editTimezone}
                  onChange={(e) => setEditTimezone(e.target.value)}
                  placeholder="Asia/Shanghai"
                />
              </label>
              <div className="field">
                <span>打卡墙显示</span>
                <div className="segmented">
                  <label className={`seg ${editVisibility === 'exact' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="visibility"
                      value="exact"
                      checked={editVisibility === 'exact'}
                      onChange={() => setEditVisibility('exact')}
                    />
                    <span className="seg-title">显示打卡时间</span>
                    <span className="seg-desc">可互相监督前一晚</span>
                  </label>
                  <label className={`seg ${editVisibility === 'presence' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="visibility"
                      value="presence"
                      checked={editVisibility === 'presence'}
                      onChange={() => setEditVisibility('presence')}
                    />
                    <span className="seg-title">仅显示状态</span>
                    <span className="seg-desc">更隐私</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="dialog-actions">
              <button type="button" className="button ghost" onClick={() => setEditRoom(null)}>
                取消
              </button>
              <button type="button" className="button primary small" onClick={saveRoomSettings} disabled={busy}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
