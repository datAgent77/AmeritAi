import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

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

        // --- SECURITY CHECK ---
        const authHeader = req.headers.get("Authorization");
        console.log("[Settings API] Auth Header present:", !!authHeader)

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        let decodedToken;

        try {
            decodedToken = await adminAuth.verifyIdToken(idToken);
            console.log("[Settings API] Token verified for:", decodedToken.email)
        } catch (authError) {
            console.error("[Settings API] Token verification failed:", authError);
            return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
        }

        // Check permissions:
        // Allow if user is modifying their OWN data
        const isOwner = decodedToken.uid === chatbotId;

        // Allow if user is Super Admin (check by email for now, or custom claim if set)
        const isSuperAdmin = decodedToken.email === 'yasincelenkk@gmail.com' || decodedToken.role === 'super_admin';

        if (!isOwner && !isSuperAdmin) {
            return NextResponse.json({ error: "Forbidden: You can only modify your own settings" }, { status: 403 });
        }
        // ----------------------

        const updates = [];

        // Support legacy 'settings' param as chatbotSettings for backward compat if any,
        // but prefer explicit keys.
        const chatUpdates = chatbotSettings || settings;
        if (chatUpdates) {
            updates.push(adminDb.collection("chatbots").doc(chatbotId).set(chatUpdates, { merge: true }));
        }

        if (userSettings) {
            updates.push(adminDb.collection("users").doc(chatbotId).set(userSettings, { merge: true }));
        }

        await Promise.all(updates);

        return NextResponse.json({ success: true });

    } catch (error) {
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
        console.error("Error fetching settings:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
