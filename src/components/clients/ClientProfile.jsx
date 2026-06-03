import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/index.js';
import { Button, Avatar, Card, Field, ResultPill, PageHeader, EmptyState } from '../UI.jsx';
import { useAppStore } from '../../store/appStore.js';
import { useAuth } from '../../context/AuthContext.jsx';
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
          <Button variant="secondary" onClick={() => navigate('/clients')}>← Tagasi</Button>
          <Button variant="primary" onClick={() => { startSession(Number(id)); navigate('/session'); }}>⚡ Alusta seanssi</Button>
        </div>
      } />
      <div className={styles.profileHeader}>
        <Avatar name={name} size={48} />
        <div>
          <div className={styles.profileName}>{name}</div>
          <div className={styles.profileMeta}>{client.branch} · {sessions.length} seanssi</div>
        </div>
      </div>
      <div className={styles.tabs}>
        {['sessions', 'frequencies', 'ai', 'notes', 'data'].map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
            {{ sessions: 'Seansid', frequencies: 'Sageduste ajalugu', ai: 'AI soovitused', notes: 'Märkmed', data: 'Andmed' }[t]}
          </button>
        ))}
      </div>
      {tab === 'sessions' && <SessionsTab sessions={sessions} clientId={id} navigate={navigate} onRefresh={loadData} />}
      {tab === 'ai' && <AiTab clientId={id} />}
      {tab === 'frequencies' && <FrequenciesTab history={freqHistory()} />}
      {tab === 'notes' && <NotesTab client={client} clientId={id} onSave={c => setClient(c)} />}
      {tab === 'data' && <DataTab client={client} clientId={id} users={users} currentUser={user} onSave={c => setClient(c)} />}
    </div>
  );
}

