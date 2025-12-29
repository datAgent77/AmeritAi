import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb();
        const adminAuth = getAdminAuth();

        if (!adminDb || !adminAuth) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 });
        }

        // Get the authorization header to verify the caller is a SUPER_ADMIN
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Unauthorized - No token provided" }, { status: 401 });
        }

        const { email, password, firstName, lastName, companyName, companyWebsite, phone, callerRole, enablePersonalShopper, industry } = await req.json();

        // Check if caller is SUPER_ADMIN
        if (callerRole !== 'SUPER_ADMIN') {
            console.log("Create Tenant API: Unauthorized - Not SUPER_ADMIN");
            return NextResponse.json({ error: "Unauthorized - SUPER_ADMIN role required" }, { status: 403 });
        }

        if (!adminAuth || !adminDb) {
            console.error("Create Tenant API: Firebase Admin not initialized");
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        console.log("Create Tenant API: Attempting to create user", email);

        // Create user using Admin SDK
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: `${firstName} ${lastName}`.trim(),
            disabled: false,
        });

        // Set Custom Claims (Role)
        await adminAuth.setCustomUserClaims(userRecord.uid, { role: "TENANT_ADMIN" });

        // Create user document in Firestore using Admin SDK
        await adminDb.collection("users").doc(userRecord.uid).set({
            email: userRecord.email,
            firstName: firstName || "",
            lastName: lastName || "",
            phone: phone || "",
            companyName: companyName || "",
            companyWebsite: companyWebsite || "",
            role: "TENANT_ADMIN",
            createdAt: new Date().toISOString(),
            isActive: true,
            enablePersonalShopper: enablePersonalShopper || false,
            industry: industry || "ecommerce"
        });

        // Initialize Chatbot Document
        await adminDb.collection("chatbots").doc(userRecord.uid).set({
            id: userRecord.uid,
            companyName: companyName || "My Company",
            isActive: true,
            createdAt: new Date().toISOString(),
            industry: industry || "ecommerce",
            welcomeMessage: "Hello! How can I help you today?",
            brandColor: "#000000",
            launcherStyle: "circle",
            position: "bottom-right",
            allowedDomains: companyWebsite ? [new URL(companyWebsite).hostname] : []
        });

        return NextResponse.json({ success: true, userId: userRecord.uid });

    } catch (error: any) {
        console.error("Error creating tenant:", error);

        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({
                error: "Bu e-posta adresi zaten kullanımda. (Not: Daha önce silinen kullanıcıların kayıtları Auth sisteminde kalmış olabilir. Lütfen farklı bir e-posta adresi kullanın.)"
            }, { status: 409 });
        }

        return NextResponse.json({ error: error.message || "Failed to create tenant" }, { status: 500 });
    }
}
