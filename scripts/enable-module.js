/**
 * Enable (or disable) a module flag on a tenant — useful for testing premium
 * modules that are otherwise locked during the trial (e.g. Appointments).
 *
 * Usage (run on your machine where .env.local + network are available):
 *   node scripts/enable-module.js yalova25@gmail.com enableAppointments
 *   node scripts/enable-module.js yalova25@gmail.com enableAppointments true
 *   node scripts/enable-module.js yalova25@gmail.com enableAppointments false   # turn off
 *
 * Common flags: enableAppointments, enableVisualDiagnosis, enableDigitalWaiter,
 *               enablePersonalShopper, enableProactiveMessaging, enableGamification
 *
 * Requires FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY and
 * NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local (same values the app uses).
 */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

function loadEnvLocal() {
    const envPath = path.join(__dirname, "..", ".env.local");
    if (!fs.existsSync(envPath)) {
        console.error("[enable-module] .env.local not found at", envPath);
        process.exit(1);
    }
    const text = fs.readFileSync(envPath, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        let val = line.slice(eq + 1);
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = val;
    }
}

function getPrivateKey() {
    let k = process.env.FIREBASE_PRIVATE_KEY || "";
    k = k.trim().replace(/^["']/, "").replace(/[\\]?["']$/, "");
    k = k.replace(/\\n/g, "\n");
    return k;
}

async function main() {
    const email = process.argv[2] || "yalova25@gmail.com";
    const flag = process.argv[3] || "enableAppointments";
    const value = process.argv[4] === undefined ? true : process.argv[4] === "true";

    loadEnvLocal();

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = getPrivateKey();

    if (!projectId || !clientEmail || !privateKey) {
        console.error("[enable-module] Missing Firebase admin env vars (projectId/clientEmail/privateKey).");
        process.exit(1);
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        });
    }

    const auth = admin.auth();
    const db = admin.firestore();

    let userRecord;
    try {
        userRecord = await auth.getUserByEmail(email);
    } catch (e) {
        console.error(`[enable-module] No auth user found for ${email}:`, e.message);
        process.exit(1);
    }

    const uid = userRecord.uid;
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    const before = snap.exists ? (snap.data() || {})[flag] : undefined;

    console.log(`[enable-module] User: ${email} (uid: ${uid})`);
    console.log(`[enable-module] Before: ${flag}=${before}`);

    await userRef.set({ [flag]: value, updatedAt: new Date().toISOString() }, { merge: true });

    console.log(`[enable-module] ✅ Set ${flag}=${value}. Reload the panel / widget to see it.`);
    process.exit(0);
}

main().catch((e) => {
    console.error("[enable-module] Failed:", e);
    process.exit(1);
});
