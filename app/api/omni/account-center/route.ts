import { NextResponse } from "next/server"
import { authorizeOmniRequest, authorizedForOmniPermission, jsonError } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

function normalizePersonal(data: any) {
    return {
        email: data?.email || "",
        firstName: data?.firstName || "",
        lastName: data?.lastName || "",
        phone: data?.phone || "",
    }
}

function normalizeCompany(userData: any, chatbotData: any) {
    return {
        companyName: chatbotData?.companyName || userData?.companyName || "",
        companyWebsite: userData?.companyWebsite || "",
        companyAddress: userData?.companyAddress || "",
        companyEmail: userData?.email || "",
        industry: chatbotData?.industry || userData?.industry || "",
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "accountCenter.view")) {
        return jsonError("Forbidden", 403)
    }

    const [userSnap, chatbotSnap] = await Promise.all([
        authz.adminDb.collection("users").doc(chatbotId).get(),
        authz.adminDb.collection("chatbots").doc(chatbotId).get(),
    ])

    const userData = userSnap.exists ? userSnap.data() || {} : {}
    const chatbotData = chatbotSnap.exists ? chatbotSnap.data() || {} : {}

    return NextResponse.json({
        personal: normalizePersonal(userData),
        company: normalizeCompany(userData, chatbotData),
        subscription: {
            planId: userData?.planId || "starter",
            subscriptionStatus: userData?.subscriptionStatus || "trial",
            trialEndsAt: userData?.trialEndsAt || null,
            billingCycle: userData?.billingCycle || "monthly",
            lastUpgradeRequest: userData?.lastUpgradeRequest || null,
        },
    })
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => null)
    const chatbotId = typeof body?.chatbotId === "string" ? body.chatbotId : ""

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "accountCenter.manage")) {
        return jsonError("Forbidden", 403)
    }

    const now = new Date().toISOString()
    const personal = body?.personal && typeof body.personal === "object" ? body.personal : null
    const company = body?.company && typeof body.company === "object" ? body.company : null

    const userUpdates: Record<string, unknown> = {}
    const chatbotUpdates: Record<string, unknown> = {}

    if (personal) {
        if (typeof personal.firstName === "string") userUpdates.firstName = personal.firstName.trim()
        if (typeof personal.lastName === "string") userUpdates.lastName = personal.lastName.trim()
        if (typeof personal.phone === "string") userUpdates.phone = personal.phone.trim()
    }

    if (company) {
        if (typeof company.companyName === "string") {
            const companyName = company.companyName.trim()
            userUpdates.companyName = companyName
            chatbotUpdates.companyName = companyName
        }
        if (typeof company.companyWebsite === "string") userUpdates.companyWebsite = company.companyWebsite.trim()
        if (typeof company.companyAddress === "string") userUpdates.companyAddress = company.companyAddress.trim()
        if (typeof company.industry === "string") {
            const industry = company.industry.trim()
            userUpdates.industry = industry
            chatbotUpdates.industry = industry
            chatbotUpdates.sector = industry
            chatbotUpdates.sectorId = industry
        }
    }

    if (Object.keys(userUpdates).length === 0 && Object.keys(chatbotUpdates).length === 0) {
        return jsonError("No valid fields to update", 400)
    }

    userUpdates.updatedAt = now
    chatbotUpdates.updatedAt = now

    const writes: Promise<unknown>[] = []
    if (Object.keys(userUpdates).length > 1 || (Object.keys(userUpdates).length === 1 && !('updatedAt' in userUpdates))) {
        writes.push(authz.adminDb.collection("users").doc(chatbotId).set(userUpdates, { merge: true }))
    }
    if (Object.keys(chatbotUpdates).length > 1 || (Object.keys(chatbotUpdates).length === 1 && !('updatedAt' in chatbotUpdates))) {
        writes.push(authz.adminDb.collection("chatbots").doc(chatbotId).set(chatbotUpdates, { merge: true }))
    }

    if (writes.length === 0) {
        return jsonError("No valid fields to update", 400)
    }

    await Promise.all(writes)

    const [userSnap, chatbotSnap] = await Promise.all([
        authz.adminDb.collection("users").doc(chatbotId).get(),
        authz.adminDb.collection("chatbots").doc(chatbotId).get(),
    ])

    const userData = userSnap.exists ? userSnap.data() || {} : {}
    const chatbotData = chatbotSnap.exists ? chatbotSnap.data() || {} : {}

    return NextResponse.json({
        success: true,
        personal: normalizePersonal(userData),
        company: normalizeCompany(userData, chatbotData),
    })
}
