
import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
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
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (e) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const userId = decodedToken.uid;
        const itemId = params.id;

        await adminDb.collection("chatbots").doc(userId).collection("menuItems").doc(itemId).delete();

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error deleting menu item:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (e) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const userId = decodedToken.uid;
        const itemId = params.id;
        const body = await req.json();

        // Prevent updating ID or createdAt if passed
        delete body.id;
        delete body.createdAt;

        const updateData = {
            ...body,
            updatedAt: new Date().toISOString()
        };

        await adminDb.collection("chatbots").doc(userId).collection("menuItems").doc(itemId).update(updateData);

        return NextResponse.json({ id: itemId, ...updateData });

    } catch (error) {
        console.error("Error updating menu item:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
