import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import UsersPage from './UsersPage.jsx';
import ProfilePage from './ProfilePage.jsx';
import styles from './Settings.module.css';

export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: '👤 Profiil' },
    ...(user?.role === 'admin' ? [{ id: 'users', label: '👥 Kasutajad' }] : []),
  ];

  return (
    <div>
      <h1 className={styles.title}>Seaded</h1>
      <div className={styles.tabs}>
        {tabs.map(t => (
          <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'profile' && <ProfilePage />}
      {tab === 'users' && user?.role === 'admin' && <UsersPage />}
    </div>
  );
}
