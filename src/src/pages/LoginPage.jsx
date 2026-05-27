import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/index.js';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Kui on token URL-is, näita parooli seadmise vormi
  if (token) return <SetPasswordForm token={token} />;

  return <LoginForm login={login} navigate={navigate} />;
}

function LoginForm({ login, navigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/clients');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setForgotSent(true);
    } catch {
      setForgotSent(true); // Ära avalda viga
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>BT</div>
        </div>
        <h1 className={styles.title}>Salus</h1>
        <p className={styles.subtitle}>Kliendihaldussüsteem</p>

        {!forgot ? (
          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.field}>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="sinu@email.ee"
                required
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <label>Parool</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? 'Sisselogimine...' : 'Logi sisse'}
            </button>
            <button type="button" className={styles.btnLink} onClick={() => setForgot(true)}>
              Unustasin parooli
            </button>
          </form>
        ) : forgotSent ? (
          <div className={styles.successBox}>
            <div className={styles.successIcon}>✉️</div>
            <p>Kui see email on süsteemis olemas, saatsime sulle sisselogimise lingi.</p>
            <button className={styles.btnLink} onClick={() => { setForgot(false); setForgotSent(false); }}>
              ← Tagasi sisselogimisele
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgot} className={styles.form}>
            <p className={styles.forgotText}>Sisesta oma email ja saadame sulle uue sisselogimise lingi.</p>
            <div className={styles.field}>
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="sinu@email.ee" required autoFocus />
            </div>
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? 'Saatmine...' : 'Saada link'}
            </button>
            <button type="button" className={styles.btnLink} onClick={() => setForgot(false)}>
              ← Tagasi
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function SetPasswordForm({ token }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Paroolid ei kattu'); return; }
    if (password.length < 8) { setError('Parool peab olema vähemalt 8 tähemärki'); return; }
    setLoading(true);
    try {
      const { token: jwt } = await api.setPassword(token, password);
      localStorage.setItem('salus_token', jwt);
      navigate('/clients');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}><div className={styles.logoMark}>BT</div></div>
        <h1 className={styles.title}>Loo parool</h1>
        <p className={styles.subtitle}>Vähemalt 8 tähemärki</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Uus parool</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoFocus />
          </div>
          <div className={styles.field}>
            <label>Korda parooli</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? 'Salvestamine...' : 'Salvesta ja logi sisse'}
          </button>
        </form>
      </div>
    </div>
  );
}
