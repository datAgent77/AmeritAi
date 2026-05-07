import type * as admin from "firebase-admin";

export interface TenantProvisionInput {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    companyName?: string;
    companyWebsite?: string;
    industry?: string;
    enablePersonalShopper?: boolean;
    agencyId?: string | null;
    agencyAssignedBy?: string | null;
}

export interface TenantProvisionResult {
    userId: string;
}

function resolveAllowedDomains(companyWebsite?: string): string[] {
    if (typeof companyWebsite !== "string" || companyWebsite.trim().length === 0) {
        return [];
    }

    try {
        const normalized = companyWebsite.startsWith("http://") || companyWebsite.startsWith("https://")
            ? companyWebsite
            : `https://${companyWebsite}`;
        const hostname = new URL(normalized).hostname;
        return hostname ? [hostname] : [];
    } catch {
        return [];
    }
}

export async function provisionTenantAccount(
    adminAuth: admin.auth.Auth,
    adminDb: admin.firestore.Firestore,
    input: TenantProvisionInput
): Promise<TenantProvisionResult> {
    const createdAt = new Date().toISOString();
    const agencyId = typeof input.agencyId === "string" && input.agencyId.trim().length > 0
        ? input.agencyId.trim()
        : null;

    const userRecord = await adminAuth.createUser({
        email: input.email,
        password: input.password,
        displayName: `${input.firstName || ""} ${input.lastName || ""}`.trim(),
        disabled: false,
    });

    await adminAuth.setCustomUserClaims(userRecord.uid, { role: "TENANT_ADMIN" });

    await adminDb.collection("users").doc(userRecord.uid).set({
        email: userRecord.email,
        firstName: input.firstName || "",
        lastName: input.lastName || "",
        phone: input.phone || "",
        companyName: input.companyName || "",
        companyWebsite: input.companyWebsite || "",
        role: "TENANT_ADMIN",
        agencyId,
        agencyAssignedAt: agencyId ? createdAt : null,
        agencyAssignedBy: agencyId ? (input.agencyAssignedBy || null) : null,
        createdAt,
        isActive: true,
        isArchived: false,
        productEntitlements: {
            chatbot: true,
            omniChannel: false,
            cookieConsent: false,
            copywriter: false,
            leadFinder: false,
        },
        enableChatbot: true,
        enableOmniChannel: false,
        enableCookieConsent: false,
        enablePersonalShopper: input.enablePersonalShopper || false,
        industry: input.industry || "ecommerce"
    });

    await adminDb.collection("chatbots").doc(userRecord.uid).set({
        id: userRecord.uid,
        companyName: input.companyName || "My Company",
        isActive: true,
        createdAt,
        industry: input.industry || "ecommerce",
        welcomeMessage: "Hello! How can I help you today?",
        brandColor: "#000000",
        launcherStyle: "circle",
        position: "bottom-right",
        allowedDomains: resolveAllowedDomains(input.companyWebsite)
    });

    return { userId: userRecord.uid };
}
