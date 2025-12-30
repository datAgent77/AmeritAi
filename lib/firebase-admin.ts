import * as admin from 'firebase-admin';

let adminAuth: admin.auth.Auth | null = null;
let adminDb: admin.firestore.Firestore | null = null;
let adminStorage: admin.storage.Storage | null = null;

function initAdmin() {
    if (adminAuth && adminDb) return; // Already initialized locally

    try {
        if (!admin.apps.length) {
            const privKey = process.env.FIREBASE_PRIVATE_KEY;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

            console.log('[Firebase Admin] Initializing...');

            if (clientEmail && privKey) {
                // Robust key handling:
                // 1. Handle actual newlines (copy-paste from Vercel) which might be just \n chars
                // 2. Handle escaped newlines (literal \n string)
                // 3. Remove surrounding quotes if user added them
                let formattedPrivKey = privKey;

                // Remove surrounding quotes if present
                formattedPrivKey = formattedPrivKey.replace(/^"|"$/g, '');

                // Replace literal "\n" with actual newlines
                formattedPrivKey = formattedPrivKey.replace(/\\n/g, '\n');

                console.log('[Firebase Admin] Key Length:', formattedPrivKey.length);
                console.log('[Firebase Admin] Key Header:', formattedPrivKey.substring(0, 30));

                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: projectId || 'ai-assistant-22f53',
                        clientEmail: clientEmail,
                        privateKey: formattedPrivKey,
                    }),
                    storageBucket: 'ai-assistant-22f53.firebasestorage.app',
                });
                console.log("[Firebase Admin] Initialization successful");
            } else {
                console.error("[Firebase Admin] Missing environment variables (FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY) during init.");
                // We don't return here, to allow it to try default creds if inside GCP, though unlikely for Vercel
            }
        }

        // Assign instances
        adminAuth = admin.auth();
        adminDb = admin.firestore();
        adminStorage = admin.storage();

    } catch (error) {
        console.error("[Firebase Admin] Initialization failed:", error);
    }
}

export function getAdminAuth() {
    initAdmin();
    return adminAuth;
}

export function getAdminDb() {
    initAdmin();
    return adminDb;
}

export function getAdminStorage() {
    initAdmin();
    return adminStorage;
}
