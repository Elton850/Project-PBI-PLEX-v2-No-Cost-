require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");

const { initDb } = require("./src/db");
const { security } = require("./src/security");

const authRoutes = require("./src/routes/auth.routes");
const appRoutes = require("./src/routes/app.routes");
const adminUsersRoutes = require("./src/routes/admin.users.routes");
const adminDeptsRoutes = require("./src/routes/admin.depts.routes");
const embedRoutes = require("./src/routes/embed.routes");

async function main() {
  await initDb();

  const app = express();
  security(app);

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "src", "views"));

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use("/public", express.static(path.join(__dirname, "src", "public")));

  app.use(authRoutes);
  app.use(appRoutes);
  app.use(adminUsersRoutes);
  app.use(adminDeptsRoutes);
  app.use(embedRoutes);

  app.use((req, res) => {
    return res.status(404).render("404", { path: req.originalUrl });
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server on :${port}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});