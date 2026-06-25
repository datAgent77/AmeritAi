/**
 * Reset a tenant's free trial back to a full window.
 *
 * Usage (run on your machine where .env.local + network are available):
 *   node scripts/reset-trial.js yalova25@gmail.com
 *   node scripts/reset-trial.js yalova25@gmail.com 30      # custom day count
 *
 * Requires FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY and
 * NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local (same values the app uses).
 */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

// --- Minimal .env.local loader (so we don't depend on dotenv) ---
function loadEnvLocal() {
    const envPath = path.join(__dirname, "..", ".env.local");
    if (!fs.existsSync(envPath)) {
        console.error("[reset-trial] .env.local not found at", envPath);
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
        // strip surrounding quotes
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
    const days = Number(process.argv[3]) || 14;

    loadEnvLocal();

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = getPrivateKey();

    if (!projectId || !clientEmail || !privateKey) {
        console.error("[reset-trial] Missing Firebase admin env vars (projectId/clientEmail/privateKey).");
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
        console.error(`[reset-trial] No auth user found for ${email}:`, e.message);
        process.exit(1);
    }

    const uid = userRecord.uid;
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const nowIso = now.toISOString();
    const endIso = end.toISOString();

    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    const data = snap.exists ? snap.data() : {};
    console.log(`[reset-trial] User: ${email} (uid: ${uid})`);
    console.log(`[reset-trial] Before: subscriptionStatus=${data.subscriptionStatus}, trialEndsAt=${data.trialEndsAt}`);

    const trialObj = { isActive: true, startAt: nowIso, endAt: endIso };
    const updates = {
        subscriptionStatus: "trial",
        trialEndsAt: endIso,
        trial: trialObj,
        updatedAt: nowIso,
    };
    // If a normalized entitlements object exists, refresh its trial too (this takes priority in the app).
    if (data.entitlements && typeof data.entitlements === "object") {
        updates.entitlements = { ...data.entitlements, trial: trialObj, updatedAt: nowIso };
    }

    await userRef.set(updates, { merge: true });

    console.log(`[reset-trial] ✅ Trial reset to ${days} days. New trialEndsAt=${endIso}`);
    process.exit(0);
}

main().catch((e) => {
    console.error("[reset-trial] Failed:", e);
    process.exit(1);
});
