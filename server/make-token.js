import { pool } from './db/database.js';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const email = process.argv[2];
if (!email) { console.log('Kasutus: node make-token.js email@aadress.ee'); process.exit(1); }

const token = crypto.randomBytes(32).toString('hex');
const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const { rows } = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
if (!rows[0]) { console.log('Kasutajat ei leitud:', email); process.exit(1); }

await pool.query(
  'INSERT INTO password_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
  [rows[0].id, token, expires]
);

console.log('\nAva see link brauseris:');
console.log('http://localhost:5173/set-password?token=' + token);
console.log('\nLink kehtib 7 päeva.');
process.exit(0);
