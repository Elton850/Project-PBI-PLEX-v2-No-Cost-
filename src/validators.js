const { body } = require("express-validator");

function isValidCPF(cpf) {
  const digits = (cpf || "").replace(/\D/g, "");
  return digits.length === 11;
}

const baseUserValidation = [
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

// CREATE: senha pode vir vazia (vai gerar uma temporária no backend)
// Se vier preenchida, exige >= 6
const userCreateValidation = [
  ...baseUserValidation,
  body("password")
    .optional({ checkFalsy: true })
    .isLength({ min: 6 }).withMessage("Senha deve ter no mínimo 6 caracteres.")
];

// EDIT: senha é opcional; se preencher, exige >= 6
const userEditValidation = [
  ...baseUserValidation,
  body("password")
    .optional({ checkFalsy: true })
    .isLength({ min: 6 }).withMessage("Senha deve ter no mínimo 6 caracteres.")
];

const deptValidation = [
  body("name").trim().isLength({ min: 2 }).withMessage("Nome inválido."),

  body("plexUrl")
    .optional({ checkFalsy: true })
    .isURL().withMessage("Link PLEX inválido."),

  body("grdUrl")
    .optional({ checkFalsy: true })
    .isURL().withMessage("Link GRD inválido."),

  body("ugbUrl")
    .optional({ checkFalsy: true })
    .isURL().withMessage("Link UGB inválido.")
];

module.exports = { userCreateValidation, userEditValidation, deptValidation };