import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { WidgetSchema, STEP_INDEX, canAccessStep, OnboardingStep } from "@/lib/onboarding-config";
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

        // Check step order - user must have completed previous steps
        const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
        const userData = userDoc.data();
        const completedSteps: OnboardingStep[] = userData?.onboarding?.completedSteps || [];

        if (!canAccessStep('widget', completedSteps)) {
            return NextResponse.json({
                error: "Please complete previous steps first",
                requiredSteps: ['sector', 'modules']
            }, { status: 403 });
        }

        // Validate input
        const body = await req.json();
        const validation = WidgetSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({
                error: "Validation failed",
                details: validation.error.issues
            }, { status: 400 });
        }

        const { brandName, welcomeMessage, brandColor, position } = validation.data;

        // Update user document
        await adminDb.collection("users").doc(decoded.uid).update({
            "widget.brandName": brandName,
            "widget.welcomeMessage": welcomeMessage,
            "widget.brandColor": brandColor,
            "widget.position": position,
            "onboarding.currentStep": STEP_INDEX.launch,
            "onboarding.completedSteps": FieldValue.arrayUnion("widget")
        });

        // Update chatbot document
        await adminDb.collection("chatbots").doc(decoded.uid).update({
            companyName: brandName,
            welcomeMessage,
            brandColor,
            position
        });

        return NextResponse.json({
            success: true,
            widget: { brandName, welcomeMessage, brandColor, position },
            nextStep: "launch"
        });

    } catch (error: any) {
        console.error("[Onboarding Widget] Error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
