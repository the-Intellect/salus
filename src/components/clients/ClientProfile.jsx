import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/index.js';
import { Button, Avatar, Card, Field, ResultPill, PageHeader, EmptyState } from '../UI.jsx';
import { useAppStore } from '../../store/appStore.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/useLanguage.js';
import styles from './ClientProfile.module.css';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDob(val) {
  const d = val.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return d.slice(0, 2) + '/' + d.slice(2);
  return d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4);
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' kell ' + d.toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit' });
}

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const isEt = language === 'et';
  const startSession = useAppStore(s => s.startSession);
  const clearSession = useAppStore(s => s.clearSession);
  const activeSession = useAppStore(s => s.activeSession);
  const activeClientId = useAppStore(s => s.activeClientId);
  const [tab, setTab] = useState('sessions');
  const [client, setClient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const [c, s] = await Promise.all([api.getClient(id), api.getSessions(id)]);
    setClient(c);
    setSessions(s);
  };

  useEffect(() => {
    const loadAll = async () => {
      await loadData();
      // Ainult admin saab kasutajate nimekirja
      if (user?.role === 'admin') {
        const u = await api.getUsers().catch(() => []);
        setUsers(u);
      }
      setLoading(false);
    };
    loadAll();
  }, [id]);

  if (loading) return <div style={{ color: 'var(--color-text-muted)' }}>Laadimine...</div>;
  if (!client) return <div>Klienti ei leitud.</div>;

  const name = `${client.first_name} ${client.last_name}`;

  const freqHistory = () => {
    const map = new Map();
    for (const s of sessions) {
      for (const e of (s.entries || [])) {
        if (!map.has(e.frequencyId)) {
          map.set(e.frequencyId, { frequencyId: e.frequencyId, frequencyName: e.frequencyName, history: [] });
        }
        map.get(e.frequencyId).history.push({ date: s.date, initial: e.initial, minutes: e.minutes, final: e.final });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.history[0]?.date?.localeCompare(a.history[0]?.date));
  };

  return (
    <div>
      <PageHeader title={name} action={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={() => navigate('/clients')}>← {t('back')}</Button>
          {activeSession && activeClientId === Number(id) ? (
            <Button variant="primary" onClick={() => navigate('/session')}>
              ⚡ {isEt ? 'Jätka seanssi' : 'Continue session'}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => { startSession(Number(id)); navigate('/session'); }}>{t('start_session')}</Button>
          )}
        </div>
      } />
      <div className={styles.profileHeader}>
        <Avatar name={name} size={48} />
        <div>
          <div className={styles.profileName}>{name}</div>
          <div className={styles.profileMeta}>{client.branch} · {sessions.length} {t('client_sessions_count')}</div>
        </div>
      </div>
      <div className={styles.tabs}>
        {['sessions', 'frequencies', 'ai', 'notes', 'data'].map(tabId => (
          <button key={tabId} className={`${styles.tab} ${tab === tabId ? styles.tabActive : ''}`} onClick={() => setTab(tabId)}>
            {{ sessions: t('tab_sessions'), frequencies: t('tab_frequencies'), ai: t('tab_ai'), notes: t('tab_notes'), data: t('tab_data') }[tabId]}
          </button>
        ))}
      </div>
      {tab === 'sessions' && <SessionsTab sessions={sessions} clientId={id} client={client} navigate={navigate} onRefresh={loadData} />}
      {tab === 'ai' && <AiTab clientId={id} />}
      {tab === 'frequencies' && <FrequenciesTab history={freqHistory()} />}
      {tab === 'notes' && <NotesTab client={client} clientId={id} onSave={c => setClient(c)} />}
      {tab === 'data' && <DataTab client={client} clientId={id} users={users} currentUser={user} onSave={c => setClient(c)} />}
    </div>
  );
}

