import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/index.js';
import { Button, Avatar, Badge, PageHeader, EmptyState } from '../UI.jsx';
import styles from './Clients.module.css';
import { useAppStore } from '../../store/appStore.js';
import { useLanguage } from '../../context/useLanguage.js';
import { useAuth } from '../../context/AuthContext.jsx';

const BRANCHES_BASE = ['Tallinn', 'Tartu', 'Kuressaare'];

export default function ClientsList() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const BRANCHES = [t('clients_all_branches'), ...BRANCHES_BASE];
  const activeSession = useAppStore(s => s.activeSession);
  const activeClientId = useAppStore(s => s.activeClientId);
  const clearSession = useAppStore(s => s.clearSession);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState(t('clients_all_branches')); // admin näeb kõiki, terapeut filtreerib ise

  useEffect(() => {
    api.getClients().then(setClients).finally(() => setLoading(false));
  }, []);

  const handleClientClick = (clientId) => {
    if (activeSession && activeClientId !== clientId) {
      if (!window.confirm('Sul on aktiivne seanss pooleli. Kas soovid selle katkestada?')) return;
      clearSession();
    }
    navigate(`/clients/${clientId}`);
  };

  const filtered = clients.filter(c => {
    const name = `${c.first_name} ${c.last_name}`.toLowerCase();
    return (!search || name.includes(search.toLowerCase())) &&
           (branch === t('clients_all_branches') || c.branch === branch);
  });

  return (
    <div>
      <PageHeader title={t('clients_title')} action={<Button variant="primary" onClick={() => navigate('/clients/new')}>{t('clients_new')}</Button>} />
      <div className={styles.filters}>
        <input type="text" placeholder={t('clients_search')} value={search} onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
        <select value={branch} onChange={e => setBranch(e.target.value)} className={styles.branchSelect}>
          {BRANCHES.map(b => <option key={b}>{b}</option>)}
        </select>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}><span>{clients.length}</span> {t('clients_total')}</div>
        <div className={styles.stat}><span>{filtered.length}</span> {t('clients_shown')}</div>
      </div>
      {loading ? <p style={{color:'var(--color-text-muted)'}}>Laadimine...</p> :
       filtered.length === 0 ? <EmptyState icon="👤" title="Kliente ei leitud" description="Muuda otsingut või lisa uus klient." /> :
       <div className={styles.grid}>
         {filtered.map(client => (
           <ClientCard key={client.id} client={client} onClick={() => handleClientClick(client.id)} />
         ))}
       </div>
      }
    </div>
  );
}

function ClientCard({ client, onClick }) {
  const { t } = useLanguage();
  const name = `${client.first_name} ${client.last_name}`;
  const count = parseInt(client.session_count) || 0;
  const badgeLabel = count === 0 ? t('client_first') : count === 1 ? `1 ${t('clients_session_singular')}` : `${count} ${t('clients_session_plural')}`;
  const badgeVariant = count === 0 ? 'neutral' : 'accent';
  return (
    <div className={styles.card} onClick={onClick}>
      <Avatar name={name} size={42} />
      <div className={styles.cardBody}>
        <div className={styles.cardName}>{name}</div>
        <div className={styles.cardMeta}>{client.branch}{client.therapist_name ? ` · ${client.therapist_name}` : ''}</div>
        <div className={styles.cardMeta}>{client.therapist_name ? `${t('clients_therapist')}: ${client.therapist_name}` : ''}</div>
      </div>
      <Badge variant={badgeVariant}>{badgeLabel}</Badge>
    </div>
  );
}
