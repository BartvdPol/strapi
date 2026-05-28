'use strict';
const Database = require('better-sqlite3');
const db = new Database('.tmp/data.db');

console.log('=== Temporal tables ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
  .filter(r => r.name.includes('temporal'));
console.log(tables);

console.log('\n=== temporal_link_types ===');
try { console.log(db.prepare('SELECT * FROM temporal_link_types').all()); }
catch(e) { console.log('ERR:', e.message); }

console.log('\n=== temporal_links (first 20) ===');
try { console.log(db.prepare('SELECT * FROM temporal_links LIMIT 20').all()); }
catch(e) { console.log('ERR:', e.message); }

db.close();
