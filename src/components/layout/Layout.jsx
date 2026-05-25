import { NavLink } from 'react-router-dom';
import styles from './Layout.module.css';

const NAV = [
  { to: '/clients', icon: '👥', label: 'Kliendid' },
  { to: '/session', icon: '⚡', label: 'Aktiivne seanss' },
  { to: '/history', icon: '📊', label: 'Sageduste ajalugu' },
  { to: '/reports', icon: '📄', label: 'Raportid' },
];

export default function Layout({ children }) {
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
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <NavLink to="/settings" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}>
            <span className={styles.navIcon}>⚙️</span>
            <span>Seaded</span>
          </NavLink>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>MM</div>
            <div>
              <div className={styles.userName}>Mari Mägi</div>
              <div className={styles.userSub}>Tallinn · Terapeut</div>
            </div>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
