import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();
        if (!adminAuth || !adminDb) {
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        const token = authHeader.split("Bearer ")[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const callerDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        const callerRole = callerDoc.data()?.role;
        const tokenRole = (decodedToken as any).role;
        const isSuperAdmin =
            callerRole === "SUPER_ADMIN" ||
            tokenRole === "SUPER_ADMIN" ||
            tokenRole === "super_admin";

        if (!isSuperAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { email, name } = await req.json();
        const normalizedEmail = String(email || "").trim().toLowerCase();
        const normalizedName = String(name || "").trim().slice(0, 120);

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return NextResponse.json({ error: "Invalid email" }, { status: 400 });
        }
        if (!normalizedName) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: normalizedEmail,
            subject: 'Your Vion Account has been Approved!',
            text: `
                Hello ${normalizedName},
                
                Your account for Vion has been approved!
                
                You can now log in to the platform at: https://app.userex.com.tr/login
                
                Best regards,
                The Vion Team
            `,
            html: `
                <h3>Welcome to Vion!</h3>
                <p>Hello ${normalizedName},</p>
                <p>Your account has been approved!</p>
                <p>You can now log in to the platform at: <a href="https://app.userex.com.tr/login">https://app.userex.com.tr/login</a></p>
                <br/>
                <p>Best regards,</p>
                <p>The Vion Team</p>
            `
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error sending approval email:', error);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
}
