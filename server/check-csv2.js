import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const csvPath = process.argv[2];
if (!csvPath) { console.log('Kasutus: node check-csv2.js sagedused.csv'); process.exit(1); }

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
    } else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

const content = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '');
const lines = content.split(/\r?\n/);
const header = parseCSVLine(lines[0]).map(h => h.toLowerCase());
const idIdx = header.indexOf('id');
const nameIdx = header.indexOf('freq_name');

const idCount = {};
for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVLine(lines[i]);
  const id = cols[idIdx]?.trim();
  const name = cols[nameIdx]?.trim();
  if (!id || !name) continue;
  idCount[id] = (idCount[id] || 0) + 1;
}

const duplicates = Object.entries(idCount).filter(([, count]) => count > 1);
console.log(`Unikaalseid ID-sid: ${Object.keys(idCount).length}`);
console.log(`Duplikaate: ${duplicates.length}`);
if (duplicates.length > 0) {
  console.log('\nDuplikaatsed ID-d:');
  duplicates.forEach(([id, count]) => console.log(`  '${id}' — ${count} korda`));
}
process.exit(0);
