import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb();
        const adminAuth = getAdminAuth();

        if (!adminDb || !adminAuth) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 });
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        try {
            await adminAuth.verifyIdToken(token);
        } catch {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const requestedLimit = Number.parseInt(searchParams.get("limit") || `${DEFAULT_LIMIT}`, 10);
        const limit = Number.isFinite(requestedLimit)
            ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT)
            : DEFAULT_LIMIT;

        const snapshot = await adminDb
            .collection("autopilot_runs")
            .orderBy("timestamp", "desc")
            .limit(limit)
            .get();

        const runs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json({
            success: true,
            runs
        });
    } catch (error: any) {
        console.error("Error fetching autopilot runs:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
