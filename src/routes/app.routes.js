const express = require("express");
const { db } = require("../db");
const { authRequired } = require("../auth");

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  await db.read();
  const me = db.data.users.find((u) => u.id === req.user.id);
  if (!me) return res.redirect("/login");

  const allowedDepts = (me.departmentIds || [])
    .map((id) => db.data.departments.find((d) => d.id === id))
    .filter(Boolean);

  const module = ["PLEX", "GRD", "UGB"].includes(req.query.module) ? req.query.module : "PLEX";
  const deptId = req.query.deptId || allowedDepts?.[0]?.id;

  const currentDept = allowedDepts.find((d) => d.id === deptId) || allowedDepts?.[0] || null;

  const canView = me.permissions?.[module] === true;

  let iframeUrl = null;
  if (currentDept && canView) {
    if (module === "PLEX") iframeUrl = currentDept.plexUrl;
    if (module === "GRD") iframeUrl = currentDept.grdUrl;
    if (module === "UGB") iframeUrl = currentDept.ugbUrl;
  }

  res.render("home", {
    me,
    module,
    allowedDepts,
    currentDept,
    iframeUrl,
    canView
  });
});

module.exports = router;
