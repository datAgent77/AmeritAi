import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { STEP_INDEX, canAccessStep, OnboardingStep } from "@/lib/onboarding-config";
import { FieldValue } from "firebase-admin/firestore";

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
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        let decoded;
        try {
            decoded = await adminAuth.verifyIdToken(token);
        } catch {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const body = await req.json();
        const { url, fullCrawl } = body;

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        // Check step order
        const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
        const userData = userDoc.data();
        const completedSteps: OnboardingStep[] = userData?.onboarding?.completedSteps || [];

        // Check if previous mandatory steps (sector) are done
        // 'modules' is step 1, 'knowledge' is step 2. 'sector' is step 0.
        // We can use canAccessStep('knowledge', completedSteps)
        if (!canAccessStep('knowledge', completedSteps)) {
            return NextResponse.json({
                error: "Please complete previous steps first"
            }, { status: 403 });
        }

        // Save URL and update progress
        await adminDb.collection("users").doc(decoded.uid).update({
            "knowledgeUrl": url,
            "fullCrawlPreference": !!fullCrawl,
            "onboarding.currentStep": STEP_INDEX.widget,
            "onboarding.completedSteps": FieldValue.arrayUnion("knowledge")
        });

        return NextResponse.json({
            success: true,
            nextStep: "widget"
        });

    } catch (error: any) {
        console.error("[Onboarding Knowledge] Error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
