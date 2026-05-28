const Database = require('better-sqlite3');
const db = new Database('.tmp/data.db', { readonly: true });
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'admin_%' ORDER BY name").all();
  console.log('admin tables', JSON.stringify(tables));
  const users = db.prepare("SELECT id, email, firstname, lastname, is_active, blocked FROM admin_users ORDER BY id").all();
  console.log('admin users', JSON.stringify(users));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
