import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { listManagedAccountsForViewer } from "@/lib/management/accounts";
import { getPartnerDoc } from "@/lib/management/partners";
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
        decoded,
        partner: await getPartnerDoc(adminDb, decoded.uid)
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
        const result = await listManagedAccountsForViewer({
            adminDb: authz.adminDb,
            viewerId: authz.decoded.uid,
            viewerRole: "AGENCY_ADMIN",
            canSwitchOmniAccounts: authz.partner?.capabilities.canSwitchOmniAccounts,
            includeArchived,
        });

        const customers = result.accounts.map((account) => ({
            id: account.id,
            email: account.email || "",
            firstName: account.firstName || "",
            lastName: account.lastName || "",
            phone: account.phone || "",
            companyName: account.companyName || "",
            industry: account.industry || "ecommerce",
            role: "TENANT_ADMIN",
            isActive: account.isActive,
            isArchived: account.isArchived,
            createdAt: account.createdAt || null,
            agencyId: account.agencyId || null,
            partnerId: account.partnerId || null,
            partnerName: account.partnerName || null,
            partnerLevel: account.partnerLevel || null,
            partnerLogoUrl: account.partnerLogoUrl || null,
            planId: account.planId || null,
            subscriptionStatus: account.subscriptionStatus || null,
            subscriptionBillingPeriod: account.subscriptionBillingPeriod || null,
        }));

        await logPlatformEvent({
            event_type: "agency_customers_list",
            actor: buildActorFromRequest(req, { uid: authz.decoded.uid, role: "AGENCY_ADMIN" }),
            source_module: "agency",
            result: "success",
            metadata: { count: customers.length }
        });

        return NextResponse.json({
            customers,
            viewerPartner: authz.partner,
            viewerCapabilities: authz.partner?.capabilities || null,
        });
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

        if (!authz.partner?.capabilities.canCreateManagedAccounts) {
            return NextResponse.json({ error: "Forbidden: Partner level cannot create customers" }, { status: 403 });
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
