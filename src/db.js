const path = require("path");
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const file = path.join(process.cwd(), "db", "database.json");
const adapter = new JSONFile(file);
const db = new Low(adapter, { users: [], departments: [] });

async function initDb() {
  await db.read();
  db.data ||= { users: [], departments: [] };
  await db.write();
}

module.exports = { db, initDb };
