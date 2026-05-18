import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

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
            planId: userData?.planId || userData?.entitlements?.planId || null,
            entitlements: userData?.entitlements || null,
            widget: userData?.widget || null,
            modules: userData?.modules || null,
            knowledgeUrl: userData?.knowledgeUrl || null
        });

    } catch (error: any) {
        console.error("[Onboarding Status] Error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
