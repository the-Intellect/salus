import fs from 'fs';
import path from 'path';
import { pool } from './db/database.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, 'backups');
const KEEP_DAYS = 30;

export async function runBackup() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const [clients, sessions, entries, notes, users, aiSuggestions] = await Promise.all([
      pool.query('SELECT * FROM clients ORDER BY id'),
      pool.query('SELECT * FROM sessions ORDER BY id'),
      pool.query('SELECT * FROM session_entries ORDER BY id'),
      pool.query('SELECT * FROM notes_history ORDER BY id'),
      pool.query('SELECT id,name,email,role,branch,phone FROM users ORDER BY id'),
      pool.query('SELECT * FROM ai_suggestions ORDER BY id'),
    ]);

    const backup = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      data: {
        clients: clients.rows,
        sessions: sessions.rows,
        session_entries: entries.rows,
        notes_history: notes.rows,
        users: users.rows,
        ai_suggestions: aiSuggestions.rows,
      }
    };

    const filename = `backup_${new Date().toISOString().slice(0,10)}.json`;
    fs.writeFileSync(path.join(BACKUP_DIR, filename), JSON.stringify(backup, null, 2));
    console.log(`✓ Varukoopia salvestatud: ${filename}`);

    // Kustuta vanad varukoopiad (>30 päeva)
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('backup_') && f.endsWith('.json'));
    const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
    for (const file of files) {
      const stat = fs.statSync(path.join(BACKUP_DIR, file));
      if (stat.mtime.getTime() < cutoff) {
        fs.unlinkSync(path.join(BACKUP_DIR, file));
        console.log(`Kustutatud vana varukoopia: ${file}`);
      }
    }
  } catch(err) {
    console.error('Varukoopia viga:', err);
  }
}

// Käivita kell 02:00 iga öösel
export function scheduleBackup() {
  const now = new Date();
  const next = new Date();
  next.setHours(2, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next - now;

  setTimeout(() => {
    runBackup();
    setInterval(runBackup, 24 * 60 * 60 * 1000);
  }, delay);

  console.log(`✓ Automaatne varukoopia ajastatud kell 02:00 (${Math.round(delay/1000/60)} min pärast)`);
}
