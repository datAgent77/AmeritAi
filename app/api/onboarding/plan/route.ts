import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { STEP_INDEX } from "@/lib/onboarding-config";
import { planExists, getAllPlans } from "@/lib/pricing-config";
import { FieldValue } from "firebase-admin/firestore";
import { buildActorFromRequest, logPlatformEvent } from "@/lib/server-event-log";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb();
        const adminAuth = getAdminAuth();

        if (!adminDb || !adminAuth) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 });
        }

        // Verify token
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            await logPlatformEvent({
                event_type: "onboarding_plan_select",
                actor: buildActorFromRequest(req),
                source_module: "onboarding_plan_api",
                result: "denied",
                metadata: { reason: "missing_bearer" }
            });
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        let decoded;
        try {
            decoded = await adminAuth.verifyIdToken(token);
        } catch {
            await logPlatformEvent({
                event_type: "onboarding_plan_select",
                actor: buildActorFromRequest(req),
                source_module: "onboarding_plan_api",
                result: "denied"
            });
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // Validate input
        const body = await req.json();
        const { planId } = body;

        // Check if planId is valid
        if (!planId || !planExists(planId)) {
            await logPlatformEvent({
                event_type: "onboarding_plan_select",
                actor: buildActorFromRequest(req, { uid: decoded.uid }),
                source_module: "onboarding_plan_api",
                result: "error",
                metadata: { reason: "invalid_plan", requested_plan_id: planId || null }
            });
            return NextResponse.json({ 
                error: "Invalid plan ID",
                validPlans: getAllPlans().map(p => p.planId)
            }, { status: 400 });
        }

        // Get user document
        const userRef = adminDb.collection("users").doc(decoded.uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userSnap.data() || {};

        // Get selected plan details
        const selectedPlan = getAllPlans().find(p => p.planId === planId);
        const defaultModules = (selectedPlan?.modules.defaultEnabled || []).filter(
            (moduleId): moduleId is string => typeof moduleId === "string"
        );
        const existingAddOns = Array.isArray(userData?.entitlements?.modules?.addOns)
            ? userData.entitlements.modules.addOns.filter((moduleId: unknown): moduleId is string => typeof moduleId === "string")
            : [];

        // Update user document
        await userRef.update({
            // Update entitlements (source of truth)
            "entitlements.planId": planId,
            "entitlements.modules": {
                enabled: defaultModules, // Auto-enable default modules
                addOns: existingAddOns
            },
            "entitlements.updatedAt": new Date().toISOString(),

            // Update legacy/root fields if necessary (some apps use root planId)
            planId: planId,

            // Update onboarding status
            "onboarding.status": "in_progress",
            // Skip 'modules' step, jump to 'knowledge'
            "onboarding.currentStep": STEP_INDEX.knowledge, 
            // Mark both plan and (implicitly) modules as completed
            "onboarding.completedSteps": FieldValue.arrayUnion("plan"),
            "onboarding.lastUpdated": FieldValue.serverTimestamp()
        });

        // Also update chatbot document if necessary (some logic might depend on it)
        try {
            await adminDb.collection("chatbots").doc(decoded.uid).update({
                planId: planId
            });
        } catch (error) {
            // Ignore if chatbot doc doesn't exist yet
            console.warn("Chatbot doc update failed (might not exist yet):", error);
        }

        await logPlatformEvent({
            event_type: "onboarding_plan_select",
            actor: buildActorFromRequest(req, { uid: decoded.uid }),
            source_module: "onboarding_plan_api",
            result: "success",
            target: { plan_id: planId }
        });

        return NextResponse.json({
            success: true,
            planId,
            nextStep: "knowledge"
        });

    } catch (error: any) {
        console.error("[Onboarding Plan] Error:", error);
        await logPlatformEvent({
            event_type: "onboarding_plan_select",
            actor: buildActorFromRequest(req),
            source_module: "onboarding_plan_api",
            result: "error",
            metadata: { error_message: error.message || "Internal error" }
        });
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
