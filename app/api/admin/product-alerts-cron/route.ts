import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { sendTransactionalEmail } from "@/lib/email-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

function getCronSecret(req: Request) {
    return req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret")
}

export async function GET(req: Request) {
    if (getCronSecret(req) !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminDb = getAdminDb()
    if (!adminDb) return NextResponse.json({ error: "DB unavailable" }, { status: 500 })

    const alertsSnap = await adminDb
        .collection("product_alerts")
        .where("fired", "==", false)
        .limit(200)
        .get()

    let fired = 0
    let skipped = 0

    for (const alertDoc of alertsSnap.docs) {
        const alert = alertDoc.data()

        try {
            // Check current product state
            const productSnap = await adminDb
                .collection("products")
                .where("chatbotId", "==", alert.chatbotId)
                .where("platformId", "==", alert.productId)
                .limit(1)
                .get()

            if (productSnap.empty) { skipped++; continue }
            const product = productSnap.docs[0].data()

            let shouldFire = false
            let alertMessage = ""

            if (alert.alertType === "stock" && product.inStock) {
                shouldFire = true
                alertMessage = `"${product.name}" ürünü tekrar stokta!`
            } else if (
                alert.alertType === "price" &&
                alert.targetPrice != null &&
                product.price <= alert.targetPrice
            ) {
                shouldFire = true
                alertMessage = `"${product.name}" ürününde fiyat düştü! Şimdiki fiyat: ${product.price} ${product.currency}`
            }

            if (!shouldFire) { skipped++; continue }

            if (alert.contactEmail) {
                await sendTransactionalEmail({
                    to: alert.contactEmail,
                    subject: alertMessage,
                    html: `<p>${alertMessage}</p>${product.url ? `<p><a href="${product.url}">Ürünü Görüntüle</a></p>` : ""}`,
                    text: alertMessage,
                })
            }

            await alertDoc.ref.update({ fired: true, firedAt: new Date().toISOString() })
            fired++
        } catch {
            skipped++
        }
    }

    return NextResponse.json({ fired, skipped })
}
