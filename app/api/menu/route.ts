
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
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (e) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const userId = decodedToken.uid;
        const snapshot = await adminDb.collection("chatbots").doc(userId).collection("menuItems").get();

        const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json({ items });

    } catch (error) {
        console.error("Error fetching menu items:", error);
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
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (e) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const userId = decodedToken.uid;
        const body = await req.json();

        // Basic validation
        if (!body.name || !body.price) {
            return NextResponse.json({ error: "Name and price are required" }, { status: 400 });
        }

        const newItem = {
            ...body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await adminDb.collection("chatbots").doc(userId).collection("menuItems").add(newItem);

        return NextResponse.json({ id: docRef.id, ...newItem });

    } catch (error) {
        console.error("Error creating menu item:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
