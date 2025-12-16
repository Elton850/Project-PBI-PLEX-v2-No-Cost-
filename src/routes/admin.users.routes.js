const express = require("express");
const { nanoid } = require("nanoid");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const { db } = require("../db");
const { authRequired, adminOnly } = require("../auth");
const { userValidation } = require("../validators");

const router = express.Router();

router.get("/admin/users", authRequired, adminOnly, async (req, res) => {
  await db.read();
  res.render("admin-users", { me: { isAdmin: true }, users: db.data.users, depts: db.data.departments });
});

router.get("/admin/users/new", authRequired, adminOnly, async (req, res) => {
  await db.read();
  res.render("admin-user-form", { me: { isAdmin: true }, user: null, depts: db.data.departments, errors: [] });
});

router.post("/admin/users/new", authRequired, adminOnly, userValidation, async (req, res) => {
  const errors = validationResult(req);
  await db.read();

  if (!errors.isEmpty()) {
    return res.status(400).render("admin-user-form", {
      me: { isAdmin: true },
      user: null,
      depts: db.data.departments,
      errors: errors.array()
    });
  }

  const email = req.body.email.trim().toLowerCase();
  if (db.data.users.some((u) => u.email === email)) {
    return res.status(400).render("admin-user-form", {
      me: { isAdmin: true },
      user: null,
      depts: db.data.departments,
      errors: [{ msg: "Email já cadastrado." }]
    });
  }

  const password = req.body.password || "";
  if (password.length < 6) {
    return res.status(400).render("admin-user-form", {
      me: { isAdmin: true },
      user: null,
      depts: db.data.departments,
      errors: [{ msg: "Senha deve ter no mínimo 6 caracteres." }]
    });
  }

  const deptIds = Array.isArray(req.body.departmentIds)
    ? req.body.departmentIds
    : req.body.departmentIds ? [req.body.departmentIds] : [];

  const user = {
    id: nanoid(),
    name: req.body.name.trim(),
    email,
    type: req.body.type,
    cpf: req.body.type === "EFETIVO" ? (req.body.cpf || "").replace(/\D/g, "") : "",
    isActive: req.body.isActive === "on",
    isAdmin: req.body.isAdmin === "on",
    departmentIds: deptIds,
    permissions: {
      PLEX: req.body.permPLEX === "on",
      GRD: req.body.permGRD === "on",
      UGB: req.body.permUGB === "on"
    },
    passwordHash: await bcrypt.hash(password, 10)
  };

  db.data.users.push(user);
  await db.write();
  res.redirect("/admin/users");
});

router.get("/admin/users/:id/edit", authRequired, adminOnly, async (req, res) => {
  await db.read();
  const user = db.data.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).send("Usuário não encontrado.");
  res.render("admin-user-form", { me: { isAdmin: true }, user, depts: db.data.departments, errors: [] });
});

router.post("/admin/users/:id/edit", authRequired, adminOnly, userValidation, async (req, res) => {
  const errors = validationResult(req);
  await db.read();

  const user = db.data.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).send("Usuário não encontrado.");

  if (!errors.isEmpty()) {
    return res.status(400).render("admin-user-form", { me: { isAdmin: true }, user, depts: db.data.departments, errors: errors.array() });
  }

  const email = req.body.email.trim().toLowerCase();
  if (db.data.users.some((u) => u.email === email && u.id !== user.id)) {
    return res.status(400).render("admin-user-form", {
      me: { isAdmin: true },
      user,
      depts: db.data.departments,
      errors: [{ msg: "Email já cadastrado por outro usuário." }]
    });
  }

  const deptIds = Array.isArray(req.body.departmentIds)
    ? req.body.departmentIds
    : req.body.departmentIds ? [req.body.departmentIds] : [];

  user.name = req.body.name.trim();
  user.email = email;
  user.type = req.body.type;
  user.cpf = req.body.type === "EFETIVO" ? (req.body.cpf || "").replace(/\D/g, "") : "";
  user.isActive = req.body.isActive === "on";
  user.isAdmin = req.body.isAdmin === "on";
  user.departmentIds = deptIds;

  user.permissions = {
    PLEX: req.body.permPLEX === "on",
    GRD: req.body.permGRD === "on",
    UGB: req.body.permUGB === "on"
  };

  // troca senha só se vier preenchida
  if (req.body.password && req.body.password.length >= 6) {
    user.passwordHash = await bcrypt.hash(req.body.password, 10);
  }

  await db.write();
  res.redirect("/admin/users");
});

module.exports = router;
