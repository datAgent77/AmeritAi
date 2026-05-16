import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { CompleteSchema, MANDATORY_STEPS, areMandatoryStepsComplete, OnboardingStep } from "@/lib/onboarding-config";
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

        // Validate input
        const body = await req.json();
        const validation = CompleteSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({
                error: "Validation failed",
                details: validation.error.issues
            }, { status: 400 });
        }

        const { completionType } = validation.data;

        // Check mandatory steps are complete
        const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
        const userData = userDoc.data();
        const completedSteps: OnboardingStep[] = userData?.onboarding?.completedSteps || [];

        if (!areMandatoryStepsComplete(completedSteps)) {
            return NextResponse.json({
                error: "Mandatory steps not completed",
                requiredSteps: MANDATORY_STEPS,
                completedSteps
            }, { status: 403 });
        }

        // Determine final status
        const finalStatus = completionType === 'soft' ? 'completed_soft' : 'completed';

        // Update user document
        await adminDb.collection("users").doc(decoded.uid).update({
            "onboarding.status": finalStatus,
            "onboarding.completedSteps": FieldValue.arrayUnion("launch"),
            "onboarding.completedAt": FieldValue.serverTimestamp()
        });

        return NextResponse.json({
            success: true,
            status: finalStatus,
            message: finalStatus === 'completed_soft'
                ? "Onboarding completed. You can verify installation later."
                : "Onboarding fully completed!"
        });

    } catch (error: any) {
        console.error("[Onboarding Complete] Error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
