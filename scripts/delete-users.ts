// Direct Firestore User Deletion Script
// Usage: npx ts-node scripts/delete-users.ts

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import * as admin from 'firebase-admin';

// Initialize Firebase Admin with service account
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

console.log('Checking environment variables...');
console.log('Project ID:', projectId);
console.log('Client Email:', clientEmail ? 'Set' : 'NOT SET');
console.log('Private Key:', privateKey ? 'Set' : 'NOT SET');

if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing required environment variables!');
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey
        } as admin.ServiceAccount),
        projectId
    });
}

const db = admin.firestore();
const auth = admin.auth();

// Users to delete - add email addresses here
const usersToDelete = [
    'testtest@testtest.com',
    'test@userexai.com',
    'test@orcun.com'
];

async function deleteUserByEmail(email: string) {
    console.log(`\n--- Deleting user: ${email} ---`);

    try {
        // Find user in Firestore by email
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email).get();

        if (snapshot.empty) {
            console.log(`  User not found in Firestore: ${email}`);
        } else {
            for (const doc of snapshot.docs) {
                const userId = doc.id;
                console.log(`  Found user in Firestore with ID: ${userId}`);

                // Delete from Firestore
                await db.collection('users').doc(userId).delete();
                console.log(`  ✓ Deleted from Firestore`);

                // Delete chatbot settings if exists
                try {
                    await db.collection('chatbots').doc(userId).delete();
                    console.log(`  ✓ Deleted chatbot settings`);
                } catch (e) {
                    console.log(`  No chatbot settings found`);
                }

                // Delete from Firebase Auth
                try {
                    await auth.deleteUser(userId);
                    console.log(`  ✓ Deleted from Firebase Auth`);
                } catch (e: any) {
                    if (e.code === 'auth/user-not-found') {
                        console.log(`  User not found in Firebase Auth`);
                    } else {
                        console.log(`  Error deleting from Auth: ${e.message}`);
                    }
                }
            }
        }

        console.log(`  ✓ Completed deletion for ${email}`);
        return true;
    } catch (error: any) {
        console.error(`  ✗ Error deleting ${email}: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('=== User Deletion Script ===');
    console.log(`Project ID: ${projectId}`);
    console.log(`Users to delete: ${usersToDelete.length}`);

    for (const email of usersToDelete) {
        await deleteUserByEmail(email);
    }

    console.log('\n=== Deletion Complete ===');
    process.exit(0);
}

main().catch(console.error);
