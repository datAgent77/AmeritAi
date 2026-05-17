import * as admin from 'firebase-admin';

let adminAuth: admin.auth.Auth | null = null;
let adminDb: admin.firestore.Firestore | null = null;
let adminStorage: admin.storage.Storage | null = null;
let adminInitAttempted = false;

function initAdmin() {
    if (adminAuth && adminDb) return; // Already initialized locally
    if (adminInitAttempted && !admin.apps.length) return;
    adminInitAttempted = true;

    try {
        let initializedApp = false;
        if (!admin.apps.length) {
            const privKey = process.env.FIREBASE_PRIVATE_KEY;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

            if (clientEmail && privKey) {
                console.log('[Firebase Admin] Initializing...');
                // Robust key handling:
                // 1. Handle actual newlines (copy-paste from Vercel) which might be just \n chars
                // 2. Handle escaped newlines (literal \n string)
                // 3. Remove surrounding quotes if user added them
                let formattedPrivKey = privKey;

                // Step 1: Strip surrounding quotes (handles "value" and "value\" patterns)
                formattedPrivKey = formattedPrivKey.trim();
                formattedPrivKey = formattedPrivKey.replace(/^["']/, '');        // leading quote
                formattedPrivKey = formattedPrivKey.replace(/[\\]?["']$/, ''); // trailing backslash+quote or just quote

                // Step 2: Replace literal \n sequences with actual newlines
                formattedPrivKey = formattedPrivKey.replace(/\\n/g, '\n');

                // Step 3: Reconstruct strict PEM format
                // Strips ALL non-base64 chars from the body (handles \n, spaces, stray backslashes, quotes)
                const hasHeader = formattedPrivKey.includes('-----BEGIN PRIVATE KEY-----');
                const hasFooter = formattedPrivKey.includes('-----END PRIVATE KEY-----');

                if (hasHeader && hasFooter) {
                    // Extract only the base64 body — strip everything that is not a valid base64 character
                    const body = formattedPrivKey
                        .replace('-----BEGIN PRIVATE KEY-----', '')
                        .replace('-----END PRIVATE KEY-----', '')
                        .replace(/[^A-Za-z0-9+/=]/g, ''); // keep ONLY valid base64 chars

                    // Split body into 64-char lines and reassemble PEM
                    const chunks = body.match(/.{1,64}/g) || [];
                    formattedPrivKey =
                        '-----BEGIN PRIVATE KEY-----\n' +
                        chunks.join('\n') +
                        '\n-----END PRIVATE KEY-----\n';
                }


                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: projectId || 'ai-assistant-22f53',
                        clientEmail: clientEmail,
                        privateKey: formattedPrivKey,
                    }),
                    storageBucket: 'ai-assistant-22f53.firebasestorage.app',
                });
                initializedApp = true;
                console.log("[Firebase Admin] Initialization successful");
            } else {
                return;
            }
        }

        // Assign instances
        adminAuth = admin.auth();
        adminDb = admin.firestore();
        if (initializedApp) {
            adminDb.settings({ preferRest: true });
        }
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
