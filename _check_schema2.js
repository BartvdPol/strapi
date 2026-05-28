'use strict';
const Database = require('better-sqlite3');
const db = new Database('.tmp/data.db');

const row = db.prepare("SELECT * FROM strapi_database_schema LIMIT 1").get();
const schema = JSON.parse(row.schema);
const tables = schema.tables.map(t => t.name).sort();
console.log('All tables in schema:', JSON.stringify(tables, null, 2));
db.close();
