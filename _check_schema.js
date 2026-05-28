'use strict';
const Database = require('better-sqlite3');
const db = new Database('.tmp/data.db');

// Check what Strapi thinks is in its schema
const schema = db.prepare("SELECT * FROM strapi_database_schema").all();
const parsed = schema.map(r => {
  try { return { ...r, schema: JSON.parse(r.schema) }; } catch { return r; }
});
const tables = parsed[0] && parsed[0].schema && parsed[0].schema.tables
  ? parsed[0].schema.tables.filter(t => t.name && t.name.includes('temporal')).map(t => t.name)
  : [];
console.log('Temporal tables in DB schema:', tables);

const linkTables = tables.filter((name) => name.startsWith('temporal_links_')).sort();
console.log('Table-backed link tables in schema:', linkTables);

// Check strapi_migrations_internal for plugin
const migrations = db.prepare("SELECT * FROM strapi_migrations_internal WHERE name LIKE '%temporal%'").all();
console.log('Temporal migrations:', migrations);

db.close();
