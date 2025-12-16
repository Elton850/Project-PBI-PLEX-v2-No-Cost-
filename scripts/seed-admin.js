require("dotenv").config();
const bcrypt = require("bcryptjs");
const { nanoid } = require("nanoid");
const { db, initDb } = require("../src/db");

(async () => {
  await initDb();
  await db.read();

  const email = "admin@bnel.com.br";
  const exists = db.data.users.some((u) => u.email === email);
  if (exists) {
    console.log("Admin já existe.");
    process.exit(0);
  }

  db.data.users.push({
    id: nanoid(),
    name: "Admin",
    email,
    type: "PJ",
    cpf: "",
    isActive: true,
    isAdmin: true,
    departmentIds: [],
    permissions: { PLEX: true, GRD: true, UGB: true },
    passwordHash: await bcrypt.hash("Admin@123", 10)
  });

  await db.write();
  console.log("Admin criado: admin@empresa.com / Admin@123");
  process.exit(0);
})();
