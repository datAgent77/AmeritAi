/**
 * Firebase Auth test user email verification helper
 *
 * Usage:
 *   node scripts/verify-test-user.js user@example.com
 *   node scripts/verify-test-user.js --unverify user@example.com
 *   node scripts/verify-test-user.js --uid FIREBASE_UID
 *
 * Notes:
 * - This updates Firebase Authentication `emailVerified` only.
 * - It does NOT update Firestore `users` documents (not needed for auth verification).
 * - Reads credentials from .env.local (or already-exported env vars).
 */

const path = require("path");
const dotenv = require("dotenv");
const admin = require("firebase-admin");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

function usage(exitCode = 0) {
  console.log(`
Usage:
  node scripts/verify-test-user.js <email>
  node scripts/verify-test-user.js --unverify <email>
  node scripts/verify-test-user.js --uid <firebaseUid>

Examples:
  node scripts/verify-test-user.js lit@lit.com
  node scripts/verify-test-user.js --unverify lit@lit.com
  node scripts/verify-test-user.js --uid hkMUFgjmuheq...
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (!args.length || args.includes("--help") || args.includes("-h")) usage(0);

  const result = {
    uid: null,
    email: null,
    verify: true,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--unverify") {
      result.verify = false;
      continue;
    }
    if (arg === "--uid") {
      const next = args[i + 1];
      if (!next) {
        console.error("Missing value after --uid");
        usage(1);
      }
      result.uid = next;
      i += 1;
      continue;
    }

    if (!result.email && !result.uid) {
      result.email = arg;
      continue;
    }

    console.error(`Unexpected argument: ${arg}`);
    usage(1);
  }

  if (!result.uid && !result.email) {
    console.error("Please provide an email or --uid.");
    usage(1);
  }

  return result;
}

function getRequiredEnv() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
    if (privateKey.includes("-----BEGIN PRIVATE KEY-----") && privateKey.includes("-----END PRIVATE KEY-----")) {
      const body = privateKey
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
        .replace(/\s/g, "");
      const chunks = body.match(/.{1,64}/g) || [];
      privateKey = `-----BEGIN PRIVATE KEY-----\n${chunks.join("\n")}\n-----END PRIVATE KEY-----\n`;
    }
  }

  return { projectId, clientEmail, privateKey };
}

function initAdmin() {
  if (admin.apps.length) return;

  const { projectId, clientEmail, privateKey } = getRequiredEnv();

  if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing Firebase Admin env vars.");
    console.error("Required:");
    console.error("- NEXT_PUBLIC_FIREBASE_PROJECT_ID (or FIREBASE_PROJECT_ID)");
    console.error("- FIREBASE_CLIENT_EMAIL");
    console.error("- FIREBASE_PRIVATE_KEY");
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  });
}

async function main() {
  const { uid, email, verify } = parseArgs(process.argv);
  initAdmin();

  const auth = admin.auth();
  const targetUser = uid ? await auth.getUser(uid) : await auth.getUserByEmail(email);

  console.log("Found user:");
  console.log(`- uid: ${targetUser.uid}`);
  console.log(`- email: ${targetUser.email || "-"}`);
  console.log(`- emailVerified (before): ${targetUser.emailVerified}`);

  if (!!targetUser.emailVerified === verify) {
    console.log(`No change needed. emailVerified is already ${verify}.`);
    process.exit(0);
  }

  await auth.updateUser(targetUser.uid, { emailVerified: verify });
  const updated = await auth.getUser(targetUser.uid);

  console.log(`✓ Updated emailVerified => ${updated.emailVerified}`);
  console.log(`Done (${verify ? "verified" : "unverified"}).`);
}

main().catch((error) => {
  console.error("verify-test-user failed:", {
    message: error?.message || String(error),
    code: error?.code,
  });
  process.exit(1);
});

