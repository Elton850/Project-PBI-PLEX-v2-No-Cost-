const helmet = require("helmet");

function security(app) {
  app.use(helmet());
}

module.exports = { security };