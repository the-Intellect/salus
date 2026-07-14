import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/useLanguage.js';
import { api } from '../../api/index.js';
import { Card, Button, Field } from '../../components/UI.jsx';
import styles from './Settings.module.css';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();
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
    if (pwForm.newPassword !== pwForm.confirm) { setPwError(t('settings_password_mismatch')); return; }
    if (pwForm.newPassword.length < 8) { setPwError(t('settings_password_too_short')); return; }
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
        <div className={styles.cardTitle}>{t('settings_my_profile')}</div>

        <div className={styles.avatarRow}>
          <div className={styles.avatarLarge}>{initials}</div>
          <div>
            <div className={styles.avatarName}>{user?.name}</div>
            <div className={styles.avatarRole}>{user?.role === 'admin' ? t('settings_admin') : t('settings_therapist')} · {user?.email}</div>
          </div>
        </div>

        <Field label={t('settings_full_name')}>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Mari Mägi" />
        </Field>
        <Field label={t('settings_phone')} >
          <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+372 5123 4567" />
        </Field>
        <Field label={t('settings_branch')}>
          <select value={form.branch} onChange={e => set('branch', e.target.value)}>
            <option>Tallinn</option>
            <option>Tartu</option>
            <option>Kuressaare</option>
          </select>
        </Field>

        <div className={styles.saveRow}>
          {saved && <span className={styles.savedMsg}>{t('settings_profile_saved')}</span>}
          <Button variant="primary" onClick={handleSaveProfile} disabled={loading}>{t('settings_save_profile')}</Button>
        </div>
      </Card>

      <Card style={{ maxWidth: 480 }}>
        <div className={styles.cardTitle}>{t('settings_language')}</div>
        <Field label={t('settings_language')}>
          <select value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="et">{t('settings_language_et')}</option>
            <option value="en">{t('settings_language_en')}</option>
          </select>
        </Field>
      </Card>

      <Card style={{ maxWidth: 480 }}>
        <div className={styles.cardTitle}>{t('settings_change_password')}</div>
        <Field label={t('settings_current_password')}>
          <input type="password" value={pwForm.currentPassword} onChange={e => setPw('currentPassword', e.target.value)} placeholder="••••••••" />
        </Field>
        <Field label={t('settings_new_password')}>
          <input type="password" value={pwForm.newPassword} onChange={e => setPw('newPassword', e.target.value)} placeholder="••••••••" />
        </Field>
        <Field label={t('settings_repeat_password')}>
          <input type="password" value={pwForm.confirm} onChange={e => setPw('confirm', e.target.value)} placeholder="••••••••" />
        </Field>
        {pwError && <div className={styles.errorMsg}>{pwError}</div>}
        <div className={styles.saveRow}>
          {pwSaved && <span className={styles.savedMsg}>{t('settings_password_changed')}</span>}
          <Button variant="primary" onClick={handleChangePassword} disabled={loading}>🔒 {t('settings_change_password')}</Button>
        </div>
      </Card>
    </div>
  );
}
