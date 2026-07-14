import { useState } from 'react';
import { api } from '../../api/index.js';
import { Card, Button } from '../../components/UI.jsx';

export default function BackupPage() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/backup', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Varukoopia ebaõnnestus');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `salus_backup_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(err) {
      alert(err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>💾 Käsitsi varukoopia</div>
        <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
          Laadi alla kõigi andmete varukoopia JSON formaadis. See sisaldab klientide, seanside ja kasutajate andmeid.
        </div>
        <Button variant="primary" onClick={handleDownload} disabled={downloading}>
          {downloading ? '⏳ Valmistan...' : '⬇️ Laadi varukoopia alla'}
        </Button>
      </Card>

      <Card>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>🕐 Automaatne varukoopia</div>
        <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          Server teeb automaatselt varukoopia iga päev kell 02:00 ja salvestab selle serveri <code>backups/</code> kausta.
          Varukoopiad säilitatakse 30 päeva.
        </div>
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--color-ok-light)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-ok)' }}>
          ✓ Automaatne varundamine on aktiivne
        </div>
      </Card>
    </div>
  );
}
