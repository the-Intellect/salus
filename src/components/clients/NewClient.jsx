import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '../../db/database';
import { Button, Card, Field, PageHeader } from '../UI';
import styles from './ClientForm.module.css';

function formatDob(val) {
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
}

const EMPTY = {
  firstName: '', lastName: '', dob: '', gender: 'Naine',
  email: '', phone: '', branch: 'Tallinn', reason: '', source: '',
};

export default function NewClient() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Kohustuslik';
    if (!form.lastName.trim()) e.lastName = 'Kohustuslik';
    if (!form.dob || form.dob.length < 10) e.dob = 'Sisesta kuupäev PP/KK/AAAA';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const client = createClient(form);
    navigate(`/clients/${client.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Uus klient"
        action={<Button variant="ghost" onClick={() => navigate('/clients')}>← Tagasi</Button>}
      />
      <Card style={{ maxWidth: 540 }}>
        <div className={styles.grid2}>
          <Field label="Eesnimi *">
            <input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Mari" />
            {errors.firstName && <span className={styles.error}>{errors.firstName}</span>}
          </Field>
          <Field label="Perekonnanimi *">
            <input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Tamm" />
            {errors.lastName && <span className={styles.error}>{errors.lastName}</span>}
          </Field>
        </div>

        <div className={styles.grid2}>
          <Field label="Sünnikuupäev * (PP/KK/AAAA)">
            <input
              value={form.dob}
              onChange={e => set('dob', formatDob(e.target.value))}
              placeholder="15/03/1985"
              maxLength={10}
            />
            {errors.dob && <span className={styles.error}>{errors.dob}</span>}
          </Field>
          <Field label="Sugu">
            <select value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option>Naine</option>
              <option>Mees</option>
              <option>Laps (N)</option>
              <option>Laps (M)</option>
            </select>
          </Field>
        </div>

        <div className={styles.grid2}>
          <Field label="Email">
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="mari@email.com" />
          </Field>
          <Field label="Telefon">
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+372 5123 4567" />
          </Field>
        </div>

        <Field label="Filiaali">
          <select value={form.branch} onChange={e => set('branch', e.target.value)}>
            <option>Tallinn</option>
            <option>Tartu</option>
            <option>Kuressaare</option>
          </select>
        </Field>

        <Field label="Pöördumise põhjus">
          <textarea
            value={form.reason}
            onChange={e => set('reason', e.target.value)}
            placeholder="Kirjelda põhjust..."
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </Field>

        <Field label="Kust kuulis meist">
          <input value={form.source} onChange={e => set('source', e.target.value)} placeholder="Sõbra soovitus, Google..." />
        </Field>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => navigate('/clients')}>Tühista</Button>
          <Button variant="primary" onClick={handleSubmit}>✓ Loo klient</Button>
        </div>
      </Card>
    </div>
  );
}
