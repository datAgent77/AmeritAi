const axios = require("axios");

const logger = require("../utils/logger");

const GRAPH_BASE_URL = "https://graph.facebook.com";
const DEFAULT_API_VERSION = process.env.MESSENGER_API_VERSION || "v19.0";

function createMessengerApiUrl(pathname) {
  return `${GRAPH_BASE_URL}/${process.env.MESSENGER_API_VERSION || DEFAULT_API_VERSION}${pathname}`;
}

function truncateText(value, maxLength = 160) {
  if (typeof value !== "string") {
    return "";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function extractMessageText(message) {
  if (!message || typeof message !== "object") {
    return "";
  }

  if (typeof message.text === "string" && message.text.trim()) {
    return message.text.trim();
  }

  const attachments = Array.isArray(message.attachments) ? message.attachments : [];

  if (!attachments.length) {
    return "";
  }

  const attachmentTypes = attachments
    .map((attachment) => attachment && attachment.type)
    .filter(Boolean);

  if (!attachmentTypes.length) {
    return "[attachment]";
  }

  return `[attachment:${attachmentTypes.join(",")}]`;
}

function validateOutgoingMessage(psid, text) {
  if (!psid || typeof psid !== "string" || !psid.trim()) {
    throw new Error("A valid Messenger PSID is required.");
  }

  if (!text || typeof text !== "string" || !text.trim()) {
    throw new Error("A non-empty reply message is required.");
  }

  if (!process.env.PAGE_ACCESS_TOKEN) {
    throw new Error("PAGE_ACCESS_TOKEN is not configured.");
  }
}

async function sendMessage(psid, text) {
  validateOutgoingMessage(psid, text);
  const sanitizedPsid = psid.trim();
  const sanitizedText = text.trim();

  const payload = {
    recipient: { id: sanitizedPsid },
    message: { text: sanitizedText },
  };

  try {
    const response = await axios.post(createMessengerApiUrl("/me/messages"), payload, {
      params: {
        access_token: process.env.PAGE_ACCESS_TOKEN,
      },
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    logger.info("Messenger reply sent", {
      psid: sanitizedPsid,
      textPreview: truncateText(sanitizedText),
      recipientId: response.data && response.data.recipient_id,
      messageId: response.data && response.data.message_id,
    });

    return response.data;
  } catch (error) {
    logger.error("Messenger send failed", {
      psid: sanitizedPsid,
      textPreview: truncateText(sanitizedText),
      status: error.response && error.response.status,
      responseData: error.response && error.response.data,
      error,
    });

    throw error;
  }
}

module.exports = {
  extractMessageText,
  sendMessage,
};
