
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { SEED_FAQS } from "@/lib/seed-cms-data";

export async function GET(req: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

        const snapshot = await db.collection("cms_faq").get();
        let faqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (faqs.length === 0) {
            console.log("Seeding FAQs...");
            const batch = db.batch();
            SEED_FAQS.forEach(faq => {
                const docRef = db.collection("cms_faq").doc();
                batch.set(docRef, faq);
            });
            await batch.commit();

            const newSnapshot = await db.collection("cms_faq").get();
            faqs = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        return NextResponse.json(faqs);
    } catch (error) {
        console.error("Error fetching FAQs:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

        const body = await req.json();
        const docRef = await db.collection("cms_faq").add(body);

        return NextResponse.json({ id: docRef.id, ...body });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
