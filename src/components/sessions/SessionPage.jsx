import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore.js';
import { api } from '../../api/index.js';
import { Button, Card, ResultPill, PageHeader, EmptyState } from '../UI.jsx';
import styles from './Session.module.css';

export default function SessionPage() {
  const navigate = useNavigate();
  const {
    activeSession, activeClientId, editingSessionId,
    addEntry, removeEntry, updateEntry, clearSession, setDuration,
    entryDrafts, setEntryDraft, clearEntryDraft,
  } = useAppStore();

  const [frequencies, setFrequencies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('');
  const [openFreqId, setOpenFreqId] = useState(null);
  const [clientInfo, setClientInfo] = useState(null);
  const [clientExpanded, setClientExpanded] = useState(null); // 'reason' | 'notes' | null
  const [clientNoteText, setClientNoteText] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [aiSaveModal, setAiSaveModal] = useState(false);
  const [aiEditText, setAiEditText] = useState('');

  useEffect(() => {
    Promise.all([
      api.getFrequencies(),
      api.getCategories(),
      activeClientId ? api.getClient(activeClientId) : Promise.resolve(null),
    ]).then(([freqs, cats, client]) => {
      setFrequencies(freqs);
      setCategories(cats);
      if (client) {
        setClientInfo(client);
        setClientNoteText(client.notes || '');
      }
    }).catch(err => console.error('Laadimine ebaõnnestus:', err))
      .finally(() => setLoading(false));
  }, [activeClientId]);

  if (!activeSession) return (
    <div>
      <PageHeader title="Aktiivne seanss" />
      <EmptyState icon="⚡" title="Ühtegi seanssi pole alustatud" description="Vali klient ja alusta seanssi kliendi profiilist." />
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Button variant="primary" onClick={() => navigate('/clients')}>Mine klientide juurde</Button>
      </div>
    </div>
  );

  const filtered = frequencies.filter(f => {
    const matchCat = !cat || f.categories?.some(c => String(c.id) === cat);
    const matchSearch = !search ||
      f.freq_name.toLowerCase().includes(search.toLowerCase()) ||
      f.description?.toLowerCase().includes(search.toLowerCase()) ||
      f.categories?.some(c =>
        c.label_en.toLowerCase().includes(search.toLowerCase()) ||
        c.label_et?.toLowerCase().includes(search.toLowerCase())
      );
    return matchCat && matchSearch;
  });

  const openFreq = (id) => {
    setOpenFreqId(id);
    // Kui pole draft'i, algväärtusta
    if (!entryDrafts[id]) {
      const existing = activeSession.entries.find(e => e.frequencyId === id);
      if (existing) {
        const mins = [...existing.minutes.map(String), ...Array(7).fill('')].slice(0, 7);
        setEntryDraft(id, { initial: String(existing.initial), minutes: mins });
      } else {
        setEntryDraft(id, { initial: '', minutes: ['','','','','','',''] });
      }
    }
  };

  const closeFreq = () => setOpenFreqId(null);

  const setInitial = (id, val) => {
    const draft = entryDrafts[id] || { initial: '', minutes: ['','','','','','',''] };
    setEntryDraft(id, { ...draft, initial: val });
  };

  const setMinute = (id, mi, val) => {
    const draft = entryDrafts[id] || { initial: '', minutes: ['','','','','','',''] };
    const mins = [...(draft.minutes || ['','','','','','',''])];
    mins[mi] = val;
    setEntryDraft(id, { ...draft, minutes: mins });
  };

  // Draft on "pooleli" ainult kui on mittетühi number sisestatud ja pole salvestatud
  const hasDraft = (id) => {
    const ef = entryDrafts[id];
    const initial = ef?.initial?.trim();
    if (!initial || initial === '') return false; // tühi = ei loe pooleliks
    const isSaved = activeSession.entries.some(e => e.frequencyId === id);
    if (isSaved) {
      const existing = activeSession.entries.find(e => e.frequencyId === id);
      return String(existing.initial) !== initial;
    }
    return true;
  };

  const saveEntry = (freq) => {
    const ef = entryDrafts[freq.id];
    if (!ef?.initial) { alert('Lisa vähemalt esialgne tulemus.'); return; }
    const filledMins = ef.minutes.filter(m => m !== '').map(Number);
    const final = filledMins.length ? filledMins[filledMins.length - 1] : Number(ef.initial);
    const entry = {
      frequencyId: freq.id,
      frequencyName: freq.freq_name,
      frequencyDescription: freq.description,
      initial: Number(ef.initial),
      minutes: filledMins,
      final,
    };
    const existing = activeSession.entries.find(e => e.frequencyId === freq.id);
    if (existing) updateEntry(freq.id, entry); else addEntry(entry);
    closeFreq();
  };

  const saveClientNote = async () => {
    if (!activeClientId) return;
    try {
      await api.addNote(activeClientId, clientNoteText);
      setClientInfo(ci => ({ ...ci, notes: clientNoteText }));
    } catch(err) { alert(err.message); }
  };

  const fetchAiSuggestion = async () => {
    if (!activeClientId) return;
    setAiLoading(true);
    try {
      const { suggestion } = await api.getAiSuggestion(activeClientId, activeSession.entries, aiContext);
      setAiSuggestion(suggestion);
    } catch (err) {
      setAiSuggestion('AI soovitus ebaõnnestus: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const finishSession = async () => {
    try {
      if (editingSessionId) {
        await api.updateSession(editingSessionId, { entries: activeSession.entries, notes: activeSession.notes, duration: activeSession.duration });
      } else {
        await api.createSession({ clientId: activeClientId, entries: activeSession.entries, notes: activeSession.notes, duration: activeSession.duration });
      }
      clearSession();
      navigate(`/clients/${activeClientId}`);
    } catch (err) { alert(err.message); }
  };

  const handleCancel = () => {
    if (activeSession.entries.length > 0 || Object.keys(entryDrafts).length > 0) {
      if (!window.confirm('Seanss on pooleli. Oled kindel, et soovid katkestada? Kõik sisestatud andmed kaovad.')) return;
    }
    clearSession();
    navigate(`/clients/${activeClientId}`);
  };

  const savedIds = new Set(activeSession.entries.map(e => e.frequencyId));

  return (
    <div>
      <PageHeader
        title={editingSessionId ? 'Muuda seanssi' : 'Uus seanss'}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={handleCancel}>✕ Katkesta</Button>
            <Button variant="primary" onClick={finishSession} disabled={activeSession.entries.length === 0}>
              ✓ {editingSessionId ? 'Salvesta muudatused' : 'Lõpeta seanss'} ({activeSession.entries.length})
            </Button>
          </div>
        }
      />

      <div className={styles.layout}>
        {/* VASAK */}
        <div className={styles.half}>
          <Card>
            <div className={styles.searchRow}>
              <input type="text" placeholder="Otsi sagedust nimega..." value={search} onChange={e => setSearch(e.target.value)} />
              <select value={cat} onChange={e => setCat(e.target.value)}>
                <option value="">Kõik kategooriad</option>
                {categories.map(c => (
                  <option key={c.id} value={String(c.id)}>
                    {c.label_en}{c.label_et ? ` / ${c.label_et}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.freqCount}>
              {loading ? 'Sagedusi laetakse...' : `${filtered.length} sagedust`}
            </div>
            <div className={styles.freqList}>
              {filtered.map(freq => {
                const isSaved = savedIds.has(freq.id);
                const isOpen = openFreqId === freq.id;
                const isDraft = !isOpen && hasDraft(freq.id);
                const ef = entryDrafts[freq.id] || { initial: '', minutes: ['','','','','','',''] };

                return (
                  <div
                    key={freq.id}
                    className={`${styles.freqItem} ${isSaved ? styles.freqSaved : ''} ${isOpen ? styles.freqOpen : ''} ${isDraft ? styles.freqUnsaved : ''}`}
                  >
                    <div className={styles.freqHeader} onClick={() => isOpen ? closeFreq() : openFreq(freq.id)}>
                      <div style={{ flex: 1 }}>
                        <span className={styles.freqName}>{freq.freq_name}</span>
                        <span className={styles.freqId}> #{freq.id}</span>
                        <div className={styles.freqCats}>
                          {freq.categories?.map(c => (
                            <span key={c.id} className={styles.catTag}>
                              {c.label_en}{c.label_et ? ` / ${c.label_et}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {isDraft && <span style={{ fontSize: 10, color: 'var(--color-warn)', fontWeight: 600 }}>● Pooleli</span>}
                        {isSaved && <span className={styles.savedBadge}>✓</span>}
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    <div className={styles.freqDesc} onClick={() => isOpen ? closeFreq() : openFreq(freq.id)} style={{ cursor: 'pointer' }}>
                      {freq.description}
                    </div>

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
                          <Button variant="ghost" size="sm" onClick={() => {
                            clearEntryDraft(freq.id);
                            closeFreq();
                          }}>Tühista</Button>
                          <Button variant="primary" size="sm" onClick={() => saveEntry(freq)}>
                            {savedIds.has(freq.id) ? '💾 Uuenda' : '💾 Salvesta'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* PAREM */}
        <div className={styles.half}>
          {clientInfo && (
            <Card style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--color-text-primary)' }}>
                👤 {clientInfo.first_name} {clientInfo.last_name}
              </div>

              {/* Pöördumise põhjus */}
              <div
                style={{ fontSize: 12, color: 'var(--color-accent)', cursor: 'pointer', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => setClientExpanded(clientExpanded === 'reason' ? null : 'reason')}
              >
                {clientExpanded === 'reason' ? '▲' : '▼'} Pöördumise põhjus
              </div>
              {clientExpanded === 'reason' && (
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, padding: '6px 10px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', marginBottom: 6 }}>
                  {clientInfo.reason || '—'}
                </div>
              )}

              {/* Märkmed */}
              <div
                style={{ fontSize: 12, color: 'var(--color-accent)', cursor: 'pointer', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => setClientExpanded(clientExpanded === 'notes' ? null : 'notes')}
              >
                {clientExpanded === 'notes' ? '▲' : '▼'} Märkmed
              </div>
              {clientExpanded === 'notes' && (
                <div style={{ marginBottom: 4 }}>
                  <textarea
                    value={clientNoteText}
                    onChange={e => setClientNoteText(e.target.value)}
                    rows={4}
                    style={{ width: '100%', fontSize: 12, resize: 'vertical', marginBottom: 6 }}
                    placeholder="Lisa märkmed..."
                  />
                  <Button variant="primary" size="sm" onClick={saveClientNote} style={{ width: '100%', justifyContent: 'center' }}>
                    💾 Salvesta märkmed
                  </Button>
                </div>
              )}
            </Card>
          )}

          <Card style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Seansi pikkus</span>
              <select value={activeSession.duration || 60} onChange={e => setDuration(Number(e.target.value))} style={{ fontSize: 13, width: 120 }}>
                <option value={60}>60 minutit</option>
                <option value={75}>75 minutit</option>
                <option value={90}>90 minutit</option>
              </select>
            </div>
          </Card>

          <Card style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--color-text-primary)' }}>✨ AI soovitus</div>
            <textarea value={aiContext} onChange={e => setAiContext(e.target.value)}
              placeholder="Kirjelda kliendi seisundit... (valikuline)"
              rows={2} style={{ width: '100%', fontSize: 12, resize: 'none', marginBottom: 8 }} />
            <Button variant="secondary" size="sm" onClick={fetchAiSuggestion}
              disabled={aiLoading || activeSession.entries.length === 0}
              style={{ width: '100%', justifyContent: 'center' }}>
              {aiLoading ? '⏳ Analüüsin...' : '🔍 Küsi soovitust'}
            </Button>
            {aiSuggestion && (
              <div>
                <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6, background: 'var(--color-accent-light)', color: 'var(--color-accent)', padding: '10px 12px', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap' }}>
                  {aiSuggestion}
                </div>
                <Button variant="secondary" size="sm"
                  onClick={() => { setAiEditText(aiSuggestion); setAiSaveModal(true); }}
                  style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
                  💾 Salvesta soovitus
                </Button>
              </div>
            )}
          </Card>

          <Card>
            <div className={styles.savedTitle}>
              Salvestatud sel seansil
              {Object.keys(entryDrafts).length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-warn)', fontWeight: 600 }}>
                  ({Object.keys(entryDrafts).length} pooleli)
                </span>
              )}
            </div>
            {activeSession.entries.length === 0
              ? <p className={styles.emptyNote}>Sagedusi pole veel lisatud.</p>
              : activeSession.entries.map(e => (
                <div key={e.frequencyId} className={styles.savedEntry}>
                  <div className={styles.savedTop}>
                    <div className={styles.savedName}>{e.frequencyName}</div>
                    <div className={styles.savedActions}>
                      <button className={styles.iconBtn} title="Muuda" onClick={() => openFreq(e.frequencyId)}>✏️</button>
                      <button className={styles.iconBtn} title="Kustuta" onClick={() => { removeEntry(e.frequencyId); if (openFreqId === e.frequencyId) closeFreq(); }}>🗑️</button>
                    </div>
                  </div>
                  <div className={styles.savedMins}>
                    <ResultPill value={e.initial} />
                    {e.minutes.map((m, mi) => <ResultPill key={mi} value={m} />)}
                  </div>
                </div>
              ))
            }
            <div style={{ marginTop: 16, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
              <Button variant="primary" style={{ width: '100%', justifyContent: 'center' }} onClick={finishSession} disabled={activeSession.entries.length === 0}>
                ✓ {editingSessionId ? 'Salvesta muudatused' : 'Lõpeta seanss'}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* AI salvestamise modaal */}
      {aiSaveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setAiSaveModal(false)}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', width: '90%', maxWidth: 500 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Redigeeri ja salvesta soovitus</div>
            <textarea value={aiEditText} onChange={e => setAiEditText(e.target.value)} rows={10}
              style={{ width: '100%', fontSize: 13, resize: 'vertical', marginBottom: 12 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="secondary" onClick={() => setAiSaveModal(false)}>Tühista</Button>
              <Button variant="primary" onClick={async () => {
                try {
                  await api.saveAiSuggestion(activeClientId, editingSessionId || null, aiEditText);
                  setAiSaveModal(false);
                } catch(err) { alert(err.message); }
              }}>💾 Salvesta</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
