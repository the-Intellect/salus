import styles from './UI.module.css';

export function Button({ children, variant = 'secondary', size = 'md', onClick, disabled, style, type = 'button' }) {
  return (
    <button
      type={type}
      className={`${styles.btn} ${styles[variant]} ${styles[size]}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}

export function Card({ children, style, className = '' }) {
  return <div className={`${styles.card} ${className}`} style={style}>{children}</div>;
}

export function Badge({ children, variant = 'neutral' }) {
  return <span className={`${styles.badge} ${styles['badge-' + variant]}`}>{children}</span>;
}

export function ResultPill({ value }) {
  if (value === null || value === undefined) return <span className={styles.pillEmpty}>—</span>;
  const v = Number(value);
  const variant = v >= 85 ? 'ok' : v >= 50 ? 'warn' : 'stress';
  return <span className={`${styles.pill} ${styles['pill-' + variant]}`}>{v}</span>;
}

export function Label({ children }) {
  return <label className={styles.fieldLabel}>{children}</label>;
}

export function Field({ label, children }) {
  return (
    <div className={styles.field}>
      {label && <Label>{label}</Label>}
      {children}
    </div>
  );
}

export function Avatar({ name, size = 40 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={styles.avatar} style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}

export function PageHeader({ title, action }) {
  return (
    <div className={styles.pageHeader}>
      <h1 className={styles.pageTitle}>{title}</h1>
      {action && <div>{action}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, description }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{icon}</div>
      <div className={styles.emptyTitle}>{title}</div>
      {description && <div className={styles.emptyDesc}>{description}</div>}
    </div>
  );
}
