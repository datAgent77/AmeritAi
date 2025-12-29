
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { SEED_EDUCATION } from "@/lib/seed-cms-data";

export async function GET(req: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

        const snapshot = await db.collection("cms_education").get();
        let resources = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (resources.length === 0) {
            console.log("Seeding Education Resources...");
            const batch = db.batch();
            SEED_EDUCATION.forEach(res => {
                const docRef = db.collection("cms_education").doc();
                batch.set(docRef, res);
            });
            await batch.commit();

            const newSnapshot = await db.collection("cms_education").get();
            resources = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        return NextResponse.json(resources);
    } catch (error) {
        console.error("Error fetching Education resources:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

        const body = await req.json();
        const docRef = await db.collection("cms_education").add(body);

        return NextResponse.json({ id: docRef.id, ...body });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
