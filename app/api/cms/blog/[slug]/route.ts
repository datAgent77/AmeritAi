
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
        }

        const slug = params.slug;

        const snapshot = await db.collection("cms_blog")
            .where("slug", "==", slug)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        const doc = snapshot.docs[0];
        return NextResponse.json({ id: doc.id, ...doc.data() });

    } catch (error) {
        console.error("Error fetching blog post:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
