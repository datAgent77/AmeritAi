import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { STEP_INDEX } from "@/lib/onboarding-config";
import { planExists, getAllPlans } from "@/lib/pricing-config";
import { FieldValue } from "firebase-admin/firestore";

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
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        let decoded;
        try {
            decoded = await adminAuth.verifyIdToken(token);
        } catch {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // Validate input
        const body = await req.json();
        const { planId } = body;

        // Check if planId is valid
        if (!planId || !planExists(planId)) {
            return NextResponse.json({ 
                error: "Invalid plan ID",
                validPlans: getAllPlans().map(p => p.planId)
            }, { status: 400 });
        }

        // Get user document
        const userRef = adminDb.collection("users").doc(decoded.uid);
        
        // Get selected plan details
        const selectedPlan = getAllPlans().find(p => p.planId === planId);
        const defaultModules = selectedPlan?.modules.defaultEnabled || [];

        // Update user document
        await userRef.update({
            // Update entitlements (source of truth)
            "entitlements.planId": planId,
            "entitlements.modules": defaultModules, // Auto-enable default modules
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

        return NextResponse.json({
            success: true,
            planId,
            nextStep: "knowledge"
        });

    } catch (error: any) {
        console.error("[Onboarding Plan] Error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
