'use strict';
const Database = require('better-sqlite3');
const db = new Database('.tmp/data.db');

// Check if the plugin is registered in core store
const settings = db.prepare(
  "SELECT * FROM strapi_core_store_settings WHERE key LIKE '%plugin%' OR key LIKE '%temporal%'"
).all();
console.log('Plugin-related core store entries:', settings.length);
settings.slice(0, 5).forEach(s => console.log(s.key, '->', s.value && s.value.slice(0, 80)));

db.close();
