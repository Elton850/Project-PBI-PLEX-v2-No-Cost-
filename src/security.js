const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

function security(app) {
  const isProd = process.env.NODE_ENV === "production";
  const disableHelmet = String(process.env.DISABLE_HELMET || "").toLowerCase() === "true";

  // Helmet (um único app.use)
  if (!disableHelmet) {
    app.use(
      helmet({
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            defaultSrc: ["'self'"],

            frameSrc: [
              "'self'",
              "https://app.powerbi.com",
              "https://*.powerbi.com",
              "https://login.microsoftonline.com",
              "https://*.microsoftonline.com",
              "https://*.msauth.net",
              "https://*.msftauth.net"
            ],

            scriptSrc: [
              "'self'",
              "'unsafe-inline'",
              "'unsafe-eval'",
              "https://app.powerbi.com",
              "https://*.powerbi.com",
              "https://login.microsoftonline.com",
              "https://*.microsoftonline.com",
              "https://*.msauth.net",
              "https://*.msftauth.net"
            ],

            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],

            connectSrc: [
              "'self'",
              "https://app.powerbi.com",
              "https://*.powerbi.com",
              "https://login.microsoftonline.com",
              "https://*.microsoftonline.com",
              "https://*.msauth.net",
              "https://*.msftauth.net",
              "https://*.windows.net"
            ],

            fontSrc: ["'self'", "data:", "https:"],
            workerSrc: ["'self'", "blob:"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
          }
        },

        // necessário pro fluxo de auth do Power BI (popups)
        crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },

        // necessário para embeds externos
        crossOriginEmbedderPolicy: false
      })
    );
  }

  // Rate limit (mantém; pode desligar no dev se quiser)
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: isProd ? 200 : 2000,
      standardHeaders: true,
      legacyHeaders: false
    })
  );
}

module.exports = { security };