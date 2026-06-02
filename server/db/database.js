import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        phone VARCHAR(50),
        branch VARCHAR(50),
        role VARCHAR(20) DEFAULT 'therapist',
        avatar_initials VARCHAR(5),
        created_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS password_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        dob VARCHAR(20),
        gender VARCHAR(20),
        email VARCHAR(100),
        phone VARCHAR(50),
        branch VARCHAR(50),
        reason TEXT,
        source VARCHAR(100),
        therapist_id INTEGER REFERENCES users(id),
        notes TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notes_history (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        saved_at TIMESTAMP DEFAULT NOW(),
        saved_by INTEGER REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        therapist_id INTEGER REFERENCES users(id),
        date DATE DEFAULT CURRENT_DATE,
        notes TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS session_entries (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
        frequency_id VARCHAR(20) NOT NULL,
        frequency_name VARCHAR(200) NOT NULL,
        frequency_description TEXT,
        initial_result INTEGER,
        minute_results INTEGER[],
        final_result INTEGER,
        sort_order INTEGER DEFAULT 0
      );
    `);

    const { rows } = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(rows[0].count) === 0) {
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.default.hash('admin123', 10);
      await client.query(
        'INSERT INTO users (name, email, password_hash, role, branch, avatar_initials) VALUES ($1,$2,$3,$4,$5,$6)',
        ['Admin', 'admin@salus.ee', hash, 'admin', 'Tallinn', 'AD']
      );
      console.log('Admin konto loodud: admin@salus.ee / admin123');
    }
    await runMigrations(client);
    await addDurationColumn(client);
    console.log('Andmebaas initsialiseeritud');
  } finally {
    client.release();
  }
}

export async function runMigrations(client) {
  await client.query(`
    ALTER TABLE IF EXISTS frequencies ADD COLUMN IF NOT EXISTS description_en TEXT;
    ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'et';
  `);
}

export async function addDurationColumn(client) {
  await client.query(`
    ALTER TABLE IF EXISTS sessions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;
  `);
}
