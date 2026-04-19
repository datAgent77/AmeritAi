import { NextResponse } from "next/server"
import { authorizeOmniRequest, jsonError } from "@/lib/omni/server-utils"

export function getOmniAppChatbotId(req: Request) {
    const { searchParams } = new URL(req.url)
    return searchParams.get("chatbotId")
}

export async function authorizeOmniAppRequest(req: Request) {
    const chatbotId = getOmniAppChatbotId(req)
    if (!chatbotId) {
        return {
            ok: false as const,
            response: jsonError("chatbotId is required", 400),
        }
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz
    }

    return {
        ok: true as const,
        chatbotId,
        adminDb: authz.adminDb,
        callerUid: authz.callerUid,
        callerRole: authz.callerRole,
        callerPermissions: authz.callerPermissions,
        isSuperAdmin: authz.isSuperAdmin,
        isAgencyAdmin: authz.isAgencyAdmin,
    }
}

export async function fetchUpstreamJson<T>(req: Request, pathname: string, extraParams?: Record<string, string | number | null | undefined>) {
    const sourceUrl = new URL(req.url)
    sourceUrl.pathname = pathname

    Object.entries(extraParams || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
            sourceUrl.searchParams.delete(key)
            return
        }
        sourceUrl.searchParams.set(key, String(value))
    })

    const response = await fetch(sourceUrl, {
        headers: {
            authorization: req.headers.get("authorization") || "",
        },
        cache: "no-store",
    })

    const json = (await response.json().catch(() => null)) as T | null

    if (!response.ok || !json) {
        return {
            ok: false as const,
            response: NextResponse.json(json || { error: "Upstream request failed" }, { status: response.status || 500 }),
        }
    }

    return {
        ok: true as const,
        data: json,
    }
}
