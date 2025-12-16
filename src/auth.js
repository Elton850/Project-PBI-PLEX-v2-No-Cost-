const jwt = require("jsonwebtoken");

const COOKIE_NAME = process.env.COOKIE_NAME || "portal_token";

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h"
  });
}

function authRequired(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.redirect("/login");

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (e) {
    res.clearCookie(COOKIE_NAME);
    return res.redirect("/login");
  }
}

function adminOnly(req, res, next) {
  if (req.user?.isAdmin) return next();
  return res.status(403).send("Acesso negado.");
}

function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,          // Render + https => true em produção
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

module.exports = { signToken, authRequired, adminOnly, setAuthCookie, clearAuthCookie };