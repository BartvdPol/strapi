'use strict';
const Database = require('better-sqlite3');
const db = new Database('.tmp/data.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('All tables:', tables.map(r => r.name));
db.close();
