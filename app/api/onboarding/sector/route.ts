import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { SectorSchema, STEP_INDEX } from "@/lib/onboarding-config";
import { SectorId, getDefaultModulesForSector, getModule, ModuleId } from "@/lib/modules-registry";
import { canEnableModule, getModuleStatusForUI } from "@/lib/entitlements";
import { extractEntitlementsFromDoc } from "@/lib/entitlements-normalization";
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
        const validation = SectorSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({
                error: "Validation failed",
                details: validation.error.issues
            }, { status: 400 });
        }

        const { sector } = validation.data;
        const sectorId = sector as SectorId;

        // Get user document to extract entitlements
        const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
        const userData = userDoc.data();

        if (!userData) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Extract existing entitlements
        const entitlements = extractEntitlementsFromDoc(decoded.uid, userData);

        // Update sector in entitlements
        entitlements.sectorId = sectorId;

        // Get sector default modules
        const sectorModules = getDefaultModulesForSector(sectorId);

        // Update enabled modules to include sector defaults
        entitlements.modules.enabled = sectorModules;
        entitlements.updatedAt = new Date().toISOString();

        // Build modules status object for UI (all registered modules)
        const modules: Record<string, any> = {};
        const allModuleIds = Object.keys(getModule as any); // Get all module IDs

        // For each module, compute its status based on entitlements
        for (const moduleId of sectorModules) {
            const status = getModuleStatusForUI(entitlements, moduleId as ModuleId);
            modules[moduleId] = {
                isEnabled: status.isEnabled,
                isPremium: status.badge === 'premium',
                lockedReason: status.isLocked ? "upgrade_required" : null
            };
        }

        // Update user document
        await adminDb.collection("users").doc(decoded.uid).update({
            // Update entitlements object
            "entitlements.sectorId": sectorId,
            "entitlements.modules.enabled": sectorModules,
            "entitlements.updatedAt": entitlements.updatedAt,

            // Update legacy fields for backward compatibility
            sector: sectorId,
            sectorId,
            industry: sectorId,

            // Update module status
            modules,

            // Update onboarding status
            "onboarding.status": "in_progress",
            "onboarding.currentStep": STEP_INDEX.modules,
            "onboarding.completedSteps": FieldValue.arrayUnion("sector"),
            "onboarding.startedAt": FieldValue.serverTimestamp()
        });

        // Also update chatbot document with sector
        await adminDb.collection("chatbots").doc(decoded.uid).update({
            sector: sectorId,
            sectorId,
            industry: sectorId // Also update industry for backward compatibility with ai-service
        });

        return NextResponse.json({
            success: true,
            sector: sectorId,
            modules,
            enabledModules: sectorModules,
            nextStep: "modules"
        });

    } catch (error: any) {
        console.error("[Onboarding Sector] Error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
