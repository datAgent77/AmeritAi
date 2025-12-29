
import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();

        if (!adminAuth || !adminDb) {
            return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Verify Super Admin
        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        const userData = userDoc.data();

        if (userData?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const docStart = await adminDb.collection("system_settings").doc("ai_config").get();

        if (!docStart.exists) {
            // Return defaults if not configured
            return NextResponse.json({
                provider: "openai",
                model: "gpt-3.5-turbo",
                apiKey: "", // Don't return actual key if possible, or mask it
                isConfigured: false
            });
        }

        const data = docStart.data();

        // Return masked key for security in UI
        return NextResponse.json({
            ...data,
            apiKey: data?.apiKey ? "********" : "",
            isConfigured: true
        });

    } catch (error) {
        console.error("Error fetching AI settings:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();

        if (!adminAuth || !adminDb) {
            return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        const userData = userDoc.data();

        if (userData?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();

        // Validate inputs
        if (!['openai', 'google', 'anthropic'].includes(body.provider)) {
            return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
        }

        const updateData: any = {
            provider: body.provider,
            model: body.model,
            updatedAt: new Date().toISOString(),
            updatedBy: decodedToken.uid
        };

        // Only update API key if provided (not empty string or masked)
        if (body.apiKey && !body.apiKey.includes("****")) {
            updateData.apiKey = body.apiKey;
        }

        await adminDb.collection("system_settings").doc("ai_config").set(updateData, { merge: true });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error updating AI settings:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
