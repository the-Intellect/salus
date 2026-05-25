import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClients } from '../../db/database';
import { Button, Avatar, Badge, PageHeader, EmptyState } from '../UI';
import styles from './Clients.module.css';

const BRANCHES = ['Kõik filiaalid', 'Tallinn', 'Tartu', 'Kuressaare'];

export default function ClientsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('Kõik filiaalid');
  const [clients, setClients] = useState(() => getClients());

  const filtered = clients.filter(c => {
    const name = `${c.firstName} ${c.lastName}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchBranch = branch === 'Kõik filiaalid' || c.branch === branch;
    return matchSearch && matchBranch;
  });

  return (
    <div>
      <PageHeader
        title="Kliendid"
        action={
          <Button variant="primary" onClick={() => navigate('/clients/new')}>
            + Uus klient
          </Button>
        }
      />

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Otsi klienti nimega..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <select value={branch} onChange={e => setBranch(e.target.value)} className={styles.branchSelect}>
          {BRANCHES.map(b => <option key={b}>{b}</option>)}
        </select>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}><span>{clients.length}</span> klienti kokku</div>
        <div className={styles.stat}><span>{filtered.length}</span> kuvatud</div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="👤" title="Kliente ei leitud" description="Muuda otsingut või lisa uus klient." />
      ) : (
        <div className={styles.grid}>
          {filtered.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => navigate(`/clients/${client.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClientCard({ client, onClick }) {
  const name = `${client.firstName} ${client.lastName}`;
  return (
    <div className={styles.card} onClick={onClick}>
      <Avatar name={name} size={42} />
      <div className={styles.cardBody}>
        <div className={styles.cardName}>{name}</div>
        <div className={styles.cardMeta}>{client.branch}</div>
        <div className={styles.cardMeta}>{client.dob}</div>
      </div>
      <Badge variant="accent">Korduv</Badge>
    </div>
  );
}
