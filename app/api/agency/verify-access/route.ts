import { NextResponse } from "next/server";
import { authorizeTargetAccess } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const targetUserId = searchParams.get("targetUserId");
        if (!targetUserId) {
            return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(req, targetUserId);
        if (!authz.ok) {
            return authz.response; 
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("verify-access error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
