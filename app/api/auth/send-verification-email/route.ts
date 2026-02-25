import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { sendVerificationEmail } from "@/lib/email-service";

function getRequestOrigin(req: Request): string | null {
    try {
        return new URL(req.url).origin;
    } catch {
        return null;
    }
}

function resolveSafeContinueUrl(req: Request, bodyContinueUrl?: string): string {
    const requestOrigin = getRequestOrigin(req);
    const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL || requestOrigin || "http://localhost:3000";

    let fallbackUrl = `${configuredAppUrl.replace(/\/$/, "")}/login`;
    try {
        const normalizedConfiguredOrigin = new URL(configuredAppUrl).origin;
        fallbackUrl = `${normalizedConfiguredOrigin}/login`;

        if (!bodyContinueUrl || typeof bodyContinueUrl !== "string") {
            return fallbackUrl;
        }

        const parsed = new URL(bodyContinueUrl);
        if (parsed.origin !== normalizedConfiguredOrigin) {
            return fallbackUrl;
        }

        return parsed.toString();
    } catch {
        return fallbackUrl;
    }
}

export async function POST(req: Request) {
    try {
        if (process.env.AUTH_CUSTOM_VERIFICATION_EMAILS_ENABLED !== "true") {
            return NextResponse.json({ error: "Custom verification emails are disabled" }, { status: 503 });
        }

        const adminAuth = getAdminAuth();
        if (!adminAuth) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 });
        }

        const authHeader = req.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.slice("Bearer ".length);
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (error) {
            console.error("Send verification email: token verification failed", error);
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const body = await req.json().catch(() => ({} as Record<string, unknown>));
        const email = decodedToken.email || (typeof body.email === "string" ? body.email : "");
        if (!email) {
            return NextResponse.json({ error: "User email not found" }, { status: 400 });
        }

        const continueUrl = resolveSafeContinueUrl(req, typeof body.continueUrl === "string" ? body.continueUrl : undefined);
        const verificationLink = await adminAuth.generateEmailVerificationLink(email, {
            url: continueUrl,
        });

        const sent = await sendVerificationEmail({
            recipientEmail: email,
            recipientName: typeof body.name === "string" ? body.name : decodedToken.name,
            verificationLink,
            language: typeof body.language === "string" ? body.language : "en",
        });

        if (!sent) {
            return NextResponse.json({ error: "Verification email could not be sent" }, { status: 502 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Send verification email route error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to send verification email" },
            { status: 500 }
        );
    }
}
