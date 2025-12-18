const express = require("express");
const { db } = require("../db");
const { authRequired } = require("../auth");

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  await db.read();

  const me = db.data.users.find((u) => u.id === req.user.id);
  if (!me) return res.redirect("/login");

  // Departamentos permitidos ao usuário
  const allowedDepts = (me.departmentIds || [])
    .map((id) => db.data.departments.find((d) => String(d.id) === String(id)))
    .filter(Boolean);

  const module = ["PLEX", "GRD", "UGB"].includes(req.query.module)
    ? req.query.module
    : "PLEX";

  const deptId = req.query.deptId || allowedDepts?.[0]?.id;

  const currentDept =
    allowedDepts.find((d) => String(d.id) === String(deptId)) ||
    allowedDepts?.[0] ||
    null;

  const canView = me.permissions?.[module] === true;

  // ===== NOVO: checar se o departamento tem link real =====
  let iframeUrl = null;
  let hasReportLink = false;

  if (currentDept && canView) {
    const link =
      module === "PLEX" ? (currentDept.plexUrl || "").trim() :
      module === "GRD"  ? (currentDept.grdUrl  || "").trim() :
      module === "UGB"  ? (currentDept.ugbUrl  || "").trim() :
      "";

    hasReportLink = Boolean(link);

    if (hasReportLink) {
      iframeUrl = `/embed/${module}?deptId=${encodeURIComponent(currentDept.id)}`;
    }
  }

  res.render("home", {
    me,
    module,
    allowedDepts,
    currentDept,
    canView,
    iframeUrl,
    hasReportLink
  });
});

module.exports = router;