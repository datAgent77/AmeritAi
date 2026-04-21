const { randomUUID } = require("crypto");

const dotenv = require("dotenv");
const express = require("express");

dotenv.config();

const webhookRouter = require("./routes/webhook");
const { sendMessage } = require("./services/messenger");
const logger = require("./utils/logger");

const app = express();
const port = Number(process.env.PORT) || 3001;

function createRequestLogger() {
  return (req, res, next) => {
    const incomingRequestId = req.headers["x-request-id"];
    const requestId = Array.isArray(incomingRequestId)
      ? incomingRequestId[0]
      : incomingRequestId || randomUUID();
    const startedAt = Date.now();

    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);

    res.on("finish", () => {
      logger.info("HTTP request completed", {
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });

    next();
  };
}

function validateConfiguration() {
  const missing = ["PAGE_ACCESS_TOKEN", "VERIFY_TOKEN"].filter((key) => !process.env[key]);

  if (!missing.length) {
    logger.info("Messenger configuration loaded", {
      port,
      apiVersion: process.env.MESSENGER_API_VERSION || "v19.0",
    });
    return;
  }

  logger.warn("Messenger configuration is incomplete", {
    missingVariables: missing,
    port,
  });
}

app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(express.json({ limit: "1mb" }));
app.use(createRequestLogger());

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "facebook-messenger-webhook",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

app.use(webhookRouter);

app.post("/test-send", async (req, res, next) => {
  try {
    const { psid, message } = req.body || {};

    if (!psid || !message) {
      return res.status(400).json({
        error: "Both psid and message are required.",
        requestId: req.requestId,
      });
    }

    const response = await sendMessage(psid, message);

    return res.status(200).json({
      success: true,
      requestId: req.requestId,
      data: response,
    });
  } catch (error) {
    return next(error);
  }
});

app.use((error, req, res, next) => {
  logger.error("Unhandled application error", {
    requestId: req && req.requestId,
    error,
  });

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    error: "Internal Server Error",
    requestId: req && req.requestId,
  });
});

let server;

function startServer() {
  validateConfiguration();

  server = app.listen(port, () => {
    logger.info("Messenger server listening", {
      port,
      environment: process.env.NODE_ENV || "development",
    });
  });

  return server;
}

function shutdown(signal) {
  if (!server) {
    process.exit(0);
  }

  logger.info("Shutting down Messenger server", { signal });

  server.close((error) => {
    if (error) {
      logger.error("Error while closing Messenger server", { signal, error });
      process.exit(1);
    }

    process.exit(0);
  });
}

if (require.main === module) {
  startServer();

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

module.exports = {
  app,
  startServer,
};
