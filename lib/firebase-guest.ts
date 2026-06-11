/**
 * ISOLATED Firebase Instance for Guest/Widget Users
 * 
 * This file is completely separate from the main lib/firebase.ts.
 * It exists to prevent ANY interaction with the default Firebase app
 * which could conflict with the Admin user's session on localhost (same domain).
 * 
 * IMPORTANT: Do NOT import anything from lib/firebase.ts in files that also import this.
 */

import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, inMemoryPersistence, signInAnonymously, Auth } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Find existing guest app or create it
const GUEST_APP_NAME = "chatbot-guest-isolated";
const existingGuestApp = getApps().find(app => app.name === GUEST_APP_NAME);
const guestApp = existingGuestApp || initializeApp(firebaseConfig, GUEST_APP_NAME);

const guestDb = getFirestore(guestApp);
const guestAuth = getAuth(guestApp);

// Keep guest auth fully in-memory so widget auth never persists into the host app session.
let persistenceSet = false;
let persistencePromise: Promise<void> | null = null;
let guestSignInPromise: Promise<Auth> | null = null;

const ensureGuestPersistence = async () => {
    if (persistenceSet) {
        return;
    }

    if (!persistencePromise) {
        persistencePromise = setPersistence(guestAuth, inMemoryPersistence)
            .then(() => {
                persistenceSet = true;
            })
            .finally(() => {
                persistencePromise = null;
            });
    }

    await persistencePromise;
};

// Helper function to sign in anonymously without touching persistent auth storage.
const signInAsGuest = async (): Promise<Auth> => {
    await ensureGuestPersistence();

    if (guestAuth.currentUser) {
        console.log("Guest login: Reusing existing user", guestAuth.currentUser.uid);
        return guestAuth;
    }

    if (!guestSignInPromise) {
        guestSignInPromise = signInAnonymously(guestAuth)
            .then((credential) => {
                console.log("Guest login: Created new anonymous user", credential.user.uid);
                return guestAuth;
            })
            .finally(() => {
                guestSignInPromise = null;
            });
    }

    return guestSignInPromise;
};

export { guestApp, guestDb, guestAuth, signInAsGuest, ensureGuestPersistence };
