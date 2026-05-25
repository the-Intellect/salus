import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClient, updateClient, getSessionsByClient, getFrequencyHistory } from '../../db/database';
import { Button, Avatar, Card, Badge, Field, ResultPill, PageHeader, EmptyState } from '../UI';
import { useAppStore } from '../../store/appStore';
import styles from './ClientProfile.module.css';

function formatDob(val) {
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
}

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const startSession = useAppStore(s => s.startSession);
  const [tab, setTab] = useState('sessions');
  const [client, setClient] = useState(() => getClient(id));
  const [sessions] = useState(() => getSessionsByClient(id));
  const [freqHistory] = useState(() => getFrequencyHistory(id));

  if (!client) return <div>Klienti ei leitud.</div>;

  const name = `${client.firstName} ${client.lastName}`;

  const handleStartSession = () => {
    startSession(Number(id));
    navigate('/session');
  };

  return (
    <div>
      <PageHeader
        title={name}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => navigate('/clients')}>← Tagasi</Button>
            <Button variant="primary" onClick={handleStartSession}>⚡ Alusta seanssi</Button>
          </div>
        }
      />

      <div className={styles.profileHeader}>
        <Avatar name={name} size={48} />
        <div>
          <div className={styles.profileName}>{name}</div>
          <div className={styles.profileMeta}>{client.branch} · {sessions.length} seanssi</div>
        </div>
      </div>

      <div className={styles.tabs}>
        {['sessions', 'frequencies', 'notes', 'data'].map(t => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {{ sessions: 'Seansid', frequencies: 'Sageduste ajalugu', notes: 'Märkmed', data: 'Andmed' }[t]}
          </button>
        ))}
      </div>

      {tab === 'sessions' && <SessionsTab sessions={sessions} />}
      {tab === 'frequencies' && <FrequenciesTab history={freqHistory} />}
      {tab === 'notes' && <NotesTab client={client} onSave={data => setClient(updateClient(id, data))} />}
      {tab === 'data' && <DataTab client={client} onSave={data => setClient(updateClient(id, data))} />}
    </div>
  );
}

function SessionsTab({ sessions }) {
  if (!sessions.length) return <EmptyState icon="⚡" title="Seanse pole veel" description="Alusta esimene seanss." />;
  return (
    <div className={styles.sessionList}>
      {sessions.map(s => (
        <Card key={s.id} className={styles.sessionCard}>
          <div className={styles.sessionTop}>
            <div>
              <div className={styles.sessionDate}>{s.date}</div>
              <div className={styles.sessionMeta}>{s.therapist} · {s.entries.length} sagedust</div>
            </div>
            <Button variant="secondary" size="sm">↓ Raport</Button>
          </div>
          {s.entries.length > 0 && (
            <div className={styles.entryList}>
              {s.entries.map((e, i) => (
                <div key={i} className={styles.entry}>
                  <span className={styles.entryName}>{e.frequencyName}</span>
                  <div className={styles.entryMins}>
                    <ResultPill value={e.initial} />
                    {e.minutes.map((m, mi) => <ResultPill key={mi} value={m} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function FrequenciesTab({ history }) {
  if (!history.length) return <EmptyState icon="📊" title="Andmeid pole veel" />;
  return (
    <div className={styles.freqTable}>
      <div className={styles.freqHeader}>
        <span>Sagedus</span>
        <span>Viimane tulemus</span>
        <span>Kordi tehtud</span>
        <span>Viimati</span>
      </div>
      {history.map(f => {
        const last = f.history[0];
        return (
          <div key={f.frequencyId} className={styles.freqRow}>
            <span className={styles.freqName}>{f.frequencyName}</span>
            <ResultPill value={last?.final} />
            <span className={styles.freqCount}>{f.history.length}×</span>
            <span className={styles.freqDate}>{last?.date}</span>
          </div>
        );
      })}
    </div>
  );
}

function NotesTab({ client, onSave }) {
  const [notes, setNotes] = useState(client.notes || '');
  return (
    <Card>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={8}
        style={{ width: '100%', resize: 'vertical' }}
        placeholder="Kliendi ajalugu, tähelepanekud..."
      />
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" onClick={() => onSave({ notes })}>💾 Salvesta märkmed</Button>
      </div>
    </Card>
  );
}

function DataTab({ client, onSave }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...client });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => { onSave(form); setEditing(false); };
  const handleCancel = () => { setForm({ ...client }); setEditing(false); };

  const rows = [
    { label: 'Eesnimi', key: 'firstName', type: 'text' },
    { label: 'Perekonnanimi', key: 'lastName', type: 'text' },
    { label: 'Sünnikuupäev', key: 'dob', type: 'dob' },
    { label: 'Sugu', key: 'gender', type: 'select', opts: ['Naine','Mees','Laps (N)','Laps (M)'] },
    { label: 'Email', key: 'email', type: 'email' },
    { label: 'Telefon', key: 'phone', type: 'tel' },
    { label: 'Filiaali', key: 'branch', type: 'select', opts: ['Tallinn','Tartu','Kuressaare'] },
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
              <Button variant="secondary" size="sm" onClick={handleCancel}>Tühista</Button>
              <Button variant="primary" size="sm" onClick={handleSave}>💾 Salvesta</Button>
            </div>
        }
      </div>
      {rows.map(row => (
        <div key={row.key} className={styles.dataRow}>
          <span className={styles.dataLabel}>{row.label}</span>
          {editing ? (
            row.type === 'select'
              ? <select value={form[row.key]} onChange={e => set(row.key, e.target.value)} style={{ width: 200 }}>
                  {row.opts.map(o => <option key={o}>{o}</option>)}
                </select>
              : row.type === 'dob'
              ? <input
                  value={form[row.key]}
                  onChange={e => set(row.key, formatDob(e.target.value))}
                  maxLength={10}
                  style={{ width: 200 }}
                />
              : <input
                  type={row.type}
                  value={form[row.key] || ''}
                  onChange={e => set(row.key, e.target.value)}
                  style={{ width: 200 }}
                />
          ) : (
            <span className={styles.dataValue}>{form[row.key] || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</span>
          )}
        </div>
      ))}
    </Card>
  );
}
