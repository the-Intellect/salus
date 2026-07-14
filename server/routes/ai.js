import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../db/database.js';

const router = express.Router();

const toDateStr = (d) => {
  if (!d) return 'teadmata';
  if (typeof d === 'string') return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
};

router.post('/suggest', requireAuth, async (req, res) => {
  const { clientId, entries, clientContext } = req.body;

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI pole seadistatud — lisa ANTHROPIC_API_KEY .env faili' });
  }

  try {
    const { rows: clientRows } = await pool.query(
      'SELECT reason, notes FROM clients WHERE id=$1', [clientId]
    );
    const client = clientRows[0] || {};

    const { rows: notesHistory } = await pool.query(
      'SELECT text, saved_at FROM notes_history WHERE client_id=$1 ORDER BY saved_at DESC LIMIT 5',
      [clientId]
    );

    const { rows: prevEntries } = await pool.query(`
      SELECT se.frequency_name, se.initial_result, se.final_result,
             se.minute_results, s.date
      FROM session_entries se
      JOIN sessions s ON se.session_id = s.id
      WHERE s.client_id = $1
      ORDER BY s.date DESC, se.sort_order
      LIMIT 60
    `, [clientId]);

    const { rows: allCategories } = await pool.query(
      'SELECT label_en, label_et FROM frequency_categories ORDER BY label_en'
    );

    const sessionMap = {};
    for (const e of prevEntries) {
      const d = toDateStr(e.date);
      if (!sessionMap[d]) sessionMap[d] = [];
      sessionMap[d].push(e);
    }

    const prevSessionsText = Object.entries(sessionMap)
      .slice(0, 5)
      .map(([date, es]) => {
        const stressed = es.filter(e => e.initial_result < 50);
        return `Seanss ${date}: ${es.length} sagedust, pinges: ${
          stressed.map(e => `${e.frequency_name} (algne ${e.initial_result}→lõpp ${e.final_result})`).join(', ') || 'puudub'
        }`;
      }).join('\n') || 'Eelnevaid seanse pole.';

    const currentText = entries.length > 0
      ? entries.map(e =>
          `- ${e.frequencyName}: algne ${e.initial} → ${e.minutes.length} min → lõpp ${e.final}${e.final < 50 ? ' ⚠️ pinge' : ''}`
        ).join('\n')
      : 'Seanssi pole veel alustatud.';

    const notesText = notesHistory.length > 0
      ? notesHistory.map(n => `[${toDateStr(n.saved_at)}] ${n.text}`).join('\n\n')
      : 'Märkmeid pole.';

    const categoriesText = allCategories
      .map(c => c.label_et ? `${c.label_en} / ${c.label_et}` : c.label_en)
      .join(', ');

    const prompt = `Sa oled kogenud biotagasiside teraapia assistent. Analüüsi kliendi infot ja aita terapeuti.

=== KLIENDI PÖÖRDUMISE PÕHJUS ===
${client.reason || 'Märkimata'}

=== VIIMASED MÄRKMED ===
${notesText}

=== EELNEVAD SEANSID (kokkuvõte) ===
${prevSessionsText}

=== PRAEGUNE SEANSS ===
${currentText}

=== TERAPEUDI LISAINFO / KÜSIMUS ===
${clientContext || 'Pole lisatud'}

=== SAADAOLEVAD KATEGOORIAD ===
${categoriesText}

---

Palun anna struktureeritud vastus järgmiselt:

**1. Mustrid ja tähelepanekud**
Mis korduvad pinged on silma jäänud? Mis on paranenud?

**2. Täpsustavad küsimused**
Mida võiks terapeut kliendilt veel küsida (2-3 küsimust)?

**3. Soovituslikud kategooriad**
Milliseid kategooriaid võiks praeguse seansi kontekstis veel testida? Nimeta 3-5 kategooriat meie nimekirjast ja põhjenda lühidalt.

Ole konkreetne, praktiline ja lühike. Vasta eesti keeles. Maksimaalselt 250 sõna.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'AI viga');

    const text = data.content?.[0]?.text || '';
    res.json({ suggestion: text });

  } catch (err) {
    console.error('AI viga:', err);
    res.status(500).json({ error: 'AI soovitus ebaõnnestus: ' + err.message });
  }
});

export default router;

// POST /api/ai/suggestions — salvesta AI soovitus
router.post('/suggestions', requireAuth, async (req, res) => {
  const { clientId, sessionId, text } = req.body;
  if (!clientId || !text) return res.status(400).json({ error: 'clientId ja text on kohustuslikud' });
  const { rows } = await pool.query(
    'INSERT INTO ai_suggestions (client_id, session_id, text, saved_by) VALUES ($1,$2,$3,$4) RETURNING *',
    [clientId, sessionId || null, text, req.user.id]
  );
  res.json(rows[0]);
});

// GET /api/ai/suggestions/:clientId — lae kliendi AI soovitused
router.get('/suggestions/:clientId', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM ai_suggestions WHERE client_id=$1 ORDER BY saved_at DESC',
    [req.params.clientId]
  );
  res.json(rows);
});

// DELETE /api/ai/suggestions/:id
router.delete('/suggestions/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM ai_suggestions WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// POST /api/ai/client-recommendation — AI soovitus kliendile pärast seanssi
router.post('/client-recommendation', requireAuth, async (req, res) => {
  const { clientId, entries, therapistNote, language = 'et' } = req.body;

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI pole seadistatud' });
  }

  const isEt = language === 'et';

  try {
    const { rows: clientRows } = await pool.query(
      'SELECT reason FROM clients WHERE id=$1', [clientId]
    );
    const reason = clientRows[0]?.reason || '';

    const { rows: therapistRows } = await pool.query(
      'SELECT name FROM users WHERE id=$1', [req.user.id]
    );
    const therapistName = therapistRows[0]?.name || '';

    const entriesText = entries.length > 0
      ? entries.map(e => `- ${e.frequencyName}: ${e.initial} -> ${e.final}`).join('\n')
      : isEt ? 'Andmed puuduvad' : 'No data';

    const prompt = isEt
      ? `Sa oled biotagasiside teraapia assistent. Koosta lühike ja soe soovitus kliendile.

Poordumise pohjus: ${reason || 'Markimata'}
Seansil toodeldud teemad: ${entriesText}
${therapistNote ? `Terapeudi lisainfo: ${therapistNote}` : ''}

Juhised:
- Kirjuta otse kliendile (sina-vormis), soe ja toetav
- Maksimaalselt 150 sona
- Ara mainigi sagedusi ega numbreid
- Ara kasuta tarne (**), pealkirju ega erilisi marke
- Ara alusta poordumisega (nt "Armas klient")
- Lõpeta soovitus terapeudi nimega eraldi real: ${therapistName}`
      : `You are a biofeedback therapy assistant. Write a short, warm recommendation for the client.

Reason for visit: ${reason || 'Not specified'}
Topics addressed: ${entriesText}
${therapistNote ? `Therapist note: ${therapistNote}` : ''}

Instructions:
- Write directly to the client using "you", warm and supportive
- Maximum 150 words
- Do not mention frequencies or numbers
- Do not use asterisks (**), headers or special formatting marks
- Do not start with a greeting like "Dear client"
- End with the therapist name on a new line: ${therapistName}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'AI viga');
    res.json({ recommendation: data.content?.[0]?.text || '' });

  } catch (err) {
    console.error('AI soovitus kliendile:', err);
    res.status(500).json({ error: err.message });
  }
});
