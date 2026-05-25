import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { getClient, updateSession, createSession } from '../../db/database';
import { FREQUENCIES, CATEGORIES } from '../../db/frequencies';
import { Button, Card, ResultPill, PageHeader, EmptyState } from '../UI';
import styles from './Session.module.css';

export default function SessionPage() {
  const navigate = useNavigate();
  const { activeSession, activeClientId, addEntry, clearSession } = useAppStore();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('');
  const [openFreqId, setOpenFreqId] = useState(null);
  const [entryForm, setEntryForm] = useState({});

  const client = activeClientId ? getClient(activeClientId) : null;

  if (!activeSession) {
    return (
      <div>
        <PageHeader title="Aktiivne seanss" />
        <EmptyState
          icon="⚡"
          title="Ühtegi seanssi pole alustatud"
          description="Vali klient ja alusta seanssi kliendi profiilist."
        />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button variant="primary" onClick={() => navigate('/clients')}>Mine klientide juurde</Button>
        </div>
      </div>
    );
  }

  const clientName = client ? `${client.firstName} ${client.lastName}` : '';

  const filtered = FREQUENCIES.filter(f => {
    const matchCat = !cat || f.categories.includes(cat);
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const toggleFreq = (id) => {
    setOpenFreqId(prev => prev === id ? null : id);
    if (!entryForm[id]) setEntryForm(ef => ({ ...ef, [id]: { initial: '', minutes: ['', '', '', '', '', '', ''] } }));
  };

  const setInitial = (id, val) => setEntryForm(ef => ({ ...ef, [id]: { ...ef[id], initial: val } }));
  const setMinute = (id, mi, val) => setEntryForm(ef => {
    const mins = [...(ef[id]?.minutes || ['','','','','','',''])];
    mins[mi] = val;
    return { ...ef, [id]: { ...ef[id], minutes: mins } };
  });

  const saveEntry = (freq) => {
    const ef = entryForm[freq.id];
    if (!ef?.initial) { alert('Lisa vähemalt esialgne tulemus.'); return; }
    const filledMins = ef.minutes.filter(m => m !== '').map(Number);
    const final = filledMins.length ? filledMins[filledMins.length - 1] : Number(ef.initial);
    addEntry({
      frequencyId: freq.id,
      frequencyName: freq.name,
      initial: Number(ef.initial),
      minutes: filledMins,
      final,
    });
    setOpenFreqId(null);
  };

  const finishSession = () => {
    const session = createSession({ ...activeSession });
    updateSession(session.id, { entries: activeSession.entries });
    clearSession();
    navigate(`/clients/${activeClientId}`);
  };

  const savedIds = new Set(activeSession.entries.map(e => e.frequencyId));

  return (
    <div>
      <PageHeader
        title={`Seanss — ${clientName}`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => { clearSession(); navigate(`/clients/${activeClientId}`); }}>✕ Katkesta</Button>
            <Button variant="primary" onClick={finishSession} disabled={activeSession.entries.length === 0}>
              ✓ Lõpeta seanss ({activeSession.entries.length} sagedust)
            </Button>
          </div>
        }
      />

      <div className={styles.layout}>
        <div className={styles.left}>
          <Card>
            <div className={styles.searchRow}>
              <input
                type="text"
                placeholder="Otsi sagedust nimega..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select value={cat} onChange={e => setCat(e.target.value)}>
                <option value="">Kõik kategooriad</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>

            <div className={styles.freqCount}>{filtered.length} sagedust</div>

            <div className={styles.freqList}>
              {filtered.map(freq => {
                const isSaved = savedIds.has(freq.id);
                const isOpen = openFreqId === freq.id;
                const ef = entryForm[freq.id] || { initial: '', minutes: ['','','','','','',''] };
                return (
                  <div
                    key={freq.id}
                    className={`${styles.freqItem} ${isSaved ? styles.freqSaved : ''} ${isOpen ? styles.freqOpen : ''}`}
                    onClick={() => !isOpen && toggleFreq(freq.id)}
                  >
                    <div className={styles.freqTop}>
                      <div>
                        <span className={styles.freqName}>{freq.name}</span>
                        <span className={styles.freqId}> #{freq.id}</span>
                        <div className={styles.freqCats}>
                          {freq.categories.map(c => {
                            const cat = CATEGORIES.find(x => x.id === c);
                            return <span key={c} className={styles.catTag}>{cat?.label || c}</span>;
                          })}
                        </div>
                      </div>
                      {isSaved && <span className={styles.savedBadge}>✓ Salvestatud</span>}
                    </div>
                    <div className={styles.freqDesc}>{freq.description}</div>

                    {isOpen && (
                      <div className={styles.entryForm} onClick={e => e.stopPropagation()}>
                        <div className={styles.entryRow}>
                          <label className={styles.entryLabel}>Esialgne tulemus %</label>
                          <input
                            type="number" min="0" max="100"
                            value={ef.initial}
                            onChange={e => setInitial(freq.id, e.target.value)}
                            placeholder="0–100"
                            className={styles.numInput}
                            autoFocus
                          />
                          {ef.initial && <ResultPill value={ef.initial} />}
                        </div>
                        <div className={styles.minuteRow}>
                          <label className={styles.entryLabel}>Minutite tulemused:</label>
                          <div className={styles.minuteInputs}>
                            {ef.minutes.map((m, i) => (
                              <div key={i} className={styles.minCell}>
                                <span className={styles.minLabel}>{i + 1}min</span>
                                <input
                                  type="number" min="0" max="100"
                                  value={m}
                                  onChange={e => setMinute(freq.id, i, e.target.value)}
                                  placeholder="—"
                                  className={styles.numInputSm}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className={styles.entryActions}>
                          <Button variant="ghost" size="sm" onClick={() => setOpenFreqId(null)}>Tühista</Button>
                          <Button variant="primary" size="sm" onClick={() => saveEntry(freq)}>💾 Salvesta</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className={styles.right}>
          <Card>
            <div className={styles.savedTitle}>Salvestatud sel seansil</div>
            {activeSession.entries.length === 0
              ? <p className={styles.emptyNote}>Sagedusi pole veel lisatud.</p>
              : activeSession.entries.map((e, i) => (
                <div key={i} className={styles.savedEntry}>
                  <div className={styles.savedName}>{e.frequencyName}</div>
                  <div className={styles.savedMins}>
                    <ResultPill value={e.initial} />
                    {e.minutes.map((m, mi) => <ResultPill key={mi} value={m} />)}
                  </div>
                </div>
              ))
            }
          </Card>
        </div>
      </div>
    </div>
  );
}
