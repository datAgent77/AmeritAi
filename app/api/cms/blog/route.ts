
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { SEED_BLOG_POSTS } from "@/lib/seed-cms-data";

export async function GET(req: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
        }

        const snapshot = await db.collection("cms_blog").orderBy("date", "desc").get();

        let posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Auto-seed if empty
        if (posts.length === 0) {
            console.log("Seeding Blog Posts...");
            const batch = db.batch();
            SEED_BLOG_POSTS.forEach(post => {
                const docRef = db.collection("cms_blog").doc();
                batch.set(docRef, post);
            });
            await batch.commit();
            // Fetch again
            const newSnapshot = await db.collection("cms_blog").orderBy("date", "desc").get();
            posts = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        return NextResponse.json(posts);
    } catch (error) {
        console.error("Error fetching blog posts:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

        const body = await req.json();
        const docRef = await db.collection("cms_blog").add(body);

        return NextResponse.json({ id: docRef.id, ...body });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
