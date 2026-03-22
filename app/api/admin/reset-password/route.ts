
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { authorizeTargetAccess } from '@/lib/api-auth';
import { isSuperAdminRole } from '@/lib/user-roles';

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
            console.error("Firebase Admin Auth/DB not initialized");
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const requesterDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        const requesterRole = requesterDoc.data()?.role;
        const tokenRole = (decodedToken as any).role;
        const isSuperAdmin = isSuperAdminRole(requesterRole) || isSuperAdminRole(tokenRole);
        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { targetUserId, newPassword } = body;

        if (!targetUserId || !newPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(req, targetUserId);
        if (!authz.ok) {
            return authz.response;
        }
        if (!authz.isSuperAdmin) {
            return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        await adminAuth.updateUser(targetUserId, {
            password: newPassword,
        });

        return NextResponse.json({ success: true, message: 'Password updated successfully' });

    } catch (error: any) {
        console.error('Error resetting password:', error);
        return NextResponse.json({ error: error.message || 'Failed to reset password' }, { status: 500 });
    }
}
