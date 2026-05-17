import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { getAdminNotificationEmail, sendTransactionalEmail } from '@/lib/email-service';

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const signupNotifyRateLimits = new Map<string, RateLimitEntry>();
const SIGNUP_NOTIFY_LIMIT = 2;
const SIGNUP_NOTIFY_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function consumeRateLimit(key: string) {
    const now = Date.now();
    const current = signupNotifyRateLimits.get(key);

    if (!current || now > current.resetAt) {
        signupNotifyRateLimits.set(key, { count: 1, resetAt: now + SIGNUP_NOTIFY_WINDOW_MS });
        return { allowed: true, remaining: SIGNUP_NOTIFY_LIMIT - 1 };
    }

    current.count += 1;
    signupNotifyRateLimits.set(key, current);

    return {
        allowed: current.count <= SIGNUP_NOTIFY_LIMIT,
        remaining: Math.max(0, SIGNUP_NOTIFY_LIMIT - current.count)
    };
}

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminAuth = getAdminAuth();
        if (!adminAuth) {
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        const token = authHeader.split("Bearer ")[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { email, name, company } = await req.json();
        const normalizedEmail = String(email || "").trim().toLowerCase();
        const normalizedName = String(name || "").trim().slice(0, 120);
        const normalizedCompany = String(company || "").trim().slice(0, 120);

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return NextResponse.json({ error: "Invalid email" }, { status: 400 });
        }
        if (!normalizedName) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        // Prevent authenticated users from sending arbitrary signup notifications for other emails.
        const callerEmail = String(decodedToken.email || "").trim().toLowerCase();
        if (callerEmail && callerEmail !== normalizedEmail) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const rate = consumeRateLimit(decodedToken.uid);
        if (!rate.allowed) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }

        const emailSent = await sendTransactionalEmail({
            to: getAdminNotificationEmail(),
            subject: `New User Signup: ${normalizedEmail}`,
            text: `
                New user signup details:
                
                Name: ${normalizedName}
                Email: ${normalizedEmail}
                Company: ${normalizedCompany || 'N/A'}
                
                Please review and approve in the admin panel.
            `,
            html: `
                <h3>New User Signup</h3>
                <p><strong>Name:</strong> ${normalizedName}</p>
                <p><strong>Email:</strong> ${normalizedEmail}</p>
                <p><strong>Company:</strong> ${normalizedCompany || 'N/A'}</p>
                <p>Please review and approve in the admin panel.</p>
            `
        });

        if (!emailSent) {
            return NextResponse.json({ error: 'Failed to send email' }, { status: 502 });
        }

        return NextResponse.json({
            success: true,
            remaining: rate.remaining
        });
    } catch (error) {
        console.error('Error sending signup email:', error);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
}
