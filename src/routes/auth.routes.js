const express = require("express");
const bcrypt = require("bcryptjs");
const { db } = require("../db");
const { signToken, setAuthCookie, clearAuthCookie } = require("../auth");
const rateLimit = require("express-rate-limit");

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

module.exports = router;