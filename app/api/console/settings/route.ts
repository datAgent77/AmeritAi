import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { authorizeTargetAccess } from "@/lib/api-auth";
import { shouldUseFirebaseOfflineFallback } from "@/lib/firebase-errors";
import { isAgentRole } from "@/lib/user-roles";

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb();
        const adminAuth = getAdminAuth();

        // 1. Check Server Configuration
        if (!adminAuth || !adminDb) {
            console.error("[Settings API] Firebase Admin SDK not initialized. Missing env vars?");
            return NextResponse.json({
                error: "Server Configuration Error: Firebase Admin not initialized. Check FIREBASE_PRIVATE_KEY."
            }, { status: 500 });
        }

        const body = await req.json();
        const { chatbotId, settings, chatbotSettings, userSettings } = body;

        if (!chatbotId) {
            return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(req, chatbotId);
        if (!authz.ok) {
            return authz.response;
        }

        const callerDoc = await adminDb.collection("users").doc(authz.callerUid).get();
        const callerRole = callerDoc.exists ? callerDoc.data()?.role : null;
        if (isAgentRole(callerRole)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const updates = [];

        // Support legacy 'settings' param as chatbotSettings for backward compat if any,
        // but prefer explicit keys.
        const chatUpdates = chatbotSettings || settings;
        const stripEnableFlags = (value: any) => {
            if (!value || typeof value !== "object" || Array.isArray(value)) return value;
            const copy: Record<string, any> = { ...value };
            for (const key of Object.keys(copy)) {
                if (key.startsWith("enable") && key !== "enableHumanHandoff") {
                    delete copy[key];
                }
            }
            return copy;
        };
        if (chatUpdates) {
            updates.push(adminDb.collection("chatbots").doc(chatbotId).set(chatUpdates, { merge: true }));
        }

        if (userSettings) {
            updates.push(adminDb.collection("users").doc(chatbotId).set(userSettings, { merge: true }));
        }

        await Promise.all(updates);

        return NextResponse.json({ success: true });

    } catch (error) {
        if (shouldUseFirebaseOfflineFallback(error)) {
            console.warn("[Settings API] Firestore unavailable; skipping development write.", error);
            return NextResponse.json({ success: true, offline: true });
        }

        console.error("Error updating settings:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb();

        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const chatbotId = searchParams.get("chatbotId");

        if (!chatbotId) {
            return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(req, chatbotId);
        if (!authz.ok) {
            return authz.response;
        }

        const chatbotDocPromise = adminDb.collection("chatbots").doc(chatbotId).get();
        const userDocPromise = adminDb.collection("users").doc(chatbotId).get();

        const [chatbotSnap, userSnap] = await Promise.all([chatbotDocPromise, userDocPromise]);

        if (!chatbotSnap.exists && !userSnap.exists) {
            return NextResponse.json({ error: "Settings not found" }, { status: 404 });
        }

        // Merge data, preferring chatbot doc for conflicts if any, but they should be disjoint mostly or managed by UI
        // Actually, let's return them structure or just flat merge?
        // UI expects flat fields usually.
        // But wait, Shopper page accesses `data.shopperConfig`.
        // Voice page accesses `data.elevenLabsApiKey` (from user doc).
        // So a flat merge of both data objects is perfect.

        const mergedData = {
            ...(userSnap.exists ? userSnap.data() : {}),
            ...(chatbotSnap.exists ? chatbotSnap.data() : {})
        };

        return NextResponse.json(mergedData);

    } catch (error) {
        if (shouldUseFirebaseOfflineFallback(error)) {
            console.warn("[Settings API] Firestore unavailable; returning development fallback.", error);
            return NextResponse.json({ offline: true });
        }

        console.error("Error fetching settings:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
