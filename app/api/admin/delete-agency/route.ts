import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { buildActorFromRequest, logPlatformEvent } from "@/lib/server-event-log";
import { isAgencyAdminRole, isSuperAdminRole } from "@/lib/user-roles";

const MAX_BATCH_SIZE = 400;

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb();
        const adminAuth = getAdminAuth();

        if (!adminDb || !adminAuth) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 });
        }

        const authHeader = req.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decoded = await adminAuth.verifyIdToken(token);
        const callerDoc = await adminDb.collection("users").doc(decoded.uid).get();
        const callerRole = callerDoc.data()?.role;
        const tokenRole = (decoded as any)?.role;
        const isSuperAdmin = isSuperAdminRole(callerRole) || isSuperAdminRole(tokenRole);

        if (!isSuperAdmin) {
            await logPlatformEvent({
                event_type: "agency_delete",
                actor: buildActorFromRequest(req, { uid: decoded.uid, role: String(callerRole || tokenRole || "") }),
                source_module: "admin",
                result: "denied"
            });
            return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
        }

        const body = await req.json();
        const agencyId = typeof body?.agencyId === "string" ? body.agencyId.trim() : "";

        if (!agencyId) {
            return NextResponse.json({ error: "agencyId is required" }, { status: 400 });
        }

        if (agencyId === decoded.uid) {
            return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
        }

        const agencyRef = adminDb.collection("users").doc(agencyId);
        const agencyDoc = await agencyRef.get();

        if (!agencyDoc.exists) {
            return NextResponse.json({ error: "Agency not found" }, { status: 404 });
        }

        const agencyData = agencyDoc.data() || {};
        if (!isAgencyAdminRole(agencyData.role)) {
            return NextResponse.json({ error: "Target user is not an agency admin" }, { status: 400 });
        }

        const assignedTenantsSnap = await adminDb
            .collection("users")
            .where("role", "==", "TENANT_ADMIN")
            .where("agencyId", "==", agencyId)
            .get();

        const nowIso = new Date().toISOString();
        const tenantDocs = assignedTenantsSnap.docs;
        for (let index = 0; index < tenantDocs.length; index += MAX_BATCH_SIZE) {
            const batch = adminDb.batch();
            const chunk = tenantDocs.slice(index, index + MAX_BATCH_SIZE);
            for (const doc of chunk) {
                batch.set(doc.ref, {
                    agencyId: null,
                    agencyAssignedAt: null,
                    agencyAssignedBy: null,
                    updatedAt: nowIso
                }, { merge: true });
            }
            await batch.commit();
        }

        try {
            await adminAuth.deleteUser(agencyId);
        } catch (error: any) {
            if (error?.code !== "auth/user-not-found") {
                throw error;
            }
        }

        await agencyRef.delete();

        await logPlatformEvent({
            event_type: "agency_delete",
            actor: buildActorFromRequest(req, { uid: decoded.uid, role: "SUPER_ADMIN" }),
            source_module: "admin",
            result: "success",
            target: { agencyId },
            metadata: { unassignedTenants: tenantDocs.length }
        });

        return NextResponse.json({
            success: true,
            unassignedTenants: tenantDocs.length
        });
    } catch (error: any) {
        console.error("Delete agency error:", error);
        return NextResponse.json({ error: error?.message || "Failed to delete agency" }, { status: 500 });
    }
}
