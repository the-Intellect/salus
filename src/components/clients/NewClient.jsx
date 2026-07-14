import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/useLanguage.js';
import { Button, Card, Field, PageHeader } from '../UI.jsx';
import styles from './ClientForm.module.css';

function formatDob(val) {
  const d = val.replace(/\D/g,'').slice(0,8);
  if (d.length<=2) return d;
  if (d.length<=4) return d.slice(0,2)+'/'+d.slice(2);
  return d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4);
}

export default function NewClient() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({ firstName:'', lastName:'', dob:'', gender:'Naine', email:'', phone:'', branch: user?.branch || 'Tallinn', reason:'', source:'' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName=t('form_required');
    if (!form.lastName.trim()) e.lastName=t('form_required');
    if (!form.dob||form.dob.length<10) e.dob=t('form_dob_format');
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const client = await api.createClient(form);
      navigate(`/clients/${client.id}`);
    } catch(err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('clients_new_title')} action={<Button variant="ghost" onClick={() => navigate('/clients')}>← {t('back')}</Button>} />
      <Card style={{maxWidth:540}}>
        <div className={styles.grid2}>
          <Field label={`${t('data_first_name')} *`}><input value={form.firstName} onChange={e=>set('firstName',e.target.value)} placeholder="Mari" />{errors.firstName&&<span className={styles.error}>{errors.firstName}</span>}</Field>
          <Field label={`${t('data_last_name')} *`}><input value={form.lastName} onChange={e=>set('lastName',e.target.value)} placeholder="Tamm" />{errors.lastName&&<span className={styles.error}>{errors.lastName}</span>}</Field>
        </div>
        <div className={styles.grid2}>
          <Field label={`${t('data_birth_date')} * (PP/KK/AAAA)`}><input value={form.dob} onChange={e=>set('dob',formatDob(e.target.value))} placeholder="15/03/1985" maxLength={10} />{errors.dob&&<span className={styles.error}>{errors.dob}</span>}</Field>
          <Field label={t('data_gender')}><select value={form.gender} onChange={e=>set('gender',e.target.value)}><option>Naine</option><option>Mees</option><option>Laps (N)</option><option>Laps (M)</option></select></Field>
        </div>
        <div className={styles.grid2}>
          <Field label={t('data_email')}><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="mari@email.com" /></Field>
          <Field label={t('data_phone')}><input type="tel" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+372 5123 4567" /></Field>
        </div>
        <Field label={t('data_branch')}><select value={form.branch} onChange={e=>set('branch',e.target.value)}><option>Tallinn</option><option>Tartu</option><option>Kuressaare</option></select></Field>
        <Field label={t('data_reason')}><textarea value={form.reason} onChange={e=>set('reason',e.target.value)} rows={3} style={{resize:'vertical'}} placeholder={t('form_reason_placeholder')} /></Field>
        <Field label={t('data_heard_from')}><input value={form.source} onChange={e=>set('source',e.target.value)} placeholder="Sõbra soovitus, Google..." /></Field>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => navigate('/clients')}>{t('cancel')}</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>{loading ? t('form_saving') : `✓ ${t('clients_create')}`}</Button>
        </div>
      </Card>
    </div>
  );
}
