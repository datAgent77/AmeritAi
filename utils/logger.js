const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const DEFAULT_LEVEL = process.env.NODE_ENV === "production" ? "info" : "debug";

function getCurrentLogLevel() {
  const configuredLevel = String(process.env.LOG_LEVEL || DEFAULT_LEVEL).toLowerCase();
  return LOG_LEVELS[configuredLevel] !== undefined ? configuredLevel : DEFAULT_LEVEL;
}

function shouldLog(level) {
  return LOG_LEVELS[level] <= LOG_LEVELS[getCurrentLogLevel()];
}

function serializeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  return Object.entries(metadata).reduce((accumulator, [key, value]) => {
    if (value instanceof Error) {
      accumulator[key] = {
        message: value.message,
        stack: value.stack,
        name: value.name,
      };
      return accumulator;
    }

    accumulator[key] = value;
    return accumulator;
  }, {});
}

function write(level, message, metadata = {}) {
  if (!shouldLog(level)) {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...serializeMetadata(metadata),
  };

  const output = JSON.stringify(entry);

  if (level === "error") {
    console.error(output);
    return;
  }

  if (level === "warn") {
    console.warn(output);
    return;
  }

  console.log(output);
}

module.exports = {
  error(message, metadata) {
    write("error", message, metadata);
  },
  warn(message, metadata) {
    write("warn", message, metadata);
  },
  info(message, metadata) {
    write("info", message, metadata);
  },
  debug(message, metadata) {
    write("debug", message, metadata);
  },
};
