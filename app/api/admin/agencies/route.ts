import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { buildActorFromRequest, logPlatformEvent } from "@/lib/server-event-log";
import { isSuperAdminRole } from "@/lib/user-roles";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();

        if (!adminAuth || !adminDb) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 });
        }

        const authHeader = req.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decoded = await adminAuth.verifyIdToken(token);
        const callerDoc = await adminDb.collection("users").doc(decoded.uid).get();
        const callerRole = callerDoc.data()?.role;
        const tokenRole = (decoded as any)?.role;

        if (!isSuperAdminRole(callerRole) && !isSuperAdminRole(tokenRole)) {
            await logPlatformEvent({
                event_type: "agencies_list",
                actor: buildActorFromRequest(req, { uid: decoded.uid, role: String(callerRole || tokenRole || "") }),
                source_module: "admin",
                result: "denied"
            });
            return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const includeArchived = searchParams.get("includeArchived") === "true";

        const [agencySnap, tenantsSnap] = await Promise.all([
            adminDb.collection("users").where("role", "==", "AGENCY_ADMIN").get(),
            adminDb.collection("users").where("role", "==", "TENANT_ADMIN").get()
        ]);

        const customerCountByAgency = new Map<string, number>();
        for (const doc of tenantsSnap.docs) {
            const agencyId = doc.data()?.agencyId;
            if (typeof agencyId === "string" && agencyId.length > 0) {
                customerCountByAgency.set(agencyId, (customerCountByAgency.get(agencyId) || 0) + 1);
            }
        }

        let agencies = agencySnap.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                email: data.email || "",
                agencyName: data.agencyName || "",
                firstName: data.firstName || "",
                lastName: data.lastName || "",
                phone: data.phone || "",
                isActive: data.isActive !== false,
                isArchived: data.isArchived === true,
                createdAt: data.createdAt || null,
                customerCount: customerCountByAgency.get(doc.id) || 0
            };
        });

        if (!includeArchived) {
            agencies = agencies.filter((agency) => !agency.isArchived);
        }

        agencies.sort((a, b) => {
            const left = (a.agencyName || a.email || "").toLowerCase();
            const right = (b.agencyName || b.email || "").toLowerCase();
            return left.localeCompare(right);
        });

        await logPlatformEvent({
            event_type: "agencies_list",
            actor: buildActorFromRequest(req, { uid: decoded.uid, role: "SUPER_ADMIN" }),
            source_module: "admin",
            result: "success",
            metadata: { count: agencies.length }
        });

        return NextResponse.json({ agencies });
    } catch (error: any) {
        console.error("Agencies list error:", error);
        return NextResponse.json({ error: error?.message || "Failed to list agencies" }, { status: 500 });
    }
}
