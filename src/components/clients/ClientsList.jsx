import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/index.js';
import { Button, Avatar, Badge, PageHeader, EmptyState } from '../UI.jsx';
import styles from './Clients.module.css';
import { useAppStore } from '../../store/appStore.js';

const BRANCHES = ['Kõik filiaalid', 'Tallinn', 'Tartu', 'Kuressaare'];

export default function ClientsList() {
  const navigate = useNavigate();
  const activeSession = useAppStore(s => s.activeSession);
  const activeClientId = useAppStore(s => s.activeClientId);
  const clearSession = useAppStore(s => s.clearSession);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('Kõik filiaalid');

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
           (branch === 'Kõik filiaalid' || c.branch === branch);
  });

  return (
    <div>
      <PageHeader title="Kliendid" action={<Button variant="primary" onClick={() => navigate('/clients/new')}>+ Uus klient</Button>} />
      <div className={styles.filters}>
        <input type="text" placeholder="Otsi klienti nimega..." value={search} onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
        <select value={branch} onChange={e => setBranch(e.target.value)} className={styles.branchSelect}>
          {BRANCHES.map(b => <option key={b}>{b}</option>)}
        </select>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}><span>{clients.length}</span> klienti kokku</div>
        <div className={styles.stat}><span>{filtered.length}</span> kuvatud</div>
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
  const name = `${client.first_name} ${client.last_name}`;
  const count = parseInt(client.session_count) || 0;
  const badgeLabel = count === 0 ? 'Esmane' : count === 1 ? '1 seanss' : `${count} seanssi`;
  const badgeVariant = count === 0 ? 'neutral' : 'accent';
  return (
    <div className={styles.card} onClick={onClick}>
      <Avatar name={name} size={42} />
      <div className={styles.cardBody}>
        <div className={styles.cardName}>{name}</div>
        <div className={styles.cardMeta}>{client.branch}</div>
        <div className={styles.cardMeta}>{client.therapist_name ? `Terapeut: ${client.therapist_name}` : ''}</div>
      </div>
      <Badge variant={badgeVariant}>{badgeLabel}</Badge>
    </div>
  );
}
