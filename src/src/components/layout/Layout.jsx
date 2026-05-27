import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './Layout.module.css';

const NAV = [
  { to: '/clients', icon: '👥', label: 'Kliendid' },
  { to: '/session', icon: '⚡', label: 'Aktiivne seanss' },
  { to: '/history', icon: '📊', label: 'Sageduste ajalugu' },
  { to: '/reports', icon: '📄', label: 'Raportid' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>BT</div>
          <div>
            <div className={styles.logoName}>BioTagasiside</div>
            <div className={styles.logoSub}>Haldussüsteem</div>
          </div>
        </div>
        <nav className={styles.nav}>
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}>
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <NavLink to="/settings" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}>
            <span className={styles.navIcon}>⚙️</span><span>Seaded</span>
          </NavLink>
          <button className={`${styles.navItem} ${styles.logoutBtn}`} onClick={handleLogout}>
            <span className={styles.navIcon}>🚪</span><span>Logi välja</span>
          </button>
          <div className={styles.userCard} style={{ cursor: 'pointer' }} onClick={() => navigate('/settings')}>
            <div className={styles.userAvatar}>{initials}</div>
            <div>
              <div className={styles.userName}>{user?.name}</div>
              <div className={styles.userSub}>{user?.branch} · {user?.role === 'admin' ? 'Admin' : 'Terapeut'}</div>
            </div>
          </div>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
