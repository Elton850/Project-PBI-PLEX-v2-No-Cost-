const express = require("express");
const { nanoid } = require("nanoid");
const { validationResult } = require("express-validator");
const { db } = require("../db");
const { authRequired, adminOnly } = require("../auth");
const { deptValidation } = require("../validators");

const router = express.Router();

router.get("/admin/departments", authRequired, adminOnly, async (req, res) => {
  await db.read();
  res.render("admin-depts", { me: { isAdmin: true }, depts: db.data.departments });
});

router.get("/admin/departments/new", authRequired, adminOnly, (req, res) => {
  res.render("admin-dept-form", { me: { isAdmin: true }, dept: null, errors: [] });
});

router.post("/admin/departments/new", authRequired, adminOnly, deptValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render("admin-dept-form", { me: { isAdmin: true }, dept: null, errors: errors.array() });
  }

  const dept = {
    id: nanoid(),
    name: req.body.name.trim(),
    plexUrl: req.body.plexUrl.trim(),
    grdUrl: req.body.grdUrl.trim(),
    ugbUrl: req.body.ugbUrl.trim()
  };

  await db.read();
  db.data.departments.push(dept);
  await db.write();

  res.redirect("/admin/departments");
});

router.get("/admin/departments/:id/edit", authRequired, adminOnly, async (req, res) => {
  await db.read();
  const dept = db.data.departments.find((d) => d.id === req.params.id);
  if (!dept) return res.status(404).send("Departamento não encontrado.");
  res.render("admin-dept-form", { me: { isAdmin: true }, dept, errors: [] });
});

router.post("/admin/departments/:id/edit", authRequired, adminOnly, deptValidation, async (req, res) => {
  const errors = validationResult(req);
  await db.read();
  const dept = db.data.departments.find((d) => d.id === req.params.id);
  if (!dept) return res.status(404).send("Departamento não encontrado.");

  if (!errors.isEmpty()) {
    return res.status(400).render("admin-dept-form", { me: { isAdmin: true }, dept, errors: errors.array() });
  }

  dept.name = req.body.name.trim();
  dept.plexUrl = (req.body.plexUrl || "").trim();
  dept.grdUrl  = (req.body.grdUrl  || "").trim();
  dept.ugbUrl  = (req.body.ugbUrl  || "").trim();

  await db.write();
  res.redirect("/admin/departments");
});

router.post("/admin/departments/:id/delete", authRequired, adminOnly, async (req, res) => {
  await db.read();
  const id = req.params.id;

  db.data.departments = db.data.departments.filter((d) => d.id !== id);

  // remove deptId dos usuários
  db.data.users.forEach((u) => {
    u.departmentIds = (u.departmentIds || []).filter((x) => x !== id);
  });

  await db.write();
  res.redirect("/admin/departments");
});

module.exports = router;
