import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    const envInfo = {
        nodeVersion: process.version,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length,
        privateKeyStart: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.substring(0, 50) : null,
        privateKeyHasNewlines: process.env.FIREBASE_PRIVATE_KEY?.includes('\n'),
        privateKeyHasEscapedNewlines: process.env.FIREBASE_PRIVATE_KEY?.includes('\\n'),
    };

    let adminStatus = 'Not Initialized';
    let error = null;

    try {
        if (!admin.apps.length) {
            // Manual init attempt to mimic lib
            const privKey = process.env.FIREBASE_PRIVATE_KEY;
            if (privKey) {
                const formattedKey = privKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        privateKey: formattedKey,
                    })
                });
                adminStatus = 'Initialized successfully (Manual)';
            }
        } else {
            adminStatus = 'Already Initialized';
        }

        // Test DB access
        if (admin.apps.length) {
            const db = admin.firestore();
            // Try to list collections (lightweight)
            await db.listCollections();
            adminStatus += ' - DB Connection OK';
        }

    } catch (e: any) {
        error = e.message;
        adminStatus = 'Failed: ' + e.message;
    }

    return NextResponse.json({
        env: envInfo,
        status: adminStatus,
        error: error
    });
}
