import * as admin from 'firebase-admin';

let adminAuth: admin.auth.Auth | null = null;
let adminDb: admin.firestore.Firestore | null = null;
let adminStorage: admin.storage.Storage | null = null;

function initAdmin() {
    if (adminAuth && adminDb) return; // Already initialized

    try {
        if (!admin.apps.length) {
            const privKey = process.env.FIREBASE_PRIVATE_KEY;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

            if (clientEmail && privKey) {
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: projectId || 'ai-assistant-22f53',
                        clientEmail: clientEmail,
                        privateKey: privKey.replace(/\\n/g, '\n'),
                    }),
                    storageBucket: 'ai-assistant-22f53.firebasestorage.app',
                });
                console.log("[Firebase Admin] Initialization successful");
            } else {
                console.error("[Firebase Admin] Missing environment variables during init.");
                return; // Stop here
            }
        }

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

// Deprecated exports specific for keeping some backward compat if possible with 'live binding', 
// but safer to force usage of getters. 
// We will simply remove the old exports to force compilation errors if I missed any consumers.

