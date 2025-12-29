
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { tenantId: string } }) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
        }

        const { tenantId } = params;

        if (!tenantId) {
            return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
        }

        const snapshot = await adminDb.collection("chatbots")
            .doc(tenantId)
            .collection("menuItems")
            .get();

        const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json({ items });

    } catch (error) {
        console.error("Error fetching public menu:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
