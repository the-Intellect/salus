import { useState, useEffect } from 'react';
import { api } from '../../api/index.js';
import { Card, Button, Avatar, Field } from '../../components/UI.jsx';
import styles from './Settings.module.css';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | {user}

  const load = () => api.getUsers().then(setUsers).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleDelete = async (user) => {
    if (!window.confirm(`Kustuta kasutaja ${user.name}? See toiming on pöördumatu.`)) return;
    await api.deleteUser(user.id);
    load();
  };

  return (
    <div>
      <div className={styles.usersHeader}>
        <div className={styles.cardTitle}>Kasutajad ({users.length})</div>
        <Button variant="primary" onClick={() => setModal('new')}>+ Lisa kasutaja</Button>
      </div>

      {loading ? <p style={{ color: 'var(--color-text-muted)' }}>Laadimine...</p> : (
        <div className={styles.userList}>
          {users.map(u => (
            <Card key={u.id} className={styles.userCard}>
              <div className={styles.userRow}>
                <Avatar name={u.name} size={40} />
                <div className={styles.userInfo}>
                  <div className={styles.userName}>{u.name}</div>
                  <div className={styles.userMeta}>{u.email} · {u.branch}</div>
                  <div className={styles.userMeta}>
                    <span className={u.role === 'admin' ? styles.roleAdmin : styles.roleTherapist}>
                      {u.role === 'admin' ? 'Admin' : 'Terapeut'}
                    </span>
                    {u.last_login && <span> · Viimati sisse loginud: {new Date(u.last_login).toLocaleDateString('et-EE')}</span>}
                    {!u.last_login && <span className={styles.neverLogin}> · Pole veel loginud</span>}
                  </div>
                </div>
                <div className={styles.userActions}>
                  <Button variant="secondary" size="sm" onClick={() => setModal(u)}>✏️ Muuda</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(u)}>🗑️</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modal && (
        <UserModal
          user={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSave }) {
  const isNew = !user;
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'therapist',
    branch: user?.branch || 'Tallinn',
    phone: user?.phone || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) { setError('Nimi ja email on kohustuslikud'); return; }
    setLoading(true);
    setError('');
    try {
      if (isNew) {
        await api.createUser(form);
        setEmailSent(true);
        setTimeout(() => { onSave(); }, 2500);
      } else {
        await api.updateUser(user.id, form);
        onSave();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.cardTitle}>{isNew ? 'Lisa uus kasutaja' : `Muuda — ${user.name}`}</div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {emailSent ? (
          <div className={styles.emailSent}>
            <div style={{ fontSize: 36 }}>✉️</div>
            <p>Sisselogimise link saadetud aadressile <strong>{form.email}</strong></p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Link kehtib 7 päeva.</p>
          </div>
        ) : (
          <div className={styles.modalBody}>
            <Field label="Täisnimi *">
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Mari Mägi" autoFocus />
            </Field>
            <Field label="Email *">
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="mari@salus.ee" disabled={!isNew} />
              {!isNew && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Emaili ei saa muuta</span>}
            </Field>
            <div className={styles.grid2}>
              <Field label="Roll">
                <select value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="therapist">Terapeut</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
              <Field label="Filiaali">
                <select value={form.branch} onChange={e => set('branch', e.target.value)}>
                  <option>Tallinn</option>
                  <option>Tartu</option>
                  <option>Kuressaare</option>
                </select>
              </Field>
            </div>
            <Field label="Telefon">
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+372 5123 4567" />
            </Field>
            {error && <div className={styles.errorMsg}>{error}</div>}
            {isNew && (
              <div className={styles.infoBox}>
                📧 Uuele kasutajale saadetakse email sisselogimise lingiga, millega ta saab ise parooli luua.
              </div>
            )}
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={onClose}>Tühista</Button>
              <Button variant="primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Salvestamine...' : isNew ? '✓ Lisa ja saada email' : '💾 Salvesta'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
