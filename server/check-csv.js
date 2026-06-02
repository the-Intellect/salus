import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const csvPath = process.argv[2];
if (!csvPath) { console.log('Kasutus: node check-csv.js sagedused.csv'); process.exit(1); }

function parseCSVLine(line, delimiter = ';') {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
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

console.log(`Ridu kokku: ${lines.length}`);
console.log(`\nVahele jäetud read (id või nimi puudub):\n`);

let count = 0;
for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVLine(lines[i]);
  const id = cols[idIdx]?.trim();
  const name = cols[nameIdx]?.trim();
  if (!id || !name) {
    count++;
    console.log(`Rida ${i+1}: id='${id}' | name='${name?.slice(0,40)}'`);
  }
}
console.log(`\nKokku vahele jäetud: ${count}`);
process.exit(0);
