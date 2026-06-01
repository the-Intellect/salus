import fs from 'fs';
import { pool } from './db/database.js';
import dotenv from 'dotenv';
dotenv.config();

const csvPath = process.argv[2];
if (!csvPath) {
  console.log('Kasutus: node import-frequencies.js sagedused.csv');
  process.exit(1);
}

// Parsi CSV rida arvestades jutumärke
function parseCSVLine(line, delimiter = ';') {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') {
        current += '"'; i++; // escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

const content = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '');
const lines = content.split(/\r?\n/);

const header = parseCSVLine(lines[0]).map(h => h.toLowerCase());
const idIdx = header.indexOf('id');
const nameIdx = header.indexOf('freq_name');
const descIdx = header.indexOf('description');
const catIdx = header.indexOf('category');

console.log(`Päis: id=${idIdx}, freq_name=${nameIdx}, description=${descIdx}, category=${catIdx}`);

// Uuenda tabelid
await pool.query(`
  CREATE TABLE IF NOT EXISTS frequency_categories (
    id SERIAL PRIMARY KEY,
    label_en VARCHAR(300) NOT NULL,
    label_et VARCHAR(300),
    UNIQUE(label_en)
  );
  CREATE TABLE IF NOT EXISTS frequencies (
    id VARCHAR(20) PRIMARY KEY,
    freq_name VARCHAR(500) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS frequency_category_map (
    frequency_id VARCHAR(20) REFERENCES frequencies(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES frequency_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (frequency_id, category_id)
  );
`);

// Tühjenda vana andmed
console.log('Tühjandan vanad andmed...');
await pool.query('DELETE FROM frequency_category_map');
await pool.query('DELETE FROM frequency_categories');
await pool.query('DELETE FROM frequencies');

let imported = 0;
let skipped = 0;
let catCache = {};

for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVLine(lines[i]);
  const id = cols[idIdx]?.trim();
  const name = cols[nameIdx]?.trim();
  const desc = cols[descIdx]?.trim();
  const catRaw = cols[catIdx]?.trim();

  if (!id || !name) { skipped++; continue; }

  await pool.query(`
    INSERT INTO frequencies (id, freq_name, description)
    VALUES ($1, $2, $3)
    ON CONFLICT (id) DO UPDATE SET freq_name=$2, description=$3, updated_at=NOW()
  `, [id, name, desc || '']);

  if (catRaw) {
    // Semikoolon on kategooriate eraldaja
    const cats = catRaw.split(';').map(c => c.trim()).filter(Boolean);
    for (const cat of cats) {
      const parts = cat.split('/').map(p => p.trim());
      const labelEn = parts[0]?.slice(0, 299) || cat.slice(0, 299);
      const labelEt = parts[1]?.slice(0, 299) || null;

      if (!catCache[labelEn]) {
        const { rows } = await pool.query(`
          INSERT INTO frequency_categories (label_en, label_et)
          VALUES ($1, $2)
          ON CONFLICT (label_en) DO UPDATE SET label_et=$2
          RETURNING id
        `, [labelEn, labelEt]);
        catCache[labelEn] = rows[0].id;
      }

      await pool.query(`
        INSERT INTO frequency_category_map (frequency_id, category_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [id, catCache[labelEn]]);
    }
  }

  imported++;
  if (imported % 50 === 0) console.log(`  ${imported} sagedust imporditud...`);
}

const { rows: freqCount } = await pool.query('SELECT COUNT(*) FROM frequencies');
const { rows: catCount } = await pool.query('SELECT COUNT(*) FROM frequency_categories');

console.log(`\n✓ Import valmis!`);
console.log(`  Sagedusi: ${freqCount[0].count}`);
console.log(`  Kategooriaid: ${catCount[0].count}`);
console.log(`  Vahele jäetud (tühjad read): ${skipped}`);
process.exit(0);
