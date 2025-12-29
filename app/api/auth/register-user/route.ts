import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { createInitialEntitlements, TRIAL_CONFIG } from "@/lib/entitlements";
import { SectorId } from "@/lib/modules-registry";
import { normalizeSectorId } from "@/lib/entitlements-normalization";

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb();
        const adminAuth = getAdminAuth();

        if (!adminDb || !adminAuth) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 });
        }

        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        let decodedToken;

        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (e) {
            console.error("Token verification failed:", e);
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const { uid, email } = decodedToken;
        const body = await req.json();
        const { fullName, phoneNumber, industry, authProvider } = body;

        // Name parsing
        const nameParts = (fullName || "").trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Normalize sector from industry input
        const sectorId: SectorId = normalizeSectorId(industry || 'ecommerce');

        // Create initial entitlements using the entitlements system
        const entitlements = createInitialEntitlements(uid, sectorId);

        // Calculate trial end date from entitlements
        const trialEndDate = entitlements.trial.endAt
            ? new Date(entitlements.trial.endAt)
            : new Date(Date.now() + TRIAL_CONFIG.durationDays * 24 * 60 * 60 * 1000);

        // 1. Create User Document
        await adminDb.collection("users").doc(uid).set({
            firstName,
            lastName,
            fullName,
            email: email || body.email,
            phoneNumber: phoneNumber || "",
            authProvider: authProvider || "email",
            role: "TENANT_ADMIN",
            createdAt: new Date().toISOString(),
            isActive: true,

            // NEW: Normalized entitlements object (single source of truth)
            entitlements: {
                planId: entitlements.planId,
                sectorId: entitlements.sectorId,
                trial: entitlements.trial,
                modules: entitlements.modules,
                createdAt: entitlements.createdAt,
                updatedAt: entitlements.updatedAt
            },

            // Legacy fields (kept for backward compatibility)
            industry: industry || 'ecommerce',
            sector: sectorId,
            sectorId,
            plan: entitlements.planId,
            billingCycle: "monthly",
            subscriptionStatus: entitlements.trial.isActive ? "trial" : "active",
            trialEndsAt: trialEndDate.toISOString(),

            // Onboarding Status (forced for all new users)
            onboarding: {
                status: "pending",  // Changed from "not_started" to "pending" to force onboarding
                currentStep: 0,
                completedSteps: [],
                startedAt: null,
                completedAt: null
            },

            // Widget Config (Initial - empty)
            widget: {
                brandName: "",
                welcomeMessage: "",
                brandColor: "#6366f1",
                position: "bottom-right",
                isInstalled: false,
                lastVerifiedAt: null
            }
        });

        // 2. Set Custom Claims
        try {
            await adminAuth.setCustomUserClaims(uid, {
                role: "TENANT_ADMIN",
                plan: entitlements.planId
            });
        } catch (e) {
            console.error("Error setting custom claims:", e);
        }

        // 3. Create Chatbot Document
        await adminDb.collection("chatbots").doc(uid).set({
            companyName: fullName || "My Company",
            welcomeMessage: "Hello! How can I help you today?",
            brandColor: "#000000",
            brandLogo: "",
            suggestedQuestions: ["What are your pricing plans?", "How do I get started?", "Contact support"],
            sector: sectorId,
            sectorId,
            createdAt: new Date().toISOString()
        });

        return NextResponse.json({
            success: true,
            plan: entitlements.planId,
            sectorId: entitlements.sectorId,
            trialEndsAt: trialEndDate.toISOString(),
            enabledModules: entitlements.modules.enabled
        });

    } catch (error: any) {
        console.error("Register user error:", error);
        return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 });
    }
}
