'use strict';
const Database = require('better-sqlite3');
const db = new Database('.tmp/data.db');

function inferIdColumns(tableName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all().map((c) => c.name);
  return columns.filter((name) => name.endsWith('_id') && name !== 'id');
}

console.log('=== Temporal tables ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
  .filter(r => r.name.includes('temporal'));
console.log(tables);

const linkTables = tables
  .map((r) => r.name)
  .filter((name) => name.startsWith('temporal_links_'))
  .sort();

console.log('\n=== table-backed link types ===');
if (linkTables.length === 0) {
  console.log('No temporal_links_* tables found.');
} else {
  for (const tableName of linkTables) {
    const idColumns = inferIdColumns(tableName);
    const sourceKey = idColumns[0] || 'source_id';
    const targetKey = idColumns[1] || 'target_id';
    const typeName = tableName.replace('temporal_links_', '');
    console.log(`- ${typeName}: table=${tableName}, sourceKey=${sourceKey}, targetKey=${targetKey}`);
  }
}

for (const tableName of linkTables) {
  console.log(`\n=== ${tableName} (first 20) ===`);
  try {
    console.log(db.prepare(`SELECT * FROM ${tableName} ORDER BY start_date ASC LIMIT 20`).all());
  } catch (e) {
    console.log('ERR:', e.message);
  }
}

console.log('\n=== legacy temporal tables (optional) ===');
try {
  const hasLegacyTypes = db.prepare("SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name='temporal_link_types'").get().c > 0;
  const hasLegacyLinks = db.prepare("SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name='temporal_links'").get().c > 0;

  if (hasLegacyTypes) {
    console.log('temporal_link_types:', db.prepare('SELECT * FROM temporal_link_types').all());
  } else {
    console.log('temporal_link_types: not present');
  }

  if (hasLegacyLinks) {
    console.log('temporal_links (first 20):', db.prepare('SELECT * FROM temporal_links LIMIT 20').all());
  } else {
    console.log('temporal_links: not present');
  }
} catch (e) {
  console.log('ERR:', e.message);
}

db.close();
