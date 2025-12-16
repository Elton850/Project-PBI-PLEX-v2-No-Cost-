const { body } = require("express-validator");

function isValidCPF(cpf) {
  // validação simples: apenas 11 dígitos (para demo). Se quiser, dá pra implementar CPF completo.
  const digits = (cpf || "").replace(/\D/g, "");
  return digits.length === 11;
}

const userValidation = [
  body("name").trim().isLength({ min: 2 }).withMessage("Nome inválido."),
  body("email").trim().isEmail().withMessage("Email inválido."),
  body("type").isIn(["EFETIVO", "PJ"]).withMessage("Tipo inválido."),
  body("cpf").custom((value, { req }) => {
    if (req.body.type === "EFETIVO") {
      if (!value || !isValidCPF(value)) throw new Error("CPF obrigatório (11 dígitos) para EFETIVO.");
    }
    return true;
  }),
  body("isActive").optional().isIn(["on", "off", "true", "false"]),
  body("isAdmin").optional().isIn(["on", "off", "true", "false"])
];

const deptValidation = [
  body("name").trim().isLength({ min: 2 }).withMessage("Nome inválido."),
  body("plexUrl").trim().isURL().withMessage("Link PLEX inválido."),
  body("grdUrl").trim().isURL().withMessage("Link GRD inválido."),
  body("ugbUrl").trim().isURL().withMessage("Link UGB inválido.")
];

module.exports = { userValidation, deptValidation };