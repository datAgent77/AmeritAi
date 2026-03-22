import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { authorizeTargetAccess } from "@/lib/api-auth";
import { isSuperAdminRole } from "@/lib/user-roles";

export const dynamic = 'force-dynamic';

// GET: Fetch tenant AI configuration
export async function GET(req: Request) {
    try {
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();

        if (!adminAuth || !adminDb) {
            return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
        }

        // Verify authentication
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Verify Super Admin role
        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        const userData = userDoc.data();

        const tokenRole = (decodedToken as any).role;
        if (!isSuperAdminRole(userData?.role) && !isSuperAdminRole(tokenRole)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get chatbotId from query params
        const { searchParams } = new URL(req.url);
        const chatbotId = searchParams.get("chatbotId");

        if (!chatbotId) {
            return NextResponse.json({ error: "chatbotId is required" }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(req, chatbotId);
        if (!authz.ok) {
            return authz.response;
        }
        if (!authz.isSuperAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Fetch chatbot document
        const chatbotDoc = await adminDb.collection("chatbots").doc(chatbotId).get();

        if (!chatbotDoc.exists) {
            return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
        }

        const chatbotData = chatbotDoc.data();
        const aiConfig = chatbotData?.aiConfig || {
            provider: null,
            model: null,
            useGlobalDefaults: true
        };

        return NextResponse.json({
            ...aiConfig,
            // Mask API key if present
            apiKey: aiConfig.apiKey ? "********" : ""
        });

    } catch (error) {
        console.error("Error fetching tenant AI config:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST: Update tenant AI configuration
export async function POST(req: Request) {
    try {
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();

        if (!adminAuth || !adminDb) {
            return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
        }

        // Verify authentication
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Verify Super Admin role
        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        const userData = userDoc.data();

        const tokenRole = (decodedToken as any).role;
        if (!isSuperAdminRole(userData?.role) && !isSuperAdminRole(tokenRole)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { chatbotId, provider, model, useGlobalDefaults, apiKey } = body;

        if (!chatbotId) {
            return NextResponse.json({ error: "chatbotId is required" }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(req, chatbotId);
        if (!authz.ok) {
            return authz.response;
        }
        if (!authz.isSuperAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Validate provider if provided
        if (provider && !['openai', 'google', 'anthropic'].includes(provider)) {
            return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
        }

        // Build update object
        const aiConfigUpdate: Record<string, any> = {
            useGlobalDefaults: useGlobalDefaults ?? true,
            updatedAt: new Date().toISOString(),
            updatedBy: decodedToken.uid
        };

        if (!useGlobalDefaults) {
            if (provider) aiConfigUpdate.provider = provider;
            if (model) aiConfigUpdate.model = model;
            // Only update API key if provided and not masked
            if (apiKey && !apiKey.includes("****")) {
                aiConfigUpdate.apiKey = apiKey;
            }
        }

        // Update chatbot document with aiConfig
        await adminDb.collection("chatbots").doc(chatbotId).set(
            { aiConfig: aiConfigUpdate },
            { merge: true }
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error updating tenant AI config:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
