import { authorizeTargetAccess } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { getIntegrationMinPlan } from "@/lib/integration-access-config";
import { getPlan } from "@/lib/pricing-config";

type IntegrationAccessAllowed = {
    ok: true;
    callerUid: string;
    isSuperAdmin: boolean;
    isAgencyAdmin: boolean;
    currentPlanId: string | null;
    requiredPlanId: string | null;
};

type IntegrationAccessDenied = {
    ok: false;
    response: Response;
};

type IntegrationAccessResult = IntegrationAccessAllowed | IntegrationAccessDenied;

export async function authorizeIntegrationAccess(
    req: Request,
    targetUserId: string,
    integrationId: string
): Promise<IntegrationAccessResult> {
    const access = await authorizeTargetAccess(req, targetUserId);
    if (!access.ok) return access;

    const requiredPlanId = getIntegrationMinPlan(integrationId);
    if (!requiredPlanId || access.isSuperAdmin) {
        return {
            ...access,
            currentPlanId: null,
            requiredPlanId,
        };
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
        return {
            ok: false,
            response: new Response(JSON.stringify({ error: "Internal Server Error" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }),
        };
    }

    const targetUserDoc = await adminDb.collection("users").doc(targetUserId).get();
    const targetUserData = targetUserDoc.data() || {};
    const currentPlanId = typeof targetUserData.planId === "string" ? targetUserData.planId : "starter";
    const currentPlan = getPlan(currentPlanId);
    const requiredPlan = getPlan(requiredPlanId);
    const currentSortOrder = currentPlan?.sortOrder ?? 1;
    const requiredSortOrder = requiredPlan?.sortOrder ?? 1;

    if (currentSortOrder >= requiredSortOrder) {
        return {
            ...access,
            currentPlanId,
            requiredPlanId,
        };
    }

    return {
        ok: false,
        response: new Response(JSON.stringify({
            error: "Plan upgrade required",
            requiredPlanId,
            integrationId,
        }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        }),
    };
}
