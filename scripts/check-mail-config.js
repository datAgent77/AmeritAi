const fs = require("fs")
const path = require("path")
const dns = require("dns").promises

const ENV_FILES_IN_PRIORITY_ORDER = [
  ".env.production.local",
  ".env.local",
  ".env.production",
  ".env",
]

for (const fileName of ENV_FILES_IN_PRIORITY_ORDER) {
  const fullPath = path.resolve(process.cwd(), fileName)
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf8")
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith("#")) continue
      const equalsIndex = line.indexOf("=")
      if (equalsIndex <= 0) continue

      const key = line.slice(0, equalsIndex).trim()
      if (Object.prototype.hasOwnProperty.call(process.env, key)) continue

      let value = line.slice(equalsIndex + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  }
}

const args = new Set(process.argv.slice(2))
const strict = args.has("--strict")
const checkDns = args.has("--dns")

const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i
const placeholderPattern = /^(your-|change-|<|resend-api-key|your-transactional-email-api-key)/i

const results = []

function envValue(key) {
  const value = process.env[key]
  return typeof value === "string" ? value.trim() : ""
}

function addResult(ok, label, detail) {
  results.push({ ok, label, detail })
}

function requireValue(key, detail) {
  const value = envValue(key)
  const ok = Boolean(value) && !placeholderPattern.test(value)
  addResult(ok, key, ok ? "set" : detail || "missing or placeholder")
  return value
}

async function hasDnsRecord(resolver) {
  try {
    const records = await resolver()
    return Array.isArray(records) && records.length > 0
  } catch {
    return false
  }
}

async function main() {
  const appUrl = requireValue("NEXT_PUBLIC_APP_URL", "set to https://www.ameritai.com in production")
  if (appUrl) {
    addResult(/^https?:\/\//i.test(appUrl), "NEXT_PUBLIC_APP_URL format", "must start with http:// or https://")
  }

  const customVerification = envValue("AUTH_CUSTOM_VERIFICATION_EMAILS_ENABLED")
  addResult(
    customVerification === "true",
    "AUTH_CUSTOM_VERIFICATION_EMAILS_ENABLED",
    "must be true for Vion-branded verification emails"
  )

  const smtpHost = requireValue("SMTP_HOST", "expected smtp.resend.com")
  if (smtpHost) {
    addResult(smtpHost === "smtp.resend.com", "SMTP_HOST provider", "recommended value: smtp.resend.com")
  }

  const smtpPort = requireValue("SMTP_PORT", "expected 587")
  if (smtpPort) {
    addResult(["587", "465"].includes(smtpPort), "SMTP_PORT value", "expected 587 or 465")
  }

  const smtpSecure = envValue("SMTP_SECURE")
  addResult(Boolean(smtpSecure), "SMTP_SECURE", "set to false for port 587")

  const smtpUser = requireValue("SMTP_USER", "expected resend")
  if (smtpUser) {
    addResult(smtpUser === "resend", "SMTP_USER provider", "recommended value: resend")
  }

  requireValue("SMTP_PASS", "set to the Resend API key")

  const fromEmail = requireValue("SMTP_FROM_EMAIL", "expected no-reply@ameritai.com")
  if (fromEmail) {
    addResult(emailPattern.test(fromEmail), "SMTP_FROM_EMAIL format", "must be a valid email address")
    addResult(fromEmail.endsWith("@ameritai.com"), "SMTP_FROM_EMAIL domain", "must use ameritai.com")
  }

  requireValue("SMTP_FROM_NAME", "expected Vion AI")

  for (const key of ["VION_ADMIN_EMAIL", "VION_CONTACT_EMAIL"]) {
    const value = requireValue(key, "expected info@ameritai.com")
    if (value) {
      addResult(emailPattern.test(value), `${key} format`, "must be a valid email address")
      addResult(value.endsWith("@ameritai.com"), `${key} domain`, "must use ameritai.com")
    }
  }

  if (checkDns) {
    addResult(
      await hasDnsRecord(async () => {
        const records = await dns.resolveTxt("resend._domainkey.ameritai.com")
        return records.filter((parts) => parts.join("").startsWith("p="))
      }),
      "DNS DKIM resend._domainkey.ameritai.com",
      "add the DKIM TXT record shown by Resend"
    )
    addResult(
      await hasDnsRecord(async () => {
        const records = await dns.resolveMx("send.ameritai.com")
        return records.filter((record) => record.exchange === "feedback-smtp.us-east-1.amazonses.com")
      }),
      "DNS MX send.ameritai.com",
      "add MX send -> feedback-smtp.us-east-1.amazonses.com priority 10"
    )
    addResult(
      await hasDnsRecord(async () => {
        const records = await dns.resolveTxt("send.ameritai.com")
        return records.filter((parts) => parts.join("").startsWith("v=spf1 include:amazonses.com"))
      }),
      "DNS SPF send.ameritai.com",
      "add TXT send -> v=spf1 include:amazonses.com ~all"
    )
    addResult(
      await hasDnsRecord(async () => {
        const records = await dns.resolveTxt("_dmarc.ameritai.com")
        return records.filter((parts) => parts.join("").startsWith("v=DMARC1"))
      }),
      "DNS DMARC _dmarc.ameritai.com",
      "add TXT: v=DMARC1; p=none;"
    )
    addResult(
      await hasDnsRecord(() => dns.resolveMx("ameritai.com")),
      "DNS inbound MX ameritai.com",
      "required only for receiving info@ameritai.com mail / forwarding"
    )
  }

  const failed = results.filter((item) => !item.ok)
  for (const item of results) {
    const icon = item.ok ? "OK" : "FAIL"
    console.log(`${icon} ${item.label}: ${item.detail}`)
  }

  if (failed.length > 0) {
    console.warn(`\n${failed.length} mail configuration check(s) failed.`)
    if (strict) process.exit(1)
  } else {
    console.log("\nOK Mail configuration checks passed.")
  }
}

main().catch((error) => {
  console.error("Mail config check failed:", error)
  process.exit(1)
})
