/**
 * Set a tenant's subscription plan (admin override — e.g. for face-to-face
 * billing or testing). Writes the SAME fields a real Stripe upgrade writes:
 * planId / plan / subscriptionStatus / entitlements.planId, and mirrors plan
 * onto the chatbots doc.
 *
 * Usage (run on your machine where .env.local + network are available):
 *   node scripts/set-plan.js yalova25@gmail.com enterprise
 *   node scripts/set-plan.js yalova25@gmail.com growth
 *   node scripts/set-plan.js yalova25@gmail.com starter cancelled   # custom status
 *
 * Valid plans: starter | growth | enterprise
 *
 * NOTE: Setting Enterprise UNLOCKS premium modules but does not auto-enable
 * them. After this, turn on the module you want in Console -> Modules
 * (e.g. Appointments), or run scripts/enable-module.js.
 *
 * Requires FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY and
 * NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local (same values the app uses).
 */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const VALID_PLANS = ["starter", "growth", "enterprise"];

function loadEnvLocal() {
    const envPath = path.join(__dirname, "..", ".env.local");
    if (!fs.existsSync(envPath)) {
        console.error("[set-plan] .env.local not found at", envPath);
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
    const plan = (process.argv[3] || "enterprise").toLowerCase();
    const status = process.argv[4] || "active";

    if (!VALID_PLANS.includes(plan)) {
        console.error(`[set-plan] Invalid plan "${plan}". Valid: ${VALID_PLANS.join(", ")}`);
        process.exit(1);
    }

    loadEnvLocal();

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = getPrivateKey();

    if (!projectId || !clientEmail || !privateKey) {
        console.error("[set-plan] Missing Firebase admin env vars (projectId/clientEmail/privateKey).");
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
        console.error(`[set-plan] No auth user found for ${email}:`, e.message);
        process.exit(1);
    }

    const uid = userRecord.uid;
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    const data = snap.exists ? snap.data() || {} : {};
    const nowIso = new Date().toISOString();

    console.log(`[set-plan] User: ${email} (uid: ${uid})`);
    console.log(`[set-plan] Before: planId=${data.planId}, subscriptionStatus=${data.subscriptionStatus}`);

    const userUpdate = {
        planId: plan,
        plan: plan,
        subscriptionStatus: status,
        entitlements: { ...(data.entitlements && typeof data.entitlements === "object" ? data.entitlements : {}), planId: plan },
        subscriptionUpdatedAt: nowIso,
        updatedAt: nowIso,
    };

    await userRef.set(userUpdate, { merge: true });
    await db.collection("chatbots").doc(uid).set({ plan }, { merge: true });

    console.log(`[set-plan] ✅ ${email} is now plan="${plan}", status="${status}".`);
    console.log(`[set-plan] Premium modules are unlocked. Enable the ones you want in Console -> Modules`);
    console.log(`[set-plan] (e.g. Appointments), or run scripts/enable-module.js.`);
    process.exit(0);
}

main().catch((e) => {
    console.error("[set-plan] Failed:", e);
    process.exit(1);
});
