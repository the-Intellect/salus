import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../api/index.js';
import { Card, Button, Field } from '../../components/UI.jsx';
import styles from './Settings.module.css';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', branch: user?.branch || 'Tallinn' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saved, setSaved] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setPw = (k, v) => setPwForm(f => ({ ...f, [k]: v }));

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const updated = await api.updateProfile(form);
      updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirm) { setPwError('Paroolid ei kattu'); return; }
    if (pwForm.newPassword.length < 8) { setPwError('Parool peab olema vähemalt 8 tähemärki'); return; }
    setLoading(true);
    try {
      await api.changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 3000);
    } catch (err) {
      setPwError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <div className={styles.profileLayout}>
      <Card style={{ maxWidth: 480 }}>
        <div className={styles.cardTitle}>Minu profiil</div>

        <div className={styles.avatarRow}>
          <div className={styles.avatarLarge}>{initials}</div>
          <div>
            <div className={styles.avatarName}>{user?.name}</div>
            <div className={styles.avatarRole}>{user?.role === 'admin' ? 'Administraator' : 'Terapeut'} · {user?.email}</div>
          </div>
        </div>

        <Field label="Täisnimi">
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Mari Mägi" />
        </Field>
        <Field label="Telefon" >
          <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+372 5123 4567" />
        </Field>
        <Field label="Filiaali">
          <select value={form.branch} onChange={e => set('branch', e.target.value)}>
            <option>Tallinn</option>
            <option>Tartu</option>
            <option>Kuressaare</option>
          </select>
        </Field>

        <div className={styles.saveRow}>
          {saved && <span className={styles.savedMsg}>✓ Profiil salvestatud</span>}
          <Button variant="primary" onClick={handleSaveProfile} disabled={loading}>💾 Salvesta profiil</Button>
        </div>
      </Card>

      <Card style={{ maxWidth: 480 }}>
        <div className={styles.cardTitle}>Muuda parooli</div>
        <Field label="Praegune parool">
          <input type="password" value={pwForm.currentPassword} onChange={e => setPw('currentPassword', e.target.value)} placeholder="••••••••" />
        </Field>
        <Field label="Uus parool">
          <input type="password" value={pwForm.newPassword} onChange={e => setPw('newPassword', e.target.value)} placeholder="Vähemalt 8 tähemärki" />
        </Field>
        <Field label="Korda uut parooli">
          <input type="password" value={pwForm.confirm} onChange={e => setPw('confirm', e.target.value)} placeholder="••••••••" />
        </Field>
        {pwError && <div className={styles.errorMsg}>{pwError}</div>}
        <div className={styles.saveRow}>
          {pwSaved && <span className={styles.savedMsg}>✓ Parool muudetud</span>}
          <Button variant="primary" onClick={handleChangePassword} disabled={loading}>🔒 Muuda parool</Button>
        </div>
      </Card>
    </div>
  );
}
