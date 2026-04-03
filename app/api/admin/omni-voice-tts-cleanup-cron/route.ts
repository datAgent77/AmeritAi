import { NextResponse } from "next/server"
import { getAdminStorage } from "@/lib/firebase-admin"
import { isVoiceTtsCachePath } from "@/lib/omni/voice-renderer"

export const dynamic = "force-dynamic"

function getCronSecret(request: Request) {
    return request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret")
}

function readTtl(file: any) {
    const metadata = file.metadata || {}
    const customMetadata = metadata.metadata || {}
    const ttlValue = customMetadata.ttlAt || metadata.ttlAt || null
    const parsed = Number(ttlValue)
    return Number.isFinite(parsed) ? parsed : 0
}

export async function GET(request: Request) {
    const cronSecret = getCronSecret(request)
    if (cronSecret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminStorage = getAdminStorage()
    if (!adminStorage) {
        return NextResponse.json({ error: "Storage not initialized" }, { status: 500 })
    }

    const bucket = adminStorage.bucket()
    const [files] = await bucket.getFiles({ prefix: "omni/voice-tts/" })
    const now = Date.now()
    const expiredFiles = files.filter((file: any) => isVoiceTtsCachePath(file.name)).filter((file: any) => {
        const ttlAt = readTtl(file)
        return ttlAt > 0 && ttlAt <= now
    })

    let deleted = 0
    let failed = 0

    for (const file of expiredFiles) {
        try {
            await file.delete({ ignoreNotFound: true })
            deleted += 1
        } catch {
            failed += 1
        }
    }

    return NextResponse.json({
        ok: true,
        scanned: files.length,
        expired: expiredFiles.length,
        deleted,
        failed,
        processedAt: new Date().toISOString(),
    })
}
