const express = require("express");
const { nanoid } = require("nanoid");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const { db } = require("../db");
const { authRequired, adminOnly } = require("../auth");
const { userCreateValidation, userEditValidation } = require("../validators");

const router = express.Router();

function normalizeDeptIds(input) {
  return Array.isArray(input) ? input : input ? [input] : [];
}

function genTempPassword() {
  // forte e simples de copiar
  return crypto.randomBytes(12).toString("base64url"); // ~16 chars
}

router.get("/admin/users", authRequired, adminOnly, async (req, res) => {
  await db.read();
  res.render("admin-users", {
    me: { isAdmin: true },
    users: db.data.users,
    depts: db.data.departments
  });
});

router.get("/admin/users/new", authRequired, adminOnly, async (req, res) => {
  await db.read();
  res.render("admin-user-form", {
    me: { isAdmin: true },
    user: null,
    depts: db.data.departments,
    errors: []
  });
});

router.post("/admin/users/new", authRequired, adminOnly, userCreateValidation, async (req, res) => {
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

  // ===== CPF único (somente EFETIVO) =====
  const type = req.body.type;
  const cpf = type === "EFETIVO" ? String(req.body.cpf || "").replace(/\D/g, "") : "";

  if (type === "EFETIVO") {
    const cpfExists = db.data.users.some(
      (u) => u.type === "EFETIVO" && String(u.cpf || "") === cpf
    );

    if (cpfExists) {
      return res.status(400).render("admin-user-form", {
        me: { isAdmin: true },
        user: null,
        depts: db.data.departments,
        errors: [{ msg: "CPF já cadastrado para outro usuário." }]
      });
    }
  }

  const deptIds = normalizeDeptIds(req.body.departmentIds);

  // SENHA: opcional no cadastro.
  // - Se vier preenchida: usa ela (>=6 validado pelo validator)
  // - Se vier vazia: gera uma senha temporária forte
  let plainPassword = String(req.body.password || "").trim();
  let tempPassword = null;

  if (!plainPassword) {
    tempPassword = genTempPassword();
    plainPassword = tempPassword;
  }

  const user = {
    id: nanoid(),
    name: req.body.name.trim(),
    email,
    type,
    cpf,
    isActive: req.body.isActive === "on",
    isAdmin: req.body.isAdmin === "on",
    departmentIds: deptIds,
    permissions: {
      PLEX: req.body.permPLEX === "on",
      GRD: req.body.permGRD === "on",
      UGB: req.body.permUGB === "on"
    },
    passwordHash: await bcrypt.hash(plainPassword, 10),

    // reset PJ (campos opcionais)
    resetCodeHash: null,
    resetCodeExpiresAt: null
  };

  db.data.users.push(user);
  await db.write();

  // Se foi gerada senha temporária, avisa admin (demo/prático)
  if (tempPassword) {
    return res.status(200).send(
      `Usuário criado.\nEmail: ${email}\nSenha temporária: ${tempPassword}\n\nRecomendação: peça para o usuário trocar via Reset de Senha.`
    );
  }

  return res.redirect("/admin/users");
});

router.get("/admin/users/:id/edit", authRequired, adminOnly, async (req, res) => {
  await db.read();
  const user = db.data.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).send("Usuário não encontrado.");
  res.render("admin-user-form", { me: { isAdmin: true }, user, depts: db.data.departments, errors: [] });
});

router.post("/admin/users/:id/edit", authRequired, adminOnly, userEditValidation, async (req, res) => {
  const errors = validationResult(req);
  await db.read();

  const user = db.data.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).send("Usuário não encontrado.");

  if (!errors.isEmpty()) {
    return res.status(400).render("admin-user-form", {
      me: { isAdmin: true },
      user,
      depts: db.data.departments,
      errors: errors.array()
    });
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

  // ===== CPF único (somente EFETIVO), ignorando o próprio =====
  const type = req.body.type;
  const cpf = type === "EFETIVO" ? String(req.body.cpf || "").replace(/\D/g, "") : "";

  if (type === "EFETIVO") {
    const cpfExists = db.data.users.some(
      (u) => u.id !== user.id && u.type === "EFETIVO" && String(u.cpf || "") === cpf
    );

    if (cpfExists) {
      return res.status(400).render("admin-user-form", {
        me: { isAdmin: true },
        user,
        depts: db.data.departments,
        errors: [{ msg: "CPF já cadastrado para outro usuário." }]
      });
    }
  }

  const deptIds = normalizeDeptIds(req.body.departmentIds);

  user.name = req.body.name.trim();
  user.email = email;
  user.type = type;
  user.cpf = cpf;
  user.isActive = req.body.isActive === "on";
  user.isAdmin = req.body.isAdmin === "on";
  user.departmentIds = deptIds;

  user.permissions = {
    PLEX: req.body.permPLEX === "on",
    GRD: req.body.permGRD === "on",
    UGB: req.body.permUGB === "on"
  };

  // troca senha só se vier preenchida (validator já garante >=6)
  const newPass = String(req.body.password || "").trim();
  if (newPass) {
    user.passwordHash = await bcrypt.hash(newPass, 10);
  }

  await db.write();
  res.redirect("/admin/users");
});

// ===== RESET PJ: gerar código seguro (admin-only) =====
// Admin gera um código temporário (expira em 15 min) e repassa pro PJ
router.post("/admin/users/:id/pj-reset-code", authRequired, adminOnly, async (req, res) => {
  await db.read();
  const user = db.data.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).send("Usuário não encontrado.");

  if (user.type !== "PJ") {
    return res.status(400).send("Código de reset é apenas para usuários PJ.");
  }

  // código não adivinhável
  const code = crypto.randomBytes(8).toString("base64url"); // ~11 chars
  user.resetCodeHash = await bcrypt.hash(code, 10);
  user.resetCodeExpiresAt = Date.now() + 15 * 60 * 1000; // 15 min

  await db.write();

  // Retorna em texto simples (pra demo). Admin copia e envia ao usuário.
  return res.status(200).send(
    `Código PJ gerado (expira em 15 min):\n\n${code}\n\nEmail: ${user.email}`
  );
});

module.exports = router;