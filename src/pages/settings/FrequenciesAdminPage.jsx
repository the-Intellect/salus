import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/useLanguage.js';
import { api } from '../../api/index.js';
import { Card, Button, PageHeader } from '../../components/UI.jsx';
import styles from './Settings.module.css';

export default function FrequenciesAdminPage() {
  const { t } = useLanguage();
  const [frequencies, setFrequencies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('');
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ description: '', description_en: '' });
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    Promise.all([api.getFrequencies(), api.getCategories()])
      .then(([freqs, cats]) => { setFrequencies(freqs); setCategories(cats); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [search, cat]);

  const filtered = frequencies.filter(f => {
    const matchCat = !cat || f.categories?.some(c => String(c.id) === cat);
    const matchSearch = !search ||
      f.freq_name.toLowerCase().includes(search.toLowerCase()) ||
      f.description?.toLowerCase().includes(search.toLowerCase()) ||
      f.id?.toLowerCase?.().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openEdit = (freq) => {
    setEditId(freq.id);
    setEditForm({ description: freq.description || '', description_en: freq.description_en || '' });
  };

  const handleSave = async (freq) => {
    setSaving(true);
    try {
      const updated = await api.updateFrequencyDescription(freq.id, editForm.description, editForm.description_en);
      setFrequencies(prev => prev.map(f => f.id === freq.id ? { ...f, ...updated } : f));
      setSavedId(freq.id);
      setTimeout(() => setSavedId(null), 2000);
      setEditId(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Sageduste haldamine" />
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder="Otsi sagedust..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <select value={cat} onChange={e => setCat(e.target.value)} style={{ width: 220 }}>
            <option value="">Kõik kategooriad</option>
            {categories.map(c => (
              <option key={c.id} value={String(c.id)}>
                {c.label_en}{c.label_et ? ` / ${c.label_et}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8 }}>
          {loading ? 'Laen...' : `${filtered.length} sagedust`}
        </div>
      </Card>

      <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
        {filtered.map(freq => {
          const isEditing = editId === freq.id;
          const isSaved = savedId === freq.id;

          return (
            <Card key={freq.id} style={{ padding: '0.75rem 1rem' }}>
              {/* Päis */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isEditing ? 12 : 0 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>#{freq.id}</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}> {freq.freq_name}</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {freq.categories?.map(c => (
                      <span key={c.id} style={{ fontSize: 11, padding: '1px 7px', background: 'var(--color-accent-light)', color: 'var(--color-accent)', borderRadius: 20 }}>
                        {c.label_en}{c.label_et ? ` / ${c.label_et}` : ''}
                      </span>
                    ))}
                  </div>
                  {!isEditing && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        🇪🇪 {freq.description || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Tõlge puudub</span>}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginTop: 2 }}>
                        🇬🇧 {freq.description_en || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Translation missing</span>}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                  {isSaved
                    ? <span style={{ fontSize: 13, color: 'var(--color-ok)', fontWeight: 600 }}>✓ Salvestatud</span>
                    : !isEditing && (
                      <Button variant="secondary" size="sm" onClick={() => openEdit(freq)}>✏️ Muuda</Button>
                    )
                  }
                </div>
              </div>

              {/* Muutmisvorm */}
              {isEditing && (
                <div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>🇪🇪 Eesti keelne kirjeldus</label>
                    <textarea
                      value={editForm.description}
                      onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                      rows={3}
                      style={{ width: '100%', fontSize: 13, resize: 'vertical', lineHeight: 1.6 }}
                      placeholder="Eesti keelne kirjeldus..."
                      autoFocus
                    />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>🇬🇧 English description</label>
                    <textarea
                      value={editForm.description_en}
                      onChange={e => setEditForm(f => ({ ...f, description_en: e.target.value }))}
                      rows={3}
                      style={{ width: '100%', fontSize: 13, resize: 'vertical', lineHeight: 1.6 }}
                      placeholder="English description..."
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button variant="ghost" size="sm" onClick={() => setEditId(null)}>Tühista</Button>
                    <Button variant="primary" size="sm" onClick={() => handleSave(freq)} disabled={saving}>
                      {saving ? '⏳ Salvestamine...' : '💾 Salvesta'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
