import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import FrequenciesAdminPage from './FrequenciesAdminPage.jsx';
import DashboardPage from './DashboardPage.jsx';
import BranchesPage from './BranchesPage.jsx';
import BackupPage from './BackupPage.jsx';
import { useLanguage } from '../../context/useLanguage.js';
import UsersPage from './UsersPage.jsx';
import ProfilePage from './ProfilePage.jsx';
import styles from './Settings.module.css';

export default function SettingsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: `👤 ${t('settings_profile')}` },
    ...(user?.role === 'admin' ? [{ id: 'users', label: `👥 ${t('settings_users')}` }] : []),
    ...(user?.role === 'admin' ? [{ id: 'frequencies', label: `🎵 Sagedused` }] : []),
    ...(user?.role === 'admin' ? [{ id: 'dashboard', label: `📊 Armatuurlaud` }] : []),
    ...(user?.role === 'admin' ? [{ id: 'branches', label: `🏢 Filiaalid` }] : []),
    ...(user?.role === 'admin' ? [{ id: 'backup', label: `💾 Varukoopia` }] : []),
  ];

  return (
    <div>
      <h1 className={styles.title}>{t('settings_title')}</h1>
      <div className={styles.tabs}>
        {tabs.map(t => (
          <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'profile' && <ProfilePage />}
      {tab === 'users' && user?.role === 'admin' && <UsersPage />}
      {tab === 'frequencies' && user?.role === 'admin' && <FrequenciesAdminPage />}
      {tab === 'dashboard' && user?.role === 'admin' && <DashboardPage />}
      {tab === 'branches' && user?.role === 'admin' && <BranchesPage />}
      {tab === 'backup' && user?.role === 'admin' && <BackupPage />}
    </div>
  );
}
