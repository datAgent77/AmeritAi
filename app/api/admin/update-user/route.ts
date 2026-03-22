
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { isSuperAdminRole } from '@/lib/user-roles';
import { authorizeTargetAccess } from '@/lib/api-auth';

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
        const isSuperAdmin = isSuperAdminRole(requesterRole) || isSuperAdminRole(tokenRole);

        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { targetUserId, email, password, role, isActive } = body;

        if (!targetUserId) {
            return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(req, targetUserId);
        if (!authz.ok) {
            return authz.response;
        }
        if (!authz.isSuperAdmin) {
            return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
        }

        const updates: any = {};
        if (email) updates.email = email;
        if (password) {
            if (password.length < 6) {
                return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
            }
            updates.password = password;
        }

        const firestoreUpdates: Record<string, unknown> = {};
        if (email) firestoreUpdates.email = email;

        if (typeof role === 'string' && role.trim().length > 0) {
            const normalizedRole = role.trim().toUpperCase();
            const allowedRoles = new Set(['SUPER_ADMIN', 'AGENCY_ADMIN', 'TENANT_ADMIN', 'USER']);
            if (!allowedRoles.has(normalizedRole)) {
                return NextResponse.json({ error: 'Invalid role value' }, { status: 400 });
            }
            firestoreUpdates.role = normalizedRole;

            const targetUser = await adminAuth.getUser(targetUserId);
            const currentClaims = targetUser.customClaims || {};
            await adminAuth.setCustomUserClaims(targetUserId, {
                ...currentClaims,
                role: normalizedRole
            });
        }

        if (typeof isActive === 'boolean') {
            firestoreUpdates.isActive = isActive;
        }

        if (Object.keys(updates).length === 0 && Object.keys(firestoreUpdates).length === 0) {
            return NextResponse.json({ success: true, message: 'No changes requested' });
        }

        if (Object.keys(updates).length > 0) {
            await adminAuth.updateUser(targetUserId, updates);
        }

        if (Object.keys(firestoreUpdates).length > 0) {
            await adminDb.collection('users').doc(targetUserId).set(firestoreUpdates, { merge: true });
        }

        return NextResponse.json({ success: true, message: 'User updated successfully' });

    } catch (error: any) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
    }
}
