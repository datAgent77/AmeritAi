import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { resolvePartnerLevel } from "@/lib/management/access";
import { buildActorFromRequest, logPlatformEvent } from "@/lib/server-event-log";
import { isSuperAdminRole } from "@/lib/user-roles";

function hasSuperAdminAccess(userRole: string | undefined, tokenRole: string | undefined) {
    return isSuperAdminRole(userRole) || isSuperAdminRole(tokenRole);
}

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb();
        const adminAuth = getAdminAuth();

        if (!adminDb || !adminAuth) {
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

        if (!hasSuperAdminAccess(callerRole, tokenRole)) {
            await logPlatformEvent({
                event_type: "agency_create",
                actor: buildActorFromRequest(req, { uid: decoded.uid, role: String(callerRole || tokenRole || "") }),
                source_module: "admin",
                result: "denied"
            });
            return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
        }

        const body = await req.json();
        const {
            email,
            password,
            agencyName,
            partnerLevel,
            firstName,
            lastName,
            phone
        } = body || {};

        if (!email || !password || !agencyName) {
            return NextResponse.json({ error: "email, password and agencyName are required" }, { status: 400 });
        }

        const resolvedPartnerLevel = resolvePartnerLevel(partnerLevel)

        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: (agencyName || `${firstName || ""} ${lastName || ""}`.trim()).trim(),
            disabled: false,
        });

        await adminAuth.setCustomUserClaims(userRecord.uid, { role: "AGENCY_ADMIN" });

        await adminDb.collection("users").doc(userRecord.uid).set({
            email: userRecord.email,
            firstName: firstName || "",
            lastName: lastName || "",
            phone: phone || "",
            role: "AGENCY_ADMIN",
            agencyName: agencyName,
            partnerLevel: resolvedPartnerLevel,
            partnerLogoUrl: null,
            isActive: true,
            isArchived: false,
            createdAt: new Date().toISOString(),
            createdBy: decoded.uid,
        });

        await logPlatformEvent({
            event_type: "agency_create",
            actor: buildActorFromRequest(req, { uid: decoded.uid, role: "SUPER_ADMIN" }),
            source_module: "admin",
            result: "success",
            target: { agencyId: userRecord.uid }
        });

        return NextResponse.json({
            success: true,
            agencyId: userRecord.uid,
            partnerLevel: resolvedPartnerLevel,
        });
    } catch (error: any) {
        console.error("Create agency error:", error);

        if (error?.code === "auth/email-already-exists") {
            return NextResponse.json({ error: "Email already in use" }, { status: 409 });
        }

        return NextResponse.json({ error: error?.message || "Failed to create agency" }, { status: 500 });
    }
}
