'use strict';
const Database = require('better-sqlite3');
const db = new Database('.tmp/data.db');
const tableNames = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map((r) => r.name);
const temporalTables = tableNames.filter((name) => name.includes('temporal'));
const linkTables = tableNames.filter((name) => name.startsWith('temporal_links_'));

console.log('All tables:', tableNames);
console.log('\nTemporal tables:', temporalTables);
console.log(`\nTable-backed link tables (${linkTables.length}):`, linkTables);
db.close();
