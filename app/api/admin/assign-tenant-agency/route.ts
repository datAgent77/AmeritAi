import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { assignManagedAccountPartner } from "@/lib/management/accounts";
import { buildActorFromRequest, logPlatformEvent } from "@/lib/server-event-log";
import { isAgencyAdminRole, isSuperAdminRole, isTenantAdminRole } from "@/lib/user-roles";
import { authorizeTargetAccess } from "@/lib/api-auth";

export async function POST(req: Request) {
    try {
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();

        if (!adminAuth || !adminDb) {
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

        if (!isSuperAdminRole(callerRole) && !isSuperAdminRole(tokenRole)) {
            await logPlatformEvent({
                event_type: "tenant_agency_assign",
                actor: buildActorFromRequest(req, { uid: decoded.uid, role: String(callerRole || tokenRole || "") }),
                source_module: "admin",
                result: "denied"
            });
            return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
        }

        const body = await req.json();
        const tenantId = typeof body?.tenantId === "string" ? body.tenantId.trim() : "";
        const agencyId = typeof body?.agencyId === "string" ? body.agencyId.trim() : "";

        if (!tenantId) {
            return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(req, tenantId);
        if (!authz.ok) {
            return authz.response;
        }
        if (!authz.isSuperAdmin) {
            return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
        }

        const tenantDoc = await adminDb.collection("users").doc(tenantId).get();
        if (!tenantDoc.exists || !isTenantAdminRole(tenantDoc.data()?.role)) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        if (agencyId) {
            const agencyDoc = await adminDb.collection("users").doc(agencyId).get();
            if (!agencyDoc.exists || !isAgencyAdminRole(agencyDoc.data()?.role)) {
                return NextResponse.json({ error: "Agency not found" }, { status: 404 });
            }
        }

        await assignManagedAccountPartner({
            adminDb,
            tenantId,
            partnerId: agencyId || null,
            assignedBy: decoded.uid
        });

        await logPlatformEvent({
            event_type: "tenant_agency_assign",
            actor: buildActorFromRequest(req, { uid: decoded.uid, role: "SUPER_ADMIN" }),
            source_module: "admin",
            result: "success",
            target: { tenantId, agencyId: agencyId || null }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Assign tenant agency error:", error);
        return NextResponse.json({ error: error?.message || "Failed to assign tenant agency" }, { status: 500 });
    }
}
