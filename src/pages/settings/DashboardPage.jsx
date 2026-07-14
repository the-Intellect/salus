import { useState, useEffect } from 'react';
import { api } from '../../api/index.js';
import { Card } from '../../components/UI.jsx';

function StatCard({ label, value, sub }) {
  return (
    <Card style={{ textAlign: 'center', padding: '1.25rem' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-accent)' }}>{value}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{sub}</div>}
    </Card>
  );
}

function minutesToHours(min) {
  if (!min) return '0h';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState('');

  useEffect(() => {
    api.getStats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 32, color: 'var(--color-text-muted)' }}>Laadimine...</div>;
  if (!stats) return null;

  const { monthly, therapists, branches, totals } = stats;

  // Kuude nimekiri unikaalne
  const months = [...new Set(monthly.map(r => r.month))].sort().reverse();

  // Filtreeri kuude kaupa
  const filteredMonthly = monthFilter
    ? monthly.filter(r => r.month === monthFilter)
    : monthly;

  // Grupeeri terapeudide ja filiaalide kaupa kuuandmed
  const monthlyByTherapist = {};
  for (const row of filteredMonthly) {
    const key = row.therapist_name || 'Määramata';
    if (!monthlyByTherapist[key]) monthlyByTherapist[key] = { sessions: 0, minutes: 0, branch: row.branch };
    monthlyByTherapist[key].sessions += parseInt(row.session_count);
    monthlyByTherapist[key].minutes += parseInt(row.total_minutes || 0);
  }

  const monthlyByBranch = {};
  for (const row of filteredMonthly) {
    const key = row.branch || 'Määramata';
    if (!monthlyByBranch[key]) monthlyByBranch[key] = { sessions: 0, minutes: 0 };
    monthlyByBranch[key].sessions += parseInt(row.session_count);
    monthlyByBranch[key].minutes += parseInt(row.total_minutes || 0);
  }

  return (
    <div>
      {/* Üldstatistika */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Kliente kokku" value={totals.total_clients || 0} />
        <StatCard label="Seanse kokku" value={totals.total_sessions || 0} />
        <StatCard label="Tunde kokku" value={minutesToHours(totals.total_minutes)} />
      </div>

      {/* Kuu filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Periood:</span>
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={{ fontSize: 14 }}>
          <option value="">Kõik kuud</option>
          {months.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Terapeudide ülevaade */}
        <Card>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>👤 Terapeudid</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Terapeut</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Filiaal</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Seanse</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Tunnid</th>
              </tr>
            </thead>
            <tbody>
              {monthFilter
                ? Object.entries(monthlyByTherapist).sort((a,b) => b[1].sessions - a[1].sessions).map(([name, data]) => (
                  <tr key={name} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 8px', fontWeight: 500 }}>{name}</td>
                    <td style={{ padding: '8px 8px', color: 'var(--color-text-secondary)' }}>{data.branch || '—'}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{data.sessions}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', color: 'var(--color-accent)' }}>{minutesToHours(data.minutes)}</td>
                  </tr>
                ))
                : therapists.map(t => (
                  <tr key={t.name} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 8px', fontWeight: 500 }}>{t.name}</td>
                    <td style={{ padding: '8px 8px', color: 'var(--color-text-secondary)' }}>{t.branch || '—'}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{t.session_count}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', color: 'var(--color-accent)' }}>{minutesToHours(t.total_minutes)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </Card>

        {/* Filiaalide ülevaade */}
        <Card>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>🏢 Filiaalid</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Filiaal</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Seanse</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Tunnid</th>
              </tr>
            </thead>
            <tbody>
              {monthFilter
                ? Object.entries(monthlyByBranch).sort((a,b) => b[1].sessions - a[1].sessions).map(([name, data]) => (
                  <tr key={name} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 8px', fontWeight: 500 }}>{name}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{data.sessions}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', color: 'var(--color-accent)' }}>{minutesToHours(data.minutes)}</td>
                  </tr>
                ))
                : branches.map(b => (
                  <tr key={b.branch} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 8px', fontWeight: 500 }}>{b.branch || 'Määramata'}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{b.session_count}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', color: 'var(--color-accent)' }}>{minutesToHours(b.total_minutes)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </Card>
      </div>

      {/* Kuude ajalugu */}
      <Card>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>📅 Kuude kaupa</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Kuu</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Terapeut</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Filiaal</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Seanse</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Tunnid</th>
            </tr>
          </thead>
          <tbody>
            {(monthFilter ? filteredMonthly : monthly).map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '8px 8px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{row.month}</td>
                <td style={{ padding: '8px 8px', fontWeight: 500 }}>{row.therapist_name || '—'}</td>
                <td style={{ padding: '8px 8px', color: 'var(--color-text-secondary)' }}>{row.branch || '—'}</td>
                <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{row.session_count}</td>
                <td style={{ padding: '8px 8px', textAlign: 'right', color: 'var(--color-accent)' }}>{minutesToHours(row.total_minutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
