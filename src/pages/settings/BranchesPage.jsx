import { useState, useEffect } from 'react';
import { api } from '../../api/index.js';
import { Card, Button, Field } from '../../components/UI.jsx';

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', city: '', address: '' });
  const [addForm, setAddForm] = useState({ name: '', city: '', address: '' });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => api.getBranches().then(setBranches);
  useEffect(() => { load(); }, []);

  const handleEdit = (b) => {
    setEditId(b.id);
    setEditForm({ name: b.name, city: b.city || '', address: b.address || '' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateBranch(editId, editForm);
      setEditId(null);
      load();
    } catch(err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleAdd = async () => {
    if (!addForm.name.trim()) return;
    setSaving(true);
    try {
      await api.addBranch(addForm);
      setAdding(false);
      setAddForm({ name: '', city: '', address: '' });
      load();
    } catch(err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Kustuta filiaal "${name}"? See peidab filiaali süsteemist.`)) return;
    await api.deleteBranch(id);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Filiaalid ({branches.length})</div>
        <Button variant="primary" size="sm" onClick={() => setAdding(true)}>+ Lisa filiaal</Button>
      </div>

      {adding && (
        <Card style={{ marginBottom: 12, borderColor: 'var(--color-accent)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Uus filiaal</div>
          <Field label="Nimi *">
            <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="nt Pärnu" autoFocus />
          </Field>
          <Field label="Linn">
            <input value={addForm.city} onChange={e => setAddForm(f => ({ ...f, city: e.target.value }))} placeholder="nt Pärnu" />
          </Field>
          <Field label="Aadress">
            <input value={addForm.address} onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))} placeholder="nt Rüütli 1" />
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="ghost" onClick={() => setAdding(false)}>Tühista</Button>
            <Button variant="primary" onClick={handleAdd} disabled={saving || !addForm.name.trim()}>💾 Lisa</Button>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {branches.map(b => (
          <Card key={b.id}>
            {editId === b.id ? (
              <div>
                <Field label="Nimi *">
                  <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                </Field>
                <Field label="Linn">
                  <input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} />
                </Field>
                <Field label="Aadress">
                  <input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
                </Field>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <Button variant="ghost" onClick={() => setEditId(null)}>Tühista</Button>
                  <Button variant="primary" onClick={handleSave} disabled={saving}>💾 Salvesta</Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{b.name}</div>
                  {(b.city || b.address) && (
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      {[b.city, b.address].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button variant="secondary" size="sm" onClick={() => handleEdit(b)}>✏️</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(b.id, b.name)}>🗑️</Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