// --- Seansid ---
function SessionsTab({ sessions, clientId, client, navigate, onRefresh }) {
  const loadSessionForEdit = useAppStore(s => s.loadSessionForEdit);
  const { language, t } = useLanguage();
  const [reportLoading, setReportLoading] = useState(null);
  const [openSessionId, setOpenSessionId] = useState(null);

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Oled kindel, et soovid selle seansi kustutada?')) return;
    await api.deleteSession(sessionId);
    onRefresh();
  };

  const handleEdit = (session) => {
    loadSessionForEdit(session, Number(clientId));
    navigate('/session');
  };

  const handleReport = async (session, lang) => {
    setReportLoading(session.id + lang);
    try {
      const blob = await api.generateReport(session.id, lang);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${client.first_name}_${client.last_name}_${formatDate(session.date).replace(/\./g, '-')}_${lang}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Raporti genereerimine ebaõnnestus: ' + err.message);
    } finally {
      setReportLoading(null);
    }
  };

  if (!sessions.length) return <EmptyState icon="⚡" title={t('no_sessions_title')} description={t('no_sessions_desc')} />;

  // Arvuta seansi number loomise järjekorra järgi (vanim = #1)
  const sessionNumbers = {};
  [...sessions].sort((a, b) => new Date(a.created_at || a.date) - new Date(b.created_at || b.date))
    .forEach((s, i) => { sessionNumbers[s.id] = i + 1; });

  return (
    <div className={styles.freqAccordion}>
      {sessions.map((s) => {
        const idx = sessionNumbers[s.id];
        const isOpen = openSessionId === s.id;
        return (
          <div key={s.id} className={`${styles.accordionItem} ${isOpen ? styles.accordionOpen : ''}`}>
            {/* Päis — klikk avab/sulgeb */}
            <div className={styles.accordionHeader} onClick={() => setOpenSessionId(isOpen ? null : s.id)}>
              <div className={styles.accordionLeft}>
                <span className={styles.freqName}>{formatDate(s.date)} · Seanss #{idx}</span>
                <span className={styles.freqMeta}>{s.therapist_name} · {s.entries?.length || 0} {t('frequencies_count')} · {s.duration_minutes || 60} min</span>
              </div>
              <div className={styles.accordionRight} onClick={e => e.stopPropagation()}>
                <Button variant="secondary" size="sm" onClick={() => handleEdit(s)}>✏️</Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)}>🗑️</Button>
                <Button variant="secondary" size="sm" onClick={() => handleReport(s, 'et')} disabled={!!reportLoading}>
                  {reportLoading === s.id + 'et' ? '...' : '↓ ET'}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleReport(s, 'en')} disabled={!!reportLoading}>
                  {reportLoading === s.id + 'en' ? '...' : '↓ EN'}
                </Button>
                <span className={styles.accordionChevron}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>
            {/* Tulemused */}
            {isOpen && (
              <div className={styles.accordionBody}>
                {!s.entries?.length
                  ? <p style={{ fontSize: 14, color: 'var(--color-text-muted)', padding: '12px 1.25rem' }}>Sagedusi pole</p>
                  : s.entries.map((e, i) => (
                    <div key={i} className={styles.sessionEntry}>
                      <span className={styles.sessionEntryDesc}>{(language === 'en' && e.frequencyDescriptionEn ? e.frequencyDescriptionEn : e.frequencyDescription) || e.frequencyName}</span>
                      <div className={styles.sessionEntryMins}>
                        {e.initial !== null && e.initial !== undefined && <ResultPill value={e.initial} />}
                        {(e.minutes || []).map((m, mi) => <ResultPill key={mi} value={m} />)}
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- AI soovitused ---
function AiTab({ clientId }) {
  const { t } = useLanguage();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [editText, setEditText] = useState('');
  const [newText, setNewText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.getAiSuggestions(clientId).then(setSuggestions).finally(() => setLoading(false));
  useEffect(() => { load(); }, [clientId]);

  const handleSaveNew = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    try { await api.saveAiSuggestion(clientId, null, newText); setNewText(''); load(); }
    catch(err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Kustuta soovitus?')) return;
    await api.deleteAiSuggestion(id);
    load();
  };

  const handleEditSave = async () => {
    try { await api.saveAiSuggestion(clientId, null, editText); setEditModal(null); load(); }
    catch(err) { alert(err.message); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>{t('ai_new_suggestion')}</div>
        <textarea value={newText} onChange={e => setNewText(e.target.value)} rows={4}
          style={{ width: '100%', resize: 'vertical', marginBottom: 8 }}
          placeholder={t('ai_placeholder')} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" size="sm" disabled={saving || !newText.trim()} onClick={async () => {
            if (!newText.trim()) return;
            setSaving(true);
            try {
              const { suggestion } = await api.getAiSuggestion(clientId, [], newText);
              setNewText(suggestion);
            } catch(err) { alert(err.message); }
            finally { setSaving(false); }
          }}>
            {saving ? '⏳...' : t('ai_ask_button')}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSaveNew} disabled={!newText.trim() || saving}>
            💾 Salvesta
          </Button>
        </div>
      </Card>

      {loading ? <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Laadimine...</p> :
       suggestions.length === 0 ? <EmptyState icon="✨" title={t('ai_empty')} /> :
       suggestions.map(s => (
         <Card key={s.id}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
             <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
               {new Date(s.saved_at).toLocaleDateString('et-EE')} kell {new Date(s.saved_at).toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit' })}
             </span>
             <div style={{ display: 'flex', gap: 6 }}>
               <Button variant="secondary" size="sm" onClick={() => { setEditText(s.text); setEditModal(s.id); }}>✏️</Button>
               <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)}>🗑️</Button>
             </div>
           </div>
           <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)' }}>{s.text}</div>
         </Card>
       ))
      }

      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setEditModal(null)}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', width: '90%', maxWidth: 500 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Redigeeri soovitust</div>
            <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={10}
              style={{ width: '100%', fontSize: 14, resize: 'vertical', marginBottom: 12 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="secondary" onClick={() => setEditModal(null)}>Tühista</Button>
              <Button variant="primary" onClick={handleEditSave}>💾 Salvesta</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sageduste ajalugu ---
function FrequenciesTab({ history }) {
  const { t } = useLanguage();
  const [openId, setOpenId] = useState(null);
  if (!history.length) return <EmptyState icon="📊" title={t('no_freq_history')} />;
  return (
    <div className={styles.freqAccordion}>
      {history.map(f => {
        const last = f.history[0];
        const isOpen = openId === f.frequencyId;
        return (
          <div key={f.frequencyId} className={`${styles.accordionItem} ${isOpen ? styles.accordionOpen : ''}`}>
            <div className={styles.accordionHeader} onClick={() => setOpenId(isOpen ? null : f.frequencyId)}>
              <div className={styles.accordionLeft}>
                <span className={styles.freqName}>{f.frequencyName}</span>
                <span className={styles.freqMeta}>{f.history.length}× {t('freq_done')} · {t('freq_last')} {formatDate(last?.date)}</span>
              </div>
              <div className={styles.accordionRight}>
                <ResultPill value={last?.final} />
                <span className={styles.accordionChevron}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>
            {isOpen && (
              <div className={styles.accordionBody}>
                <div className={styles.historyHeader}>
                  <span>{t('freq_date')}</span><span>{t('freq_initial')}</span><span>{t('freq_balancing')}</span><span>{t('freq_end_result')}</span>
                </div>
                {f.history.map((h, i) => (
                  <div key={i} className={styles.historyRow}>
                    <span className={styles.historyDate}>{formatDate(h.date)}</span>
                    <ResultPill value={h.initial} />
                    <div className={styles.historyMins}>
                      {h.minutes?.length > 0
                        ? h.minutes.map((m, mi) => <span key={mi} className={styles.minChip}>{mi + 1}min: {m}</span>)
                        : <span className={styles.noMins}>—</span>}
                    </div>
                    <ResultPill value={h.final} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Märkmed ---
function NotesTab({ client, clientId, onSave }) {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const [editingNote, setEditingNote] = useState(null); // { index, text }
  const [history, setHistory] = useState(client.notes_history || []);

  const handleSave = async () => {
    if (!text.trim()) return;
    const notes = await api.addNote(clientId, text);
    onSave({ ...client, notes: text, notes_history: notes });
    setHistory(notes);
    setText(''); // tühjenda kast peale salvestust
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Kustuta märkus?')) return;
    try {
      const notes = await api.deleteNote(clientId, noteId);
      setHistory(notes);
      onSave({ ...client, notes_history: notes });
    } catch(err) { alert(err.message); }
  };

  const handleEditNote = async (noteId, newText) => {
    try {
      const notes = await api.editNote(clientId, noteId, newText);
      setHistory(notes);
      onSave({ ...client, notes_history: notes });
      setEditingNote(null);
    } catch(err) { alert(err.message); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <textarea value={text} onChange={e => { setText(e.target.value); setSaved(false); }}
          rows={4} style={{ width: '100%', resize: 'vertical' }} placeholder={t('notes_placeholder')} />
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {saved ? <span style={{ fontSize: 14, color: 'var(--color-ok)' }}>✓ Salvestatud</span> : <span />}
          <Button variant="primary" onClick={handleSave} disabled={!text.trim()}>{t('notes_save_btn')}</Button>
        </div>
      </Card>
      {history.length > 0 && (
        <Card>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{t('notes_history_title')}</div>
          {history.map((e, i) => (
            <div key={i} className={styles.noteEntry}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className={styles.noteDate}>{formatDateTime(e.saved_at)}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button variant="secondary" size="sm" onClick={() => setEditingNote({ noteId: e.id, text: e.text })}>✏️</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDeleteNote(e.id)}>🗑️</Button>
                </div>
              </div>
              {editingNote?.noteId === e.id ? (
                <div style={{ marginTop: 6 }}>
                  <textarea value={editingNote.text} onChange={ev => setEditingNote({ ...editingNote, text: ev.target.value })}
                    rows={3} style={{ width: '100%', fontSize: 13, resize: 'vertical', marginBottom: 6 }} />
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <Button variant="secondary" size="sm" onClick={() => setEditingNote(null)}>Tühista</Button>
                    <Button variant="primary" size="sm" onClick={() => handleEditNote(e.id, editingNote.text)}>💾 Salvesta</Button>
                  </div>
                </div>
              ) : (
                <div className={styles.noteText}>{e.text}</div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// --- Andmed ---
function DataTab({ client, clientId, users, currentUser, onSave }) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: client.first_name, lastName: client.last_name,
    dob: client.dob || '', gender: client.gender || 'Naine',
    email: client.email || '', phone: client.phone || '',
    branch: client.branch || 'Tallinn', reason: client.reason || '',
    source: client.source || '', therapistId: client.therapist_id || ''
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = async () => { const c = await api.updateClient(clientId, form); onSave(c); setEditing(false); };

  const rows = [
    { label: t('data_first_name'), key: 'firstName', type: 'text' },
    { label: t('data_last_name'), key: 'lastName', type: 'text' },
    { label: t('data_birth_date'), key: 'dob', type: 'dob' },
    { label: t('data_gender'), key: 'gender', type: 'select', opts: ['Naine', 'Mees', 'Laps (N)', 'Laps (M)'] },
    { label: t('data_email'), key: 'email', type: 'email' },
    { label: t('data_phone'), key: 'phone', type: 'tel' },
    { label: t('data_branch'), key: 'branch', type: 'select', opts: ['Tallinn', 'Tartu', 'Kuressaare'] },
    { label: t('data_reason'), key: 'reason', type: 'text' },
    { label: t('data_heard_from'), key: 'source', type: 'text' },
  ];

  return (
    <Card style={{ maxWidth: 520 }}>
      <div className={styles.dataHeader}>
        <span className={styles.dataTitle}>{t('data_title')}</span>
        {!editing
          ? <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>✏️ {t('data_edit')}</Button>
          : <div style={{ display: 'flex', gap: 6 }}>
              <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Tühista</Button>
              <Button variant="primary" size="sm" onClick={handleSave}>💾 Salvesta</Button>
            </div>
        }
      </div>
      {rows.map(row => (
        <div key={row.key} className={styles.dataRow}>
          <span className={styles.dataLabel}>{row.label}</span>
          {editing
            ? row.type === 'select'
              ? <select value={form[row.key]} onChange={e => set(row.key, e.target.value)} style={{ width: 200 }}>
                  {row.opts.map(o => <option key={o}>{o}</option>)}
                </select>
              : row.type === 'dob'
              ? <input value={form[row.key]} onChange={e => set(row.key, formatDob(e.target.value))} maxLength={10} style={{ width: 200 }} />
              : <input type={row.type} value={form[row.key] || ''} onChange={e => set(row.key, e.target.value)} style={{ width: 200 }} />
            : <span className={styles.dataValue}>{form[row.key] || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</span>
          }
        </div>
      ))}
      {/* Terapeudi valik ainult adminile */}
      {currentUser?.role === 'admin' && (
        <div className={styles.dataRow}>
          <span className={styles.dataLabel}>Terapeut</span>
          {editing
            ? <select value={form.therapistId} onChange={e => set('therapistId', e.target.value)} style={{ width: 200 }}>
                <option value="">— Määramata —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            : <span className={styles.dataValue}>{users.find(u => u.id === client.therapist_id)?.name || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</span>
          }
        </div>
      )}
    </Card>
  );
}
