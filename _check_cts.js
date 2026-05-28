'use strict';
const Database = require('better-sqlite3');
const db = new Database('.tmp/data.db');

// Check all content manager config keys to find what content types strapi knows about
const allKeys = db.prepare(
  "SELECT key FROM strapi_core_store_settings WHERE key LIKE 'plugin_content_manager%'"
).all().map(r => r.key);
console.log('Known content types in content manager:');
allKeys.forEach(k => console.log(' ', k));
db.close();
