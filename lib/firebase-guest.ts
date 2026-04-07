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
    apiKey: "AIzaSyCUwSlqGfisUtejDfF8Snv-EzI374vcuus",
    authDomain: "ai-assistant-22f53.firebaseapp.com",
    projectId: "ai-assistant-22f53",
    storageBucket: "ai-assistant-22f53.firebasestorage.app",
    messagingSenderId: "249932268224",
    appId: "1:249932268224:web:559d39b570c1dc18082325",
    measurementId: "G-97SQS8BW2W"
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
