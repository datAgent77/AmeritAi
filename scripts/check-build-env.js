const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const ENV_FILES_IN_PRIORITY_ORDER = [
  ".env.production.local",
  ".env.local",
  ".env.production",
  ".env",
];

for (const fileName of ENV_FILES_IN_PRIORITY_ORDER) {
  const fullPath = path.resolve(process.cwd(), fileName);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath, override: false });
  }
}

const REQUIRED_BUILD_ENV_VARS = ["OPENAI_API_KEY", "PINECONE_API_KEY"];

const missing = REQUIRED_BUILD_ENV_VARS.filter((key) => {
  const value = process.env[key];
  return typeof value !== "string" || value.trim().length === 0;
});

if (missing.length > 0) {
  console.error("\n✖ Build env check failed. Missing required environment variables:");
  for (const key of missing) {
    console.error(`  - ${key}`);
  }

  console.error(
    "\nAdd these keys in your deployment provider (or local .env.local) and re-run build."
  );
  process.exit(1);
}

console.log("✓ Build env check passed.");
