const express = require("express");

const { processMessage } = require("../services/ai");
const { extractMessageText, sendMessage } = require("../services/messenger");
const logger = require("../utils/logger");

const router = express.Router();

async function handleMessagingEvent(event, requestId) {
  const senderPsid = event && event.sender && event.sender.id;
  const message = event && event.message;

  if (!senderPsid) {
    logger.warn("Skipping Messenger event without sender PSID", {
      requestId,
      event,
    });
    return;
  }

  if (!message) {
    logger.info("Skipping non-message Messenger event", {
      requestId,
      senderPsid,
      eventKeys: Object.keys(event || {}),
    });
    return;
  }

  if (message.is_echo) {
    logger.debug("Skipping Messenger echo message", {
      requestId,
      senderPsid,
      mid: message.mid,
    });
    return;
  }

  const messageText = extractMessageText(message);

  logger.info("Messenger message received", {
    requestId,
    senderPsid,
    messageText,
  });

  const replyText = await processMessage(messageText);

  if (!replyText) {
    logger.warn("AI processor returned an empty reply", {
      requestId,
      senderPsid,
      messageText,
    });
    return;
  }

  await sendMessage(senderPsid, replyText);
}

router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    logger.info("Messenger webhook verification succeeded", {
      requestId: req.requestId,
    });
    return res.status(200).send(challenge);
  }

  logger.warn("Messenger webhook verification failed", {
    requestId: req.requestId,
    mode,
    tokenProvided: Boolean(token),
  });

  return res.sendStatus(403);
});

router.post("/webhook", async (req, res) => {
  try {
    const body = req.body || {};

    if (body.object !== "page") {
      logger.warn("Ignoring webhook payload with unexpected object", {
        requestId: req.requestId,
        object: body.object,
      });
      return res.status(200).json({ received: true });
    }

    const entries = Array.isArray(body.entry) ? body.entry : [];
    const tasks = [];

    for (const entry of entries) {
      const messagingEvents = Array.isArray(entry && entry.messaging) ? entry.messaging : [];

      for (const event of messagingEvents) {
        tasks.push(handleMessagingEvent(event, req.requestId));
      }
    }

    const results = await Promise.allSettled(tasks);
    const rejectedCount = results.filter((result) => result.status === "rejected").length;

    if (rejectedCount > 0) {
      logger.error("One or more Messenger events failed during processing", {
        requestId: req.requestId,
        rejectedCount,
      });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error("Webhook route failed unexpectedly", {
      requestId: req.requestId,
      error,
    });

    return res.status(200).json({ received: true });
  }
});

module.exports = router;
