import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { VerifyInstallSchema } from "@/lib/onboarding-config";
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
        const validation = VerifyInstallSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({
                error: "Validation failed",
                details: validation.error.issues
            }, { status: 400 });
        }

        const { websiteUrl } = validation.data;
        const chatbotId = decoded.uid;

        let installed = false;
        let error: string | null = null;

        try {
            // Fetch the website with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch(websiteUrl, {
                headers: {
                    "User-Agent": "VionBot/1.0 (+https://vion.ai/bot)"
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                error = `Website returned status ${response.status}`;
            } else {
                const html = await response.text();

                // Check for widget script presence
                const hasDataAttribute = html.includes(`data-chatbot-id="${chatbotId}"`);
                const hasWidgetScript = html.includes('/widget.js') || html.includes('widget.js');
                const hasVionReference = html.includes('vion') || html.includes('Vion');

                installed = hasDataAttribute || (hasWidgetScript && hasVionReference);

                if (!installed) {
                    // Less strict check - just look for our script
                    installed = hasWidgetScript;
                }
            }
        } catch (fetchError: any) {
            if (fetchError.name === 'AbortError') {
                error = "Request timed out";
            } else {
                error = `Could not fetch URL: ${fetchError.message}`;
            }
        }

        // Update verification status (regardless of result - just track attempt)
        await adminDb.collection("users").doc(decoded.uid).update({
            "widget.isInstalled": installed,
            "widget.lastVerifiedAt": FieldValue.serverTimestamp(),
            "widget.websiteUrl": websiteUrl
        });

        // If installed, upgrade status from completed_soft to completed
        if (installed) {
            const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
            const userData = userDoc.data();

            if (userData?.onboarding?.status === 'completed_soft') {
                await adminDb.collection("users").doc(decoded.uid).update({
                    "onboarding.status": "completed"
                });
            }
        }

        return NextResponse.json({
            installed,
            error,
            message: installed
                ? "Widget detected on your website!"
                : error || "Widget not detected. Make sure the embed code is added."
        });

    } catch (error: any) {
        console.error("[Onboarding Verify Install] Error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
