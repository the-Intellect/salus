import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { pool } from '../db/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, branch: user.branch, avatar_initials: user.avatar_initials },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

async function sendMail(to, subject, html) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email ja parool on kohustuslikud' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    const user = rows[0];
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Vale email või parool' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Vale email või parool' });
    await pool.query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);
    res.json({ token: makeToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role, branch: user.branch, avatar_initials: user.avatar_initials } });
  } catch (e) {
    res.status(500).json({ error: 'Serveri viga' });
  }
});

// POST /api/auth/forgot — saadab sisselogimislingi
router.post('/forgot', async (req, res) => {
  const { email } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email?.toLowerCase()]);
    if (!rows[0]) return res.json({ ok: true }); // Ära avalda kas email eksisteerib
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await pool.query(
      'INSERT INTO password_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)',
      [rows[0].id, token, expires]
    );
    const link = `${process.env.APP_URL || 'http://localhost:5173'}/set-password?token=${token}`;
    await sendMail(email, 'Salus — sisselogimise link', `
      <p>Tere ${rows[0].name},</p>
      <p>Sinu Salus kliendihaldussüsteemi sisselogimise link:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Link kehtib 24 tundi.</p>
    `);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Viga emaili saatmisel' });
  }
});

// POST /api/auth/set-password — uue parooli seadmine tokeniga
router.post('/set-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 8) {
    return res.status(400).json({ error: 'Parool peab olema vähemalt 8 tähemärki' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT * FROM password_tokens WHERE token=$1 AND used=FALSE AND expires_at > NOW()',
      [token]
    );
    if (!rows[0]) return res.status(400).json({ error: 'Link on aegunud või juba kasutatud' });
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, rows[0].user_id]);
    await pool.query('UPDATE password_tokens SET used=TRUE WHERE id=$1', [rows[0].id]);
    const { rows: userRows } = await pool.query('SELECT * FROM users WHERE id=$1', [rows[0].user_id]);
    res.json({ token: makeToken(userRows[0]) });
  } catch (e) {
    res.status(500).json({ error: 'Serveri viga' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT id,name,email,role,branch,phone,avatar_initials FROM users WHERE id=$1', [req.user.id]);
  res.json(rows[0]);
});

// PUT /api/auth/profile
router.put('/profile', requireAuth, async (req, res) => {
  const { name, phone, branch } = req.body;
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const { rows } = await pool.query(
    'UPDATE users SET name=$1, phone=$2, branch=$3, avatar_initials=$4 WHERE id=$5 RETURNING id,name,email,role,branch,phone,avatar_initials',
    [name, phone, branch, initials, req.user.id]
  );
  res.json(rows[0]);
});

// PUT /api/auth/change-password
router.put('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Uus parool peab olema vähemalt 8 tähemärki' });
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
  const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: 'Praegune parool on vale' });
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
  res.json({ ok: true });
});

// --- Admin: kasutajate haldus ---

// GET /api/auth/users
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const { rows } = await pool.query('SELECT id,name,email,role,branch,phone,avatar_initials,created_at,last_login FROM users ORDER BY name');
  res.json(rows);
});

// POST /api/auth/users — lisa uus kasutaja ja saada email
router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  const { name, email, role = 'therapist', branch } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Nimi ja email on kohustuslikud' });
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, role, branch, avatar_initials) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, email.toLowerCase(), role, branch, initials]
    );
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 päeva
    await pool.query('INSERT INTO password_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)', [rows[0].id, token, expires]);
    const link = `${process.env.APP_URL || 'http://localhost:5173'}/set-password?token=${token}`;
    await sendMail(email, 'Tere tulemast Salus kliendihaldussüsteemi!', `
      <p>Tere ${name},</p>
      <p>Sind on lisatud Salus kliendihaldussüsteemi kasutajaks.</p>
      <p>Loo endale parool, klikkides lingil:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Link kehtib 7 päeva.</p>
    `);
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'See email on juba kasutusel' });
    res.status(500).json({ error: 'Serveri viga' });
  }
});

// PUT /api/auth/users/:id
router.put('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { name, email, role, branch, phone } = req.body;
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const { rows } = await pool.query(
    'UPDATE users SET name=$1, email=$2, role=$3, branch=$4, phone=$5, avatar_initials=$6 WHERE id=$7 RETURNING id,name,email,role,branch,phone,avatar_initials',
    [name, email?.toLowerCase(), role, branch, phone, initials, req.params.id]
  );
  res.json(rows[0]);
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'Ei saa ennast kustutada' });
  await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

export default router;