// --- Seansid ---
function SessionsTab({ sessions, clientId, navigate, onRefresh }) {
  const loadSessionForEdit = useAppStore(s => s.loadSessionForEdit);
  const [reportLoading, setReportLoading] = useState(null);

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
      a.download = `raport_${formatDate(session.date).replace(/\./g, '-')}_${lang}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Raporti genereerimine ebaõnnestus: ' + err.message);
    } finally {
      setReportLoading(null);
    }
  };

  if (!sessions.length) return <EmptyState icon="⚡" title="Seanse pole veel" description="Alusta esimene seanss." />;

  // Arvuta seansi number loomise järjekorra järgi (vanim = #1)
  const sessionNumbers = {};
  [...sessions].sort((a, b) => new Date(a.created_at || a.date) - new Date(b.created_at || b.date))
    .forEach((s, i) => { sessionNumbers[s.id] = i + 1; });

  return (
    <div className={styles.sessionList}>
      {sessions.map((s) => {
        const idx = sessionNumbers[s.id];
        return (
        <Card key={s.id} className={styles.sessionCard}>
          <div className={styles.sessionTop}>
            <div>
              <div className={styles.sessionDate}>{formatDate(s.date)} · Seanss #{idx}</div>
              <div className={styles.sessionMeta}>{s.therapist_name} · {s.entries?.length || 0} sagedust</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Button variant="secondary" size="sm" onClick={() => handleEdit(s)}>✏️ Muuda</Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)}>🗑️ Kustuta</Button>
              <Button variant="secondary" size="sm" onClick={() => handleReport(s, 'et')} disabled={!!reportLoading}>
                {reportLoading === s.id + 'et' ? '...' : '↓ ET'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleReport(s, 'en')} disabled={!!reportLoading}>
                {reportLoading === s.id + 'en' ? '...' : '↓ EN'}
              </Button>
            </div>
          </div>
          {s.entries?.length > 0 && (
            <div className={styles.entryList}>
              {s.entries.map((e, i) => (
                <div key={i} className={styles.entry}>
                  <span className={styles.entryDesc}>{e.frequencyDescription || e.frequencyName}</span>
                  <div className={styles.entryMins}>
                    <ResultPill value={e.initial} />
                    {(e.minutes || []).map((m, mi) => <ResultPill key={mi} value={m} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        );
      })}
    </div>
  );
}

// --- AI soovitused ---
function AiTab({ clientId }) {
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
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Uus AI soovitus / märkus</div>
        <textarea value={newText} onChange={e => setNewText(e.target.value)} rows={4}
          style={{ width: '100%', resize: 'vertical', marginBottom: 8 }}
          placeholder="Küsi AI käest soovitust enne seanssi või lisa oma märkus..." />
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
            {saving ? '⏳...' : '✨ Küsi AI käest'}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSaveNew} disabled={!newText.trim() || saving}>
            💾 Salvesta
          </Button>
        </div>
      </Card>

      {loading ? <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Laadimine...</p> :
       suggestions.length === 0 ? <EmptyState icon="✨" title="AI soovitusi pole veel salvestatud" /> :
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
           <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)' }}>{s.text}</div>
         </Card>
       ))
      }

      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setEditModal(null)}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', width: '90%', maxWidth: 500 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Redigeeri soovitust</div>
            <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={10}
              style={{ width: '100%', fontSize: 13, resize: 'vertical', marginBottom: 12 }} />
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
  const [openId, setOpenId] = useState(null);
  if (!history.length) return <EmptyState icon="📊" title="Andmeid pole veel" />;
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
                <span className={styles.freqMeta}>{f.history.length}× tehtud · viimati {formatDate(last?.date)}</span>
              </div>
              <div className={styles.accordionRight}>
                <ResultPill value={last?.final} />
                <span className={styles.accordionChevron}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>
            {isOpen && (
              <div className={styles.accordionBody}>
                <div className={styles.historyHeader}>
                  <span>Kuupäev</span><span>Esialgne</span><span>Minutite tulemused</span><span>Lõpptulemus</span>
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
  const [text, setText] = useState(client.notes || '');
  const [saved, setSaved] = useState(false);
  const history = client.notes_history || [];

  const handleSave = async () => {
    const notes = await api.addNote(clientId, text);
    onSave({ ...client, notes: text, notes_history: notes });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <textarea value={text} onChange={e => { setText(e.target.value); setSaved(false); }}
          rows={6} style={{ width: '100%', resize: 'vertical' }} placeholder="Kliendi ajalugu, tähelepanekud..." />
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {saved ? <span style={{ fontSize: 13, color: 'var(--color-ok)' }}>✓ Salvestatud</span> : <span />}
          <Button variant="primary" onClick={handleSave}>💾 Salvesta märkmed</Button>
        </div>
      </Card>
      {history.length > 0 && (
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Märkmete ajalugu</div>
          {history.map((e, i) => (
            <div key={i} className={styles.noteEntry}>
              <div className={styles.noteDate}>{formatDateTime(e.saved_at)}</div>
              <div className={styles.noteText}>{e.text}</div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// --- Andmed ---
function DataTab({ client, clientId, users, currentUser, onSave }) {
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
    { label: 'Eesnimi', key: 'firstName', type: 'text' },
    { label: 'Perekonnanimi', key: 'lastName', type: 'text' },
    { label: 'Sünnikuupäev', key: 'dob', type: 'dob' },
    { label: 'Sugu', key: 'gender', type: 'select', opts: ['Naine', 'Mees', 'Laps (N)', 'Laps (M)'] },
    { label: 'Email', key: 'email', type: 'email' },
    { label: 'Telefon', key: 'phone', type: 'tel' },
    { label: 'Filiaali', key: 'branch', type: 'select', opts: ['Tallinn', 'Tartu', 'Kuressaare'] },
    { label: 'Pöördumise põhjus', key: 'reason', type: 'text' },
    { label: 'Kust kuulis meist', key: 'source', type: 'text' },
  ];

  return (
    <Card style={{ maxWidth: 520 }}>
      <div className={styles.dataHeader}>
        <span className={styles.dataTitle}>Kliendi andmed</span>
        {!editing
          ? <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>✏️ Muuda</Button>
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
