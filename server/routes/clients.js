import express from 'express';
import { pool } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/clients
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT c.*, u.name as therapist_name,
      (SELECT COUNT(*) FROM sessions s WHERE s.client_id = c.id) as session_count,
      (SELECT MAX(s.date) FROM sessions s WHERE s.client_id = c.id) as last_session
    FROM clients c
    LEFT JOIN users u ON c.therapist_id = u.id
    ORDER BY
      CASE WHEN c.therapist_id = $1 THEN 0 ELSE 1 END,
      last_session DESC NULLS LAST,
      c.last_name ASC
  `, [req.user.id]);
  res.json(rows);
});

// GET /api/clients/:id
router.get('/:id', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT c.*, u.name as therapist_name
    FROM clients c LEFT JOIN users u ON c.therapist_id = u.id
    WHERE c.id=$1
  `, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Klienti ei leitud' });
  // Lisa märkmete ajalugu
  const { rows: notes } = await pool.query(
    'SELECT * FROM notes_history WHERE client_id=$1 ORDER BY saved_at DESC',
    [req.params.id]
  );
  res.json({ ...rows[0], notes_history: notes });
});

// POST /api/clients
router.post('/', requireAuth, async (req, res) => {
  const { firstName, lastName, dob, gender, email, phone, branch, reason, source } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO clients (first_name,last_name,dob,gender,email,phone,branch,reason,source,therapist_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
    [firstName, lastName, dob, gender, email, phone, branch, reason, source, req.user.id]
  );
  res.json(rows[0]);
});

// PUT /api/clients/:id
router.put('/:id', requireAuth, async (req, res) => {
  const { firstName, lastName, dob, gender, email, phone, branch, reason, source, therapistId } = req.body;
  const { rows } = await pool.query(
    'UPDATE clients SET first_name=$1,last_name=$2,dob=$3,gender=$4,email=$5,phone=$6,branch=$7,reason=$8,source=$9,therapist_id=$10 WHERE id=$11 RETURNING *',
    [firstName, lastName, dob, gender, email, phone, branch, reason, source, therapistId, req.params.id]
  );
  res.json(rows[0]);
});

// POST /api/clients/:id/notes
router.post('/:id/notes', requireAuth, async (req, res) => {
  const { text } = req.body;
  await pool.query('UPDATE clients SET notes=$1 WHERE id=$2', [text, req.params.id]);
  await pool.query(
    'INSERT INTO notes_history (client_id, text, saved_by) VALUES ($1,$2,$3)',
    [req.params.id, text, req.user.id]
  );
  const { rows } = await pool.query(
    'SELECT * FROM notes_history WHERE client_id=$1 ORDER BY saved_at DESC',
    [req.params.id]
  );
  res.json(rows);
});

export default router;

// DELETE /api/clients/:id/notes/:noteId
router.delete('/:id/notes/:noteId', requireAuth, async (req, res) => {
  await pool.query(
    'DELETE FROM notes_history WHERE id=$1 AND client_id=$2',
    [req.params.noteId, req.params.id]
  );
  const { rows } = await pool.query(
    'SELECT * FROM notes_history WHERE client_id=$1 ORDER BY saved_at DESC',
    [req.params.id]
  );
  res.json(rows);
});

// PUT /api/clients/:id/notes/:noteId
router.put('/:id/notes/:noteId', requireAuth, async (req, res) => {
  const { text } = req.body;
  await pool.query(
    'UPDATE notes_history SET text=$1 WHERE id=$2 AND client_id=$3',
    [text, req.params.noteId, req.params.id]
  );
  const { rows } = await pool.query(
    'SELECT * FROM notes_history WHERE client_id=$1 ORDER BY saved_at DESC',
    [req.params.id]
  );
  res.json(rows);
});
