import express from 'express';
import { pool } from '../db/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/frequencies — kõik aktiivsed sagedused koos kategooriatega
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      f.id,
      f.freq_name,
      f.description,
      COALESCE(
        array_agg(
          json_build_object('id', fc.id, 'label_en', fc.label_en, 'label_et', fc.label_et)
          ORDER BY fc.label_en
        ) FILTER (WHERE fc.id IS NOT NULL),
        '{}'
      ) as categories
    FROM frequencies f
    LEFT JOIN frequency_category_map fcm ON f.id = fcm.frequency_id
    LEFT JOIN frequency_categories fc ON fcm.category_id = fc.id
    WHERE f.is_active = TRUE
    GROUP BY f.id, f.freq_name, f.description
    ORDER BY f.freq_name
  `);
  res.json(rows);
});

// GET /api/frequencies/categories — kõik kategooriad dropdown jaoks
router.get('/categories', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT DISTINCT fc.id, fc.label_en, fc.label_et
    FROM frequency_categories fc
    JOIN frequency_category_map fcm ON fc.id = fcm.category_id
    JOIN frequencies f ON fcm.frequency_id = f.id
    WHERE f.is_active = TRUE
    ORDER BY fc.label_en
  `);
  res.json(rows);
});

// PUT /api/frequencies/:id/description — admin muudab kirjeldust
router.put('/:id/description', requireAuth, requireAdmin, async (req, res) => {
  const { description } = req.body;
  const { rows } = await pool.query(
    'UPDATE frequencies SET description=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
    [description, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Sagedust ei leitud' });
  res.json(rows[0]);
});

export default router;
