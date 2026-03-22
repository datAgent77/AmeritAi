import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { provisionTenantAccount } from "@/lib/tenant-provisioning";
import { buildActorFromRequest, logPlatformEvent } from "@/lib/server-event-log";
import { isAgencyAdminRole } from "@/lib/user-roles";

export const dynamic = "force-dynamic";

async function getAgencyCaller(req: Request) {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    if (!adminAuth || !adminDb) {
        return { ok: false as const, response: NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 }) };
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const callerDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const callerRole = callerDoc.data()?.role;
    const tokenRole = (decoded as any)?.role;

    if (!isAgencyAdminRole(callerRole) && !isAgencyAdminRole(tokenRole)) {
        await logPlatformEvent({
            event_type: "agency_customers_access",
            actor: buildActorFromRequest(req, { uid: decoded.uid, role: String(callerRole || tokenRole || "") }),
            source_module: "agency",
            result: "denied"
        });
        return { ok: false as const, response: NextResponse.json({ error: "Forbidden: Agency access required" }, { status: 403 }) };
    }

    return {
        ok: true as const,
        adminAuth,
        adminDb,
        decoded
    };
}

export async function GET(req: Request) {
    try {
        const authz = await getAgencyCaller(req);
        if (!authz.ok) {
            return authz.response;
        }

        const { searchParams } = new URL(req.url);
        const includeArchived = searchParams.get("includeArchived") === "true";
        const snap = await authz.adminDb
            .collection("users")
            .where("role", "==", "TENANT_ADMIN")
            .where("agencyId", "==", authz.decoded.uid)
            .get();

        let customers = snap.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                email: data.email || "",
                firstName: data.firstName || "",
                lastName: data.lastName || "",
                phone: data.phone || "",
                companyName: data.companyName || "",
                companyWebsite: data.companyWebsite || "",
                industry: data.industry || "ecommerce",
                role: data.role || "TENANT_ADMIN",
                isActive: data.isActive !== false,
                isArchived: data.isArchived === true,
                createdAt: data.createdAt || null,
                subscription: data.subscription || null
            };
        });

        if (!includeArchived) {
            customers = customers.filter((customer) => !customer.isArchived);
        }

        customers.sort((a, b) => {
            const left = (a.companyName || a.email).toLowerCase();
            const right = (b.companyName || b.email).toLowerCase();
            return left.localeCompare(right);
        });

        await logPlatformEvent({
            event_type: "agency_customers_list",
            actor: buildActorFromRequest(req, { uid: authz.decoded.uid, role: "AGENCY_ADMIN" }),
            source_module: "agency",
            result: "success",
            metadata: { count: customers.length }
        });

        return NextResponse.json({ customers });
    } catch (error: any) {
        console.error("Agency customers list error:", error);
        return NextResponse.json({ error: error?.message || "Failed to fetch customers" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const authz = await getAgencyCaller(req);
        if (!authz.ok) {
            return authz.response;
        }

        const body = await req.json();
        const {
            email,
            password,
            firstName,
            lastName,
            phone,
            companyName,
            companyWebsite,
            industry,
            enablePersonalShopper
        } = body || {};

        if (!email || !password || !companyName) {
            return NextResponse.json({ error: "email, password and companyName are required" }, { status: 400 });
        }

        const created = await provisionTenantAccount(authz.adminAuth, authz.adminDb, {
            email,
            password,
            firstName,
            lastName,
            phone,
            companyName,
            companyWebsite,
            industry,
            enablePersonalShopper,
            agencyId: authz.decoded.uid,
            agencyAssignedBy: authz.decoded.uid
        });

        await logPlatformEvent({
            event_type: "agency_customer_create",
            actor: buildActorFromRequest(req, { uid: authz.decoded.uid, role: "AGENCY_ADMIN" }),
            source_module: "agency",
            result: "success",
            target: { tenantId: created.userId }
        });

        return NextResponse.json({ success: true, userId: created.userId });
    } catch (error: any) {
        console.error("Agency customer create error:", error);

        if (error?.code === "auth/email-already-exists") {
            return NextResponse.json({ error: "Email already in use" }, { status: 409 });
        }

        return NextResponse.json({ error: error?.message || "Failed to create customer" }, { status: 500 });
    }
}
