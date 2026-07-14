import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore.js';
import { useLanguage } from '../../context/useLanguage.js';
import { api } from '../../api/index.js';
import { Button, Card, ResultPill, PageHeader, EmptyState } from '../UI.jsx';
import styles from './Session.module.css';

export default function SessionPage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const isEt = language === 'et';
  const {
    activeSession, activeClientId, editingSessionId,
    addEntry, removeEntry, updateEntry, clearSession, setDuration,
    entryDrafts, setEntryDraft, clearEntryDraft, setStartTime,
    queuedIds, addToQueue, removeFromQueue,
  } = useAppStore();

  const [frequencies, setFrequencies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('');
  const [openFreqId, setOpenFreqId] = useState(null);
  const [pendingCollapsed, setPendingCollapsed] = useState(false);

  // Auto-collapse pooleli kaart väiksel ekraanil
  useEffect(() => {
    const checkWidth = () => setPendingCollapsed(window.innerWidth < 1400);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);
  const [clientInfo, setClientInfo] = useState(null);
  const [clientExpanded, setClientExpanded] = useState(null); // 'reason' | 'notes' | null
  const [clientNoteText, setClientNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteEditingIdx, setNoteEditingIdx] = useState(null);
  const [noteEditText, setNoteEditText] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [aiSaveModal, setAiSaveModal] = useState(false);
  const freqListRef = useRef(null);
  const [editingRec, setEditingRec] = useState('');
  const [recModal, setRecModal] = useState(false);
  const [recNote, setRecNote] = useState('');
  const [recText, setRecText] = useState('');
  const [recLoading, setRecLoading] = useState(false);
  const [recConfirmed, setRecConfirmed] = useState(false);
  const [aiEditText, setAiEditText] = useState('');

  // Scroll sageduste nimekiri üles kui otsing muutub
  useEffect(() => {
    if (freqListRef.current) freqListRef.current.scrollTop = 0;
  }, [search, cat]);

  useEffect(() => {
    if (editingSessionId && activeSession?.clientRecommendation) {
      setEditingRec(activeSession.clientRecommendation);
    }
  }, [editingSessionId]);

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
      <PageHeader title={t('nav_session')} />
      <EmptyState icon="⚡" title={t('session_empty_title')} description={t('session_empty_desc')} />
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Button variant="primary" onClick={() => navigate('/clients')}>{t('session_go_clients')}</Button>
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
    // Kui on olemasolev salvestatud kirje aga pole draft'i, lae see draft'iks
    if (!entryDrafts[id]) {
      const existing = activeSession.entries.find(e => e.frequencyId === id);
      if (existing) {
        const mins = [...existing.minutes.map(String), ...Array(7).fill('')].slice(0, 7);
        setEntryDraft(id, { initial: String(existing.initial), minutes: mins });
      }
      // Uue sageduse puhul EI loo tühja draft'i — see luuakse alles kirjutades
    }
  };

  const closeFreq = () => setOpenFreqId(null);

  const getOrInitDraft = (id) =>
    entryDrafts[id] || { initial: '', minutes: ['','','','','','',''] };

  const setInitial = (id, val) => {
    setEntryDraft(id, { ...getOrInitDraft(id), initial: val });
  };

  const setMinute = (id, mi, val) => {
    const draft = getOrInitDraft(id);
    const mins = [...(draft.minutes || ['','','','','','',''])];
    mins[mi] = val;
    setEntryDraft(id, { ...draft, minutes: mins });
  };

  // Draft on "pooleli" kui on väärtusi sisestatud aga pole salvestatud
  const hasDraft = (id) => {
    const ef = entryDrafts[id];
    if (!ef) return false;
    const initial = ef?.initial?.trim();
    const hasMinutes = ef?.minutes?.some(m => m !== '');
    // Pooleli kui on initial VÕI minutite väärtused
    const hasValues = (initial && initial !== '') || hasMinutes;
    if (!hasValues) return false;
    const isSaved = activeSession.entries.some(e => e.frequencyId === id);
    if (isSaved) {
      const existing = activeSession.entries.find(e => e.frequencyId === id);
      return String(existing.initial) !== (initial || '');
    }
    return true;
  };

  const saveEntry = (freq) => {
    const ef = entryDrafts[freq.id];
    if (!ef?.initial && !isSpecialId(freq.id)) { alert('Lisa vähemalt esialgne tulemus.'); return; }
    const filledMins = ef.minutes.filter(m => m !== '').map(Number);
    const initialVal = ef?.initial?.trim() ? Number(ef.initial) : null;
    const final = filledMins.length ? filledMins[filledMins.length - 1] : initialVal;
    const entry = {
      frequencyId: freq.id,
      frequencyName: freq.freq_name,
      frequencyDescription: freq.description,
      frequencyDescriptionEn: freq.description_en || '',
      initial: initialVal,
      minutes: filledMins,
      final,
    };
    const existing = activeSession.entries.find(e => e.frequencyId === freq.id);
    if (existing) updateEntry(freq.id, entry); else addEntry(entry);
    removeFromQueue(freq.id);
    closeFreq();
  };

  const saveClientNote = async () => {
    if (!activeClientId || !clientNoteText.trim()) return;
    try {
      const notes = await api.addNote(activeClientId, clientNoteText);
      setClientInfo(ci => ({ ...ci, notes: clientNoteText, notes_history: notes }));
      setClientNoteText(''); // tühjenda kast
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 3000);
    } catch(err) { alert(err.message); }
  };

  const deleteClientNote = async (noteId) => {
    if (!window.confirm('Kustuta märkus?')) return;
    try {
      const notes = await api.deleteNote(activeClientId, noteId);
      setClientInfo(ci => ({ ...ci, notes_history: notes }));
    } catch(err) { alert(err.message); }
  };

  const editClientNote = async (noteId, text) => {
    try {
      const notes = await api.editNote(activeClientId, noteId, text);
      setClientInfo(ci => ({ ...ci, notes_history: notes }));
      setNoteEditingIdx(null);
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

  const finishSession = async (clientRecommendation = null) => {
    // If null passed: use editingRec (for edits) or existing recommendation
    const recToSave = clientRecommendation !== null ? clientRecommendation
      : editingSessionId ? (editingRec || null)
      : (activeSession.clientRecommendation || null);
    try {
      if (editingSessionId) {
        await api.updateSession(editingSessionId, { entries: activeSession.entries, notes: activeSession.notes, duration: activeSession.duration, clientRecommendation: recToSave, startTime: activeSession.startTime });
      } else {
        await api.createSession({ clientId: activeClientId, entries: activeSession.entries, notes: activeSession.notes, duration: activeSession.duration, clientRecommendation: recToSave, startTime: activeSession.startTime });
      }
      clearSession();
      navigate(`/clients/${activeClientId}`);
    } catch (err) { alert(err.message); }
  };

  const handleFinishClick = () => {
    if (editingSessionId) {
      // Muutmisel — salvesta otse, ära küsi AI soovitust uuesti
      finishSession(null);
      return;
    }
    setRecNote('');
    setRecText('');
    setRecConfirmed(false);
    setRecModal(true);
  };

  const generateRecommendation = async () => {
    setRecLoading(true);
    try {
      const { recommendation } = await api.getClientRecommendation(
        activeClientId, activeSession.entries, recNote, language
      );
      setRecText(recommendation);
    } catch (err) {
      setRecText('Viga: ' + err.message);
    } finally {
      setRecLoading(false);
    }
  };

  const handleCancel = () => {
    if (activeSession.entries.length > 0 || Object.keys(entryDrafts).length > 0) {
      if (!window.confirm('Seanss on pooleli. Oled kindel, et soovid katkestada? Kõik sisestatud andmed kaovad.')) return;
    }
    clearSession();
    navigate(`/clients/${activeClientId}`);
  };

  const savedIds = new Set(activeSession.entries.map(e => e.frequencyId));

  // Erilised ID-d kus esialgne tulemus on valikuline
  const SPECIAL_ID_PREFIXES = ['Biofeedback Gems', 'Sarcode', 'Timed specific', 'Wellness'];
  const isSpecialId = (id) => SPECIAL_ID_PREFIXES.some(p => id?.toLowerCase().startsWith(p.toLowerCase()));

  return (
    <div>
      <PageHeader
        title={editingSessionId ? t('session_edit') : t('session_new')}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={handleCancel}>{t('session_abort')}</Button>
            <Button variant="primary" onClick={handleFinishClick} disabled={activeSession.entries.length === 0}>
              ✓ {editingSessionId ? t('session_save_changes') : t('session_finish')} ({activeSession.entries.length})
            </Button>
          </div>
        }
      />

      <div className={styles.layout}>
        {/* VASAK */}
        <div className={styles.half}>
          <Card>
            <div className={styles.searchRow}>
              <input type="text" placeholder={t('session_search_freq')} value={search} onChange={e => setSearch(e.target.value)} />
              <select value={cat} onChange={e => setCat(e.target.value)}>
                <option value="">{t('session_all_categories')}</option>
                {categories.map(c => (
                  <option key={c.id} value={String(c.id)}>
                    {c.label_en}{c.label_et ? ` / ${c.label_et}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.freqCount}>
              {loading ? t('loading') : `${filtered.length} ${t('frequencies_count')}`}
            </div>
            <div className={styles.freqList} ref={freqListRef}>
              {filtered.map(freq => {
                const isSaved = savedIds.has(freq.id);
                const isOpen = openFreqId === freq.id;
                const isDraft = !isOpen && hasDraft(freq.id);
                const ef = entryDrafts[freq.id] || { initial: '', minutes: Array(7).fill('') };

                return (
                  <div
                    key={freq.id}
                    className={`${styles.freqItem} ${isSaved ? styles.freqSaved : ''} ${isOpen ? styles.freqOpen : ''} ${isDraft ? styles.freqUnsaved : ''}`}
                  >
                    <div className={styles.freqHeader} onClick={() => isOpen ? closeFreq() : openFreq(freq.id)}>
                      <div style={{ flex: 1 }}>
                        <span className={styles.freqName}>#{freq.id}</span>
                        <span className={styles.freqName}> {freq.freq_name}</span>
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
                        {!isSaved && !isDraft && !isOpen && !queuedIds.includes(freq.id) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); addToQueue(freq.id); }}
                            title={isEt ? 'Lisa järjekorda' : 'Add to queue'}
                            style={{
                              background: 'var(--color-accent-light)', color: 'var(--color-accent)',
                              border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                              width: 24, height: 24, fontSize: 16, fontWeight: 600, lineHeight: 1,
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                          >+</button>
                        )}
                        {queuedIds.includes(freq.id) && !isSaved && !isDraft && (
                          <span style={{ fontSize: 10, color: 'var(--color-accent)', fontWeight: 600 }}>
                            {isEt ? '● Järjekorras' : '● Queued'}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    <div className={styles.freqDesc} onClick={() => isOpen ? closeFreq() : openFreq(freq.id)} style={{ cursor: 'pointer' }}>
                      {language === 'en' && freq.description_en ? freq.description_en : freq.description}
                    </div>

                    {isOpen && (
                      <div className={styles.entryForm} onClick={e => e.stopPropagation()}>
                        <div className={styles.entryRow}>
                          <label className={styles.entryLabel}>
                            {t('session_initial')}{isSpecialId(freq.id) && <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> ({t('optional')})</span>}
                          </label>
                          <input
                            type="number" min="0" max="100"
                            value={ef.initial}
                            onChange={e => setInitial(freq.id, e.target.value)}
                            placeholder={isSpecialId(freq.id) ? '—' : '0–100'}
                            className={styles.numInput}
                            autoFocus
                          />
                          {ef.initial && <ResultPill value={ef.initial} />}
                        </div>
                        <div className={styles.minuteRow}>
                          <label className={styles.entryLabel}>{t('session_results')}:</label>
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
                          }}>{t('cancel')}</Button>
                          <Button variant="primary" size="sm" onClick={() => saveEntry(freq)}>
                            {savedIds.has(freq.id) ? t('update') : t('save')}
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
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, color: 'var(--color-text-primary)' }}>
                👤 {clientInfo.first_name} {clientInfo.last_name}
              </div>

              {/* Pöördumise põhjus */}
              <div
                style={{ fontSize: 14, color: 'var(--color-accent)', cursor: 'pointer', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => setClientExpanded(clientExpanded === 'reason' ? null : 'reason')}
              >
                {clientExpanded === 'reason' ? '▲' : '▼'} {t('data_reason')}
              </div>
              {clientExpanded === 'reason' && (
                <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, padding: '6px 10px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', marginBottom: 6 }}>
                  {clientInfo.reason || '—'}
                </div>
              )}

              {/* Märkmed */}
              <div
                style={{ fontSize: 14, color: 'var(--color-accent)', cursor: 'pointer', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => setClientExpanded(clientExpanded === 'notes' ? null : 'notes')}
              >
                {clientExpanded === 'notes' ? '▲' : '▼'} {t('tab_notes')}
              </div>
              {clientExpanded === 'notes' && (
                <div style={{ marginBottom: 4 }}>
                  {/* Eelnevad märkmed */}
                  {(clientInfo.notes_history || []).length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      {(clientInfo.notes_history || []).map((n, i) => (
                        <div key={i} style={{ borderLeft: '3px solid var(--color-border)', paddingLeft: 8, marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                              {new Date(n.saved_at).toLocaleDateString('et-EE')} {new Date(n.saved_at).toLocaleTimeString('et-EE', {hour:'2-digit',minute:'2-digit'})}
                            </span>
                            <div style={{ display: 'flex', gap: 3 }}>
                              <button onClick={() => { setNoteEditingIdx(n.id); setNoteEditText(n.text); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.6 }}>✏️</button>
                              <button onClick={() => deleteClientNote(n.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.6 }}>🗑️</button>
                            </div>
                          </div>
                          {noteEditingIdx === n.id ? (
                            <div>
                              <textarea value={noteEditText} onChange={e => setNoteEditText(e.target.value)}
                                rows={2} style={{ width: '100%', fontSize: 11, resize: 'vertical', marginTop: 4 }} />
                              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                <button onClick={() => setNoteEditingIdx(null)} style={{ fontSize: 11, cursor: 'pointer', background: 'none', border: '1px solid var(--color-border)', borderRadius: 4, padding: '2px 6px' }}>{t('cancel')}</button>
                                <button onClick={() => editClientNote(n.id, noteEditText)} style={{ fontSize: 11, cursor: 'pointer', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 6px' }}>{t('save')}</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 2 }}>{n.text}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Uus märkus */}
                  <textarea
                    value={clientNoteText}
                    onChange={e => setClientNoteText(e.target.value)}
                    rows={3}
                    style={{ width: '100%', fontSize: 12, resize: 'vertical', marginBottom: 6 }}
                    placeholder={t('notes_placeholder')}
                  />
                  <Button
                    variant={noteSaved ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={saveClientNote}
                    disabled={!clientNoteText.trim()}
                    style={{ width: '100%', justifyContent: 'center', background: noteSaved ? 'var(--color-ok)' : undefined, color: noteSaved ? '#fff' : undefined }}>
                    {noteSaved ? '✓ ' + t('saved') : t('notes_save_btn')}
                  </Button>
                </div>
              )}
            </Card>
          )}

          <Card style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                  {isEt ? 'Algusaeg' : 'Start time'}
                </span>
                <input
                  type="text"
                  value={activeSession.startTime || ''}
                  onChange={e => {
                    let v = e.target.value.replace(/[^0-9:]/g, '');
                    if (v.length === 2 && !v.includes(':') && (activeSession.startTime || '').length < v.length) {
                      v = v + ':';
                    }
                    if (v.length <= 5) setStartTime(v);
                  }}
                  onBlur={e => {
                    const m = e.target.value.match(/^(\d{1,2}):?(\d{0,2})$/);
                    if (m) {
                      const hh = Math.min(23, parseInt(m[1] || 0));
                      const mm = Math.min(59, parseInt(m[2] || 0));
                      setStartTime(`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`);
                    }
                  }}
                  placeholder="17:45"
                  maxLength={5}
                  style={{ width: 70, fontSize: 14, fontFamily: 'var(--font-mono)', textAlign: 'center' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                  {t('session_length')}
                </span>
                <select value={activeSession.duration || 60} onChange={e => setDuration(Number(e.target.value))} style={{ fontSize: 14 }}>
                  <option value={60}>60 {t('session_minutes')}</option>
                  <option value={75}>75 {t('session_minutes')}</option>
                  <option value={90}>90 {t('session_minutes')}</option>
                </select>
              </div>
            </div>
          </Card>

          {/* JÄRJEKORD — märgitud sagedused ilma numbriteta */}
          {queuedIds.filter(id => !savedIds.has(id) && !entryDrafts[id]).length > 0 && (
            <Card style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: 'var(--color-accent)' }}>
                ● {isEt ? 'Järjekorras' : 'Queued'} ({queuedIds.filter(id => !savedIds.has(id) && !entryDrafts[id]).length})
              </div>
              {queuedIds.filter(id => !savedIds.has(id) && !entryDrafts[id]).map(freqId => {
                const freq = frequencies.find(f => String(f.id) === String(freqId));
                if (!freq) return null;
                return (
                  <div key={freqId} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: '1px solid var(--color-border)', gap: 8
                  }}>
                    <div
                      onClick={() => {
                        setEntryDraft(freqId, { initial: '', minutes: ['','','','','','',''] });
                        setPendingCollapsed(false);
                      }}
                      style={{ flex: 1, cursor: 'pointer' }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 600 }}>#{freq.id} {freq.freq_name}</span>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                        {language === 'en' && freq.description_en ? freq.description_en : freq.description}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <Button variant="secondary" size="sm" onClick={() => {
                        // Loo tühi draft otse - ei sõltu vasakpoolsest otsingust/filtrist
                        setEntryDraft(freqId, { initial: '', minutes: ['','','','','','',''] });
                        setPendingCollapsed(false);
                      }}>
                        {isEt ? 'Alusta' : 'Start'}
                      </Button>
                      <button className={styles.iconBtn} title={isEt ? 'Eemalda' : 'Remove'}
                        onClick={() => removeFromQueue(freqId)}>✕</button>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}

          {/* POOLELI olevad sagedused — kokkuvolditav + hõljub scrollides */}
          {Object.keys(entryDrafts).length > 0 && (
            <Card style={{ marginBottom: 10, position: 'sticky', top: 12, zIndex: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
              <div
                style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-warn)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={() => setPendingCollapsed(c => !c)}
              >
                <span>● {isEt ? 'Pooleli' : 'In progress'} ({Object.keys(entryDrafts).length})</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{pendingCollapsed ? '▼' : '▲'}</span>
              </div>
              {!pendingCollapsed && (
                <div style={{ marginTop: 10, maxHeight: 'min(60vh, 520px)', overflowY: 'auto', paddingRight: 4 }}>
                  {Object.entries(entryDrafts).map(([freqId, draft]) => {
                    const freq = frequencies.find(f => String(f.id) === String(freqId));
                    if (!freq) return null;
                    const isSaved = savedIds.has(freqId);
                    const ef = draft;
                    return (
                      <div key={freqId} style={{
                        borderLeft: '3px solid var(--color-warn)',
                        paddingLeft: 10, marginBottom: 10,
                        paddingBottom: 10, borderBottom: '1px solid var(--color-border)'
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-primary)' }}>
                          #{freq.id} {freq.freq_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 90 }}>
                            {t('session_initial')}:
                          </span>
                          <input
                            type="number" min="0" max="100"
                            value={ef.initial || ''}
                            onChange={e => setInitial(freqId, e.target.value)}
                            placeholder="—"
                            style={{ width: 56, fontFamily: 'var(--font-mono)', textAlign: 'center', fontSize: 13, padding: '8px 4px', MozAppearance: 'textfield' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                          {(ef.minutes || Array(7).fill('')).map((m, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{i + 1}min</span>
                              <input
                                type="number" min="0" max="100"
                                value={m}
                                onChange={e => setMinute(freqId, i, e.target.value)}
                                placeholder="—"
                                style={{ width: 40, fontFamily: 'var(--font-mono)', textAlign: 'center', fontSize: 12, padding: '8px 4px', MozAppearance: 'textfield' }}
                              />
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <Button variant="ghost" size="sm" onClick={() => clearEntryDraft(freqId)}>
                            {t('cancel')}
                          </Button>
                          <Button variant="primary" size="sm" onClick={() => saveEntry(freq)}>
                            {isSaved ? t('update') : t('save')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          <Card style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: 'var(--color-text-primary)' }}>{t('session_ai_title')}</div>

            {/* Muutmisvaates: näita olemasolevat kliendi soovitust */}
            {editingSessionId && activeSession.clientRecommendation ? (
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                  {isEt ? 'Kliendi soovitus (genereeritud seansil)' : 'Client recommendation (generated during session)'}
                </div>
                <textarea
                  value={editingRec}
                  onChange={e => setEditingRec(e.target.value)}
                  rows={5}
                  style={{ width: '100%', fontSize: 13, resize: 'vertical', lineHeight: 1.7 }}
                />
              </div>
            ) : (
              <>
                <textarea value={aiContext} onChange={e => setAiContext(e.target.value)}
                  placeholder={t('session_ai_placeholder')}
                  rows={2} style={{ width: '100%', fontSize: 14, resize: 'none', marginBottom: 8 }} />
                <Button variant="secondary" size="sm" onClick={fetchAiSuggestion}
                  disabled={aiLoading || activeSession.entries.length === 0}
                  style={{ width: '100%', justifyContent: 'center' }}>
                  {aiLoading ? '⏳ ' + t('ai_analyzing_short') : t('session_ai_ask')}
                </Button>
                {aiSuggestion && (
                  <div>
                    <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, background: 'var(--color-accent-light)', color: 'var(--color-accent)', padding: '10px 12px', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap' }}>
                      {aiSuggestion}
                    </div>
                    <Button variant="secondary" size="sm"
                      onClick={() => { setAiEditText(aiSuggestion); setAiSaveModal(true); }}
                      style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
                      {t('ai_save')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>

          <Card>
            <div className={styles.savedTitle}>
              {t('saved_this_session')}
              {activeSession.entries.length > 0 && (() => {
                const twoPlus = activeSession.entries.filter(e => (e.minutes || []).length >= 2).length;
                const total = activeSession.entries.length;
                return (
                  <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 400 }}>
                    ({twoPlus}/{total})
                  </span>
                );
              })()}
              {Object.keys(entryDrafts).length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--color-warn)', fontWeight: 600 }}>
                  ({Object.keys(entryDrafts).length} {t('session_in_progress')})
                </span>
              )}
            </div>
            {activeSession.entries.length === 0
              ? <p className={styles.emptyNote}>{t('no_frequencies_yet')}</p>
              : activeSession.entries.map(e => (
                <div key={e.frequencyId} className={styles.savedEntry}>
                  <div className={styles.savedTop}>
                    <div>
                      <div className={styles.savedName}>{e.frequencyName}</div>
                      {(language === 'en' && e.frequencyDescriptionEn ? e.frequencyDescriptionEn : e.frequencyDescription) && (
                        <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                          {language === 'en' && e.frequencyDescriptionEn ? e.frequencyDescriptionEn : e.frequencyDescription}
                        </div>
                      )}
                    </div>
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
              <Button variant="primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleFinishClick} disabled={activeSession.entries.length === 0}>
                ✓ {editingSessionId ? t('session_save_changes') : t('session_finish')}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Seansi lõpetamise modaal - AI soovitus kliendile */}
      {recModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', width: '90%', maxWidth: 540, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, color: 'var(--color-text-primary)' }}>
              {t('rec_modal_title')}
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
              {t('rec_modal_desc')}
            </div>

            {!recText ? (
              <>
                <textarea
                  value={recNote}
                  onChange={e => setRecNote(e.target.value)}
                  placeholder={t('rec_note_placeholder')}
                  rows={3}
                  style={{ width: '100%', fontSize: 14, resize: 'vertical', marginBottom: 12 }}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Button variant="ghost" onClick={() => { setRecModal(false); finishSession(null); }}>
                    {t('rec_skip')}
                  </Button>
                  <Button variant="secondary" onClick={generateRecommendation} disabled={recLoading}>
                    {recLoading ? '⏳ ' + t('ai_analyzing_short') : '✨ ' + t('rec_generate')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <textarea
                  value={recText}
                  onChange={e => setRecText(e.target.value)}
                  rows={6}
                  style={{ width: '100%', fontSize: 14, resize: 'vertical', marginBottom: 12, lineHeight: 1.7 }}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Button variant="ghost" onClick={() => { setRecModal(false); finishSession(null); }}>
                    {t('rec_skip')}
                  </Button>
                  <Button variant="secondary" onClick={generateRecommendation} disabled={recLoading}>
                    {recLoading ? '⏳' : '↺'} {t('rec_regenerate')}
                  </Button>
                  <Button variant="primary" onClick={() => { setRecModal(false); finishSession(recText); }}>
                    ✓ {t('rec_confirm')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* AI salvestamise modaal */}
      {aiSaveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setAiSaveModal(false)}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', width: '90%', maxWidth: 500 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Redigeeri ja salvesta soovitus</div>
            <textarea value={aiEditText} onChange={e => setAiEditText(e.target.value)} rows={10}
              style={{ width: '100%', fontSize: 14, resize: 'vertical', marginBottom: 12 }} />
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
