const logger = require("../utils/logger");

async function processMessage(text) {
  logger.debug("Processing Messenger message with placeholder AI handler", {
    hasText: Boolean(text),
    textPreview: typeof text === "string" ? text.slice(0, 120) : "",
  });

  return "Thanks for your message!";
}

module.exports = {
  processMessage,
};
