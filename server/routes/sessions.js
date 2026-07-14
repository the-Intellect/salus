import express from 'express';
import { pool } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Migratsioon - lisa description_en veerg session_entries tabelisse
await pool.query(`
  ALTER TABLE IF EXISTS session_entries 
  ADD COLUMN IF NOT EXISTS frequency_description_en TEXT;
`);

// GET /api/sessions/client/:clientId
router.get('/client/:clientId', requireAuth, async (req, res) => {
  const { rows: sessions } = await pool.query(`
    SELECT s.*, u.name as therapist_name, s.duration_minutes
    FROM sessions s
    LEFT JOIN users u ON s.therapist_id = u.id
    WHERE s.client_id=$1
    ORDER BY s.created_at DESC
  `, [req.params.clientId]);

  for (const session of sessions) {
    const { rows: entries } = await pool.query(
      'SELECT * FROM session_entries WHERE session_id=$1 ORDER BY sort_order',
      [session.id]
    );
    session.entries = entries.map(e => ({
      frequencyId: e.frequency_id,
      frequencyName: e.frequency_name,
      frequencyDescription: e.frequency_description,
      frequencyDescriptionEn: e.frequency_description_en,
      initial: e.initial_result,
      minutes: e.minute_results || [],
      final: e.final_result,
    }));
  }
  res.json(sessions);
});

// POST /api/sessions
router.post('/', requireAuth, async (req, res) => {
  const { clientId, entries, notes, duration, clientRecommendation, startTime } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO sessions (client_id, therapist_id, notes, duration_minutes, client_recommendation, start_time) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [clientId, req.user.id, notes || '', duration || 60, clientRecommendation || null, startTime || null]
  );
  const session = rows[0];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    await pool.query(
      'INSERT INTO session_entries (session_id,frequency_id,frequency_name,frequency_description,frequency_description_en,initial_result,minute_results,final_result,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [session.id, e.frequencyId, e.frequencyName, e.frequencyDescription, e.frequencyDescriptionEn || '', e.initial, e.minutes, e.final, i]
    );
  }
  res.json({ ...session, entries });
});

// PUT /api/sessions/:id
router.put('/:id', requireAuth, async (req, res) => {
  const { entries, notes, duration, clientRecommendation, startTime } = req.body;
  await pool.query('UPDATE sessions SET notes=$1, duration_minutes=$2, client_recommendation=$3, start_time=$4 WHERE id=$5', 
    [notes || '', duration || 60, clientRecommendation || null, startTime || null, req.params.id]);
  await pool.query('DELETE FROM session_entries WHERE session_id=$1', [req.params.id]);
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    await pool.query(
      'INSERT INTO session_entries (session_id,frequency_id,frequency_name,frequency_description,frequency_description_en,initial_result,minute_results,final_result,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [req.params.id, e.frequencyId, e.frequencyName, e.frequencyDescription, e.frequencyDescriptionEn || '', e.initial, e.minutes, e.final, i]
    );
  }
  res.json({ ok: true });
});

// DELETE /api/sessions/:id
router.delete('/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM sessions WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

export default router;
