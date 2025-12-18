const express = require("express");
const { db } = require("../db");
const { authRequired } = require("../auth");

const router = express.Router();

const ALLOWED = new Set(["PLEX", "GRD", "UGB"]);

router.get("/embed/:module", authRequired, async (req, res) => {
  try {
    const module = String(req.params.module || "").toUpperCase();
    const deptId = String(req.query.deptId || "");

    if (!ALLOWED.has(module)) return res.status(400).send("Módulo inválido.");

    await db.read();
    const me = db.data.users.find((u) => u.id === req.user.id);
    if (!me) return res.status(401).send("Não autenticado.");
    if (!me.isActive) return res.status(403).send("Usuário inativo.");
    if (!me.permissions?.[module]) return res.status(403).send("Sem permissão.");

    const myDeptIds = (me.departmentIds || []).map(String);
    if (!deptId || !myDeptIds.includes(deptId)) return res.status(403).send("Departamento inválido.");

    const dept = db.data.departments.find((d) => String(d.id) === deptId);
    if (!dept) return res.status(404).send("Departamento não encontrado.");

    let url = "";
    if (module === "PLEX") url = (dept.plexUrl || "").trim();
    if (module === "GRD") url = (dept.grdUrl || "").trim();
    if (module === "UGB") url = (dept.ugbUrl || "").trim();

    if (!url) return res.status(404).send("Link não configurado para este relatório.");

    return res.redirect(302, url);
  } catch (err) {
    console.error("EMBED ERROR:", err);
    return res.status(500).send("Erro interno.");
  }
});

module.exports = router;