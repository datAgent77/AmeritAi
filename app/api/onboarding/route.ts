import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { STEP_INDEX, canAccessStep, OnboardingStep, STEP_CONFIG } from "@/lib/onboarding-config";
import { FieldValue } from "firebase-admin/firestore";

// GET: Get current onboarding status
export async function GET(req: Request) {
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

        const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
        const userData = userDoc.data();

        const onboarding = userData?.onboarding || {
            status: 'not_started',
            currentStep: 0,
            completedSteps: [],
            startedAt: null,
            completedAt: null
        };

        return NextResponse.json({
            onboarding,
            sector: userData?.sector || null,
            widget: userData?.widget || null,
            modules: userData?.modules || null,
            knowledgeUrl: userData?.knowledgeUrl || null
        });

    } catch (error: any) {
        console.error("[Onboarding Status] Error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}

// POST: Save progress for 'modules' step (non-mandatory, just marks as viewed)
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
        const { step } = body;

        if (step !== 'modules') {
            return NextResponse.json({ error: "Use specific endpoint for this step" }, { status: 400 });
        }

        // Check step order
        const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
        const userData = userDoc.data();
        const completedSteps: OnboardingStep[] = userData?.onboarding?.completedSteps || [];

        if (!canAccessStep('modules', completedSteps)) {
            return NextResponse.json({
                error: "Please complete previous steps first"
            }, { status: 403 });
        }

        // Just mark as completed and move to next
        await adminDb.collection("users").doc(decoded.uid).update({
            "onboarding.currentStep": STEP_INDEX.widget,
            "onboarding.completedSteps": FieldValue.arrayUnion("modules")
        });

        return NextResponse.json({
            success: true,
            nextStep: "widget"
        });

    } catch (error: any) {
        console.error("[Onboarding Progress] Error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
