import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { resolvePartnerCapabilities, resolvePartnerLevel } from "@/lib/management/access";
import { isAgencyAdminRole, isSuperAdminRole, isTenantAdminRole } from "./user-roles";

type AccessAllowed = {
    ok: true;
    callerUid: string;
    isSuperAdmin: boolean;
    isAgencyAdmin: boolean;
};

type AccessDenied = {
    ok: false;
    response: Response;
};

type AccessResult = AccessAllowed | AccessDenied;

function getBearerToken(req: Request): string | null {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return null;
    }
    return authHeader.split("Bearer ")[1];
}

/**
 * Allows access when caller owns target resource or has SUPER_ADMIN privileges.
 */
export async function authorizeTargetAccess(req: Request, targetUserId: string): Promise<AccessResult> {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    if (!adminAuth || !adminDb) {
        return {
            ok: false,
            response: new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 })
        };
    }

    const token = getBearerToken(req);
    if (!token) {
        return {
            ok: false,
            response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
        };
    }

    let decodedToken;
    try {
        decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
        return {
            ok: false,
            response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
        };
    }

    const callerUid = decodedToken.uid;
    if (callerUid === targetUserId) {
        return { ok: true, callerUid, isSuperAdmin: false, isAgencyAdmin: false };
    }

    const callerDoc = await adminDb.collection("users").doc(callerUid).get();
    const callerData = callerDoc.data() || {};
    const callerRole = callerData?.role;
    const decodedRole = (decodedToken as any).role;
    const targetDoc = await adminDb.collection("users").doc(targetUserId).get();
    const targetRole = targetDoc.data()?.role;
    const targetAgencyId = targetDoc.data()?.agencyId || null;

    const isSuperAdmin = isSuperAdminRole(callerRole) || isSuperAdminRole(decodedRole);

    if (isSuperAdmin) {
        return { ok: true, callerUid, isSuperAdmin: true, isAgencyAdmin: false };
    }

    const isAgencyAdmin = isAgencyAdminRole(callerRole) || isAgencyAdminRole(decodedRole);

    if (isAgencyAdmin && isTenantAdminRole(targetRole) && targetAgencyId === callerUid) {
        const partnerCapabilities = resolvePartnerCapabilities(resolvePartnerLevel(callerData.partnerLevel));
        if (!partnerCapabilities.canAccessManagedAccountWorkspace) {
            return {
                ok: false,
                response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
            };
        }
        return { ok: true, callerUid, isSuperAdmin: false, isAgencyAdmin: true };
    }

    return {
        ok: false,
        response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    };
}
