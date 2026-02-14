
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    try {
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();

        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        if (!adminAuth || !adminDb) {
            console.error("Firebase Admin/DB not initialized");
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const requesterUid = decodedToken.uid;

        // Verify Requester is Super Admin
        const requesterDoc = await adminDb.collection('users').doc(requesterUid).get();
        const requesterRole = requesterDoc.data()?.role;
        const tokenRole = (decodedToken as any).role;
        const isSuperAdmin =
            requesterRole === 'SUPER_ADMIN' ||
            tokenRole === 'SUPER_ADMIN' ||
            tokenRole === 'super_admin';

        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { targetUserId, email, password } = body;

        if (!targetUserId) {
            return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
        }

        const updates: any = {};
        if (email) updates.email = email;
        if (password) {
            if (password.length < 6) {
                return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
            }
            updates.password = password;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ success: true, message: 'No changes requested' });
        }

        // 1. Update Auth
        await adminAuth.updateUser(targetUserId, updates);

        // 2. Update Firestore if email changed
        if (email) {
            await adminDb.collection('users').doc(targetUserId).set({ email }, { merge: true });
        }

        return NextResponse.json({ success: true, message: 'User updated successfully' });

    } catch (error: any) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
    }
}
