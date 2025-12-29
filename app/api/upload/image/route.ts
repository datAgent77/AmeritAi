import { NextResponse } from "next/server";
import { getAdminAuth, getAdminStorage } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const adminStorage = getAdminStorage();
        const adminAuth = getAdminAuth();

        // Check if Firebase Admin is configured
        if (!adminAuth || !adminStorage) {
            console.error("Firebase Admin SDK not initialized. Check environment variables.");
            return NextResponse.json({
                error: "Server configuration error. Firebase Admin not available."
            }, { status: 500 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;
        const path = formData.get("path") as string;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!path) {
            return NextResponse.json({ error: "No path provided" }, { status: 400 });
        }

        // Verify authentication
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        try {
            await adminAuth.verifyIdToken(token);
        } catch (error: any) {
            console.error("Token verification failed:", error.message);
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to Firebase Storage using Admin SDK (bypasses rules)
        const bucket = adminStorage.bucket();
        const fileRef = bucket.file(path);

        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type,
            },
        });

        // Make the file public or get a signed URL
        await fileRef.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

        return NextResponse.json({ url: publicUrl });

    } catch (error: any) {
        console.error("Upload handler error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
