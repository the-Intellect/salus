// Käivita: node bump-font-sizes.js
// See tõstab kõik alla 15px font-size väärtused 2px võrra

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const ROOT = './src';

function getAllCssFiles(dir) {
  const files = [];
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) {
      files.push(...getAllCssFiles(full));
    } else if (extname(f) === '.css') {
      files.push(full);
    }
  }
  return files;
}

const cssFiles = getAllCssFiles(ROOT);
let totalChanges = 0;

for (const file of cssFiles) {
  const original = readFileSync(file, 'utf-8');
  const updated = original.replace(/font-size:\s*(\d+)px/g, (match, px) => {
    const size = parseInt(px);
    if (size < 15) {
      totalChanges++;
      return `font-size: ${size + 2}px`;
    }
    return match;
  });

  if (updated !== original) {
    writeFileSync(file, updated, 'utf-8');
    console.log(`✓ ${file}`);
  }
}

console.log(`\nKokku muudeti ${totalChanges} font-size väärtust.`);
