const express = require("express");
const bcrypt = require("bcryptjs");
const { db } = require("../db");
const { signToken, setAuthCookie, clearAuthCookie } = require("../auth");
const rateLimit = require("express-rate-limit");
const { signResetToken, verifyResetToken } = require("../auth");

const router = express.Router();

router.get("/login", (req, res) => res.render("login", { error: null }));

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  await db.read();
  const user = db.data.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());

  if (!user) return res.status(401).render("login", { error: "Credenciais inválidas." });
  if (!user.isActive) return res.status(403).render("login", { error: "Usuário inativo." });

  const ok = await bcrypt.compare(password || "", user.passwordHash);
  if (!ok) return res.status(401).render("login", { error: "Credenciais inválidas." });

  const token = signToken({ id: user.id, isAdmin: !!user.isAdmin });
  setAuthCookie(res, token);
  return res.redirect("/");
});

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.redirect("/login");
});

// Tela: pedir reset
router.get("/forgot-password", (req, res) => {
  res.render("forgot-password", { error: null });
});

// Validar email + cpf e gerar token de reset
router.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const cpf = String(req.body.cpf || "").replace(/\D/g, "");

    await db.read();
    const user = db.data.users.find((u) => u.email.toLowerCase() === email);

    // Evita detalhe excessivo. Mas para demo, vamos ser práticos:
    if (!user) return res.status(400).render("forgot-password", { error: "Dados inválidos." });
    if (!user.isActive) return res.status(400).render("forgot-password", { error: "Usuário inativo." });

    // Regra: se tiver CPF cadastrado, tem que bater
    const hasCpf = !!(user.cpf && String(user.cpf).length === 11);
    if (hasCpf && cpf !== user.cpf) {
      return res.status(400).render("forgot-password", { error: "Dados inválidos." });
    }

    const token = signResetToken(user.id);
    return res.redirect(`/reset-password?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error("FORGOT ERROR:", err);
    return res.status(500).render("forgot-password", { error: "Erro interno." });
  }
});

// Tela: nova senha
router.get("/reset-password", async (req, res) => {
  try {
    const token = String(req.query.token || "");
    verifyResetToken(token);
    return res.render("reset-password", { error: null, token });
  } catch (err) {
    return res.status(400).render("reset-password", { error: "Token inválido ou expirado.", token: "" });
  }
});

// Trocar senha
router.post("/reset-password", async (req, res) => {
  try {
    const token = String(req.body.token || "");
    const password = String(req.body.password || "");
    const confirm = String(req.body.confirm || "");

    if (password.length < 6) {
      return res.status(400).render("reset-password", { error: "Senha deve ter no mínimo 6 caracteres.", token });
    }
    if (password !== confirm) {
      return res.status(400).render("reset-password", { error: "Senhas não conferem.", token });
    }

    const payload = verifyResetToken(token);

    await db.read();
    const user = db.data.users.find((u) => u.id === payload.id);
    if (!user) return res.status(400).render("reset-password", { error: "Token inválido.", token: "" });

    user.passwordHash = await bcrypt.hash(password, 10);
    await db.write();

    return res.redirect("/login");
  } catch (err) {
    console.error("RESET ERROR:", err);
    return res.status(400).render("reset-password", { error: "Token inválido ou expirado.", token: "" });
  }
});

module.exports = router;