import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { getPartnerDoc } from "@/lib/management/partners";
import { provisionTenantAccount } from "@/lib/tenant-provisioning";
import { buildActorFromRequest, logPlatformEvent } from "@/lib/server-event-log";
import { isAgencyAdminRole, isSuperAdminRole } from "@/lib/user-roles";

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();

    try {
        if (!adminDb || !adminAuth) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 });
        }

        // Get the authorization header to verify the caller is a SUPER_ADMIN
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Unauthorized - No token provided" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decoded = await adminAuth.verifyIdToken(idToken);
        const callerDoc = await adminDb.collection("users").doc(decoded.uid).get();
        const callerRole = callerDoc.data()?.role;
        const tokenRole = (decoded as any).role;
        const isSuperAdmin = isSuperAdminRole(callerRole) || isSuperAdminRole(tokenRole);
        const isAgencyAdmin = isAgencyAdminRole(callerRole) || isAgencyAdminRole(tokenRole);

        if (!isSuperAdmin && !isAgencyAdmin) {
            await logPlatformEvent({
                event_type: "tenant_create",
                actor: buildActorFromRequest(req, { uid: decoded.uid, role: String(callerRole || tokenRole || "") }),
                source_module: "admin",
                result: "denied"
            });
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const {
            email,
            password,
            firstName,
            lastName,
            companyName,
            companyWebsite,
            phone,
            enablePersonalShopper,
            industry,
            agencyId: requestedAgencyId
        } = await req.json();

        if (!email || !password || !companyName) {
            return NextResponse.json({ error: "email, password and companyName are required" }, { status: 400 });
        }

        let agencyId: string | null = null;

        if (isAgencyAdmin) {
            const partner = await getPartnerDoc(adminDb, decoded.uid)
            if (!partner?.capabilities.canCreateManagedAccounts) {
                return NextResponse.json({ error: "Forbidden: Partner level cannot create customers" }, { status: 403 });
            }
            agencyId = decoded.uid;
        } else if (typeof requestedAgencyId === "string" && requestedAgencyId.trim().length > 0) {
            const agencyDoc = await adminDb.collection("users").doc(requestedAgencyId.trim()).get();
            if (!agencyDoc.exists || !isAgencyAdminRole(agencyDoc.data()?.role)) {
                return NextResponse.json({ error: "Invalid agencyId" }, { status: 400 });
            }
            agencyId = requestedAgencyId.trim();
        }

        const created = await provisionTenantAccount(adminAuth, adminDb, {
            email,
            password,
            firstName,
            lastName,
            phone,
            companyName,
            companyWebsite,
            industry,
            enablePersonalShopper,
            agencyId,
            agencyAssignedBy: agencyId ? decoded.uid : null
        });

        await logPlatformEvent({
            event_type: "tenant_create",
            actor: buildActorFromRequest(req, { uid: decoded.uid, role: isSuperAdmin ? "SUPER_ADMIN" : "AGENCY_ADMIN" }),
            source_module: isSuperAdmin ? "admin" : "agency",
            result: "success",
            target: { tenantId: created.userId, agencyId }
        });

        return NextResponse.json({ success: true, userId: created.userId });

    } catch (error: any) {
        console.error("Error creating tenant:", error);

        if (adminDb && adminAuth) {
            try {
                const authHeader = req.headers.get("authorization");
                const token = authHeader?.startsWith("Bearer ") ? authHeader.split("Bearer ")[1] : null;
                if (token) {
                    const decoded = await adminAuth.verifyIdToken(token);
                    await logPlatformEvent({
                        event_type: "tenant_create",
                        actor: buildActorFromRequest(req, { uid: decoded.uid }),
                        source_module: "admin",
                        result: "error",
                        metadata: { message: error?.message || "unknown_error" }
                    });
                }
            } catch {
                // non-blocking logging
            }
        }

        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({
                error: "Bu e-posta adresi zaten kullanımda. (Not: Daha önce silinen kullanıcıların kayıtları Auth sisteminde kalmış olabilir. Lütfen farklı bir e-posta adresi kullanın.)"
            }, { status: 409 });
        }

        return NextResponse.json({ error: error.message || "Failed to create tenant" }, { status: 500 });
    }
}
