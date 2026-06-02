// Laiendab frequencies.id veeru VARCHAR(20) -> VARCHAR(100)
// ja frequency_category_map viiteveeru samuti
import { pool } from './db/database.js';
import dotenv from 'dotenv';
dotenv.config();

console.log('Laiendame ID veerusid...');

await pool.query(`
  ALTER TABLE frequency_category_map DROP CONSTRAINT IF EXISTS frequency_category_map_frequency_id_fkey;
  ALTER TABLE session_entries DROP CONSTRAINT IF EXISTS session_entries_frequency_id_fkey;
  
  ALTER TABLE frequencies ALTER COLUMN id TYPE VARCHAR(100);
  ALTER TABLE frequency_category_map ALTER COLUMN frequency_id TYPE VARCHAR(100);
  ALTER TABLE session_entries ALTER COLUMN frequency_id TYPE VARCHAR(100);
  
  ALTER TABLE frequency_category_map ADD CONSTRAINT frequency_category_map_frequency_id_fkey 
    FOREIGN KEY (frequency_id) REFERENCES frequencies(id) ON DELETE CASCADE;
  ALTER TABLE session_entries ADD CONSTRAINT session_entries_frequency_id_fkey
    FOREIGN KEY (frequency_id) REFERENCES frequencies(id) ON DELETE CASCADE;
`);

console.log('✓ ID veerud laiendatud VARCHAR(100)-le');
process.exit(0);
