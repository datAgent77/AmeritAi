import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { sendTransactionalEmail } from "@/lib/email-service"
import { isWinningPrize } from "@/lib/gamification/spin-engine"

export const runtime = "nodejs"

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const body = await req.json()
        const { chatbotId, sessionId, visitorId, name, email, phone, kvkk } = body

        if (!chatbotId || !email || !name) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const dedupKey = visitorId || sessionId
        if (!dedupKey) {
            return NextResponse.json({ error: "Missing session info" }, { status: 400 })
        }

        // Find the spin record to update it
        const spinSnap = await adminDb
            .collection("gamification_spins")
            .where("chatbotId", "==", chatbotId)
            .where("dedupKey", "==", dedupKey)
            .limit(1)
            .get()

        if (spinSnap.empty) {
            return NextResponse.json({ error: "Spin record not found" }, { status: 404 })
        }

        const spinData = spinSnap.docs[0].data()
        const isWinner = typeof spinData.isWinner === "boolean"
            ? spinData.isWinner
            : isWinningPrize({ name: spinData.prizeWon || "" })
        if (!isWinner) {
            return NextResponse.json({ error: "Prize is not claimable" }, { status: 400 })
        }

        const spinDocId = spinSnap.docs[0].id
        await adminDb.collection("gamification_spins").doc(spinDocId).update({
            contactName: name,
            contactEmail: email,
            contactPhone: phone,
            kvkkAccepted: kvkk,
            updatedAt: new Date().toISOString()
        })

        const chatbotSnap = await adminDb.collection("chatbots").doc(chatbotId).get()
        const chatbotData = chatbotSnap.data() || {}
        const businessName = chatbotData.businessName || chatbotData.name || "Vion AI"
        const prize = spinData.prizeWon || "-"
        const couponCode = spinData.couponCode || null
        const safeBusinessName = escapeHtml(String(businessName))
        const safePrize = escapeHtml(String(prize))
        const safeCouponCode = couponCode ? escapeHtml(String(couponCode)) : null

        // Also update the winner record in the sub-collection
        const winnerSnap = await adminDb
            .collection("chatbots")
            .doc(chatbotId)
            .collection("gamification_winners")
            .where("sessionId", "==", sessionId)
            .limit(1)
            .get()
        
        if (!winnerSnap.empty) {
            const docId = winnerSnap.docs[0].id
            await adminDb.collection("chatbots").doc(chatbotId)
                .collection("gamification_winners")
                .doc(docId)
                .update({
                    name,
                    email,
                    phone,
                    kvkkAccepted: kvkk,
                    updatedAt: new Date().toISOString()
                })
        } else {
            // If winner record doesn't exist (maybe different sessionId logic), create one
            // only after verifying the spin result is claimable.
             await adminDb.collection("chatbots").doc(chatbotId)
                .collection("gamification_winners")
                .add({
                    name,
                    email,
                    phone,
                    kvkkAccepted: kvkk,
                    prize,
                    couponCode,
                    isWinner: true,
                    playedAt: new Date(),
                    sessionId: sessionId || null,
                    leadSource: "gamification_claim"
                })
        }

        const emailSubject = couponCode
            ? `${businessName} kupon kodunuz hazır`
            : `${businessName} ödül bilginiz hazır`
        const emailHtml = `<!doctype html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:Segoe UI,Tahoma,Verdana,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr>
          <td style="padding:24px 28px;background:#7c3aed;color:#fff;">
            <div style="font-size:13px;opacity:.9;">${safeBusinessName}</div>
            <div style="margin-top:6px;font-size:20px;font-weight:700;">Ödülünüz hazır</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#374151;">Tebrikler, oyun sonucunda <strong>${safePrize}</strong> kazandınız.</p>
            ${safeCouponCode ? `
            <div style="margin:18px 0;padding:18px;border:2px dashed #a78bfa;border-radius:12px;background:#f5f3ff;text-align:center;">
              <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">Kupon kodunuz</div>
              <div style="font-family:monospace;font-size:26px;font-weight:800;letter-spacing:3px;color:#6d28d9;">${safeCouponCode}</div>
            </div>` : `
            <div style="margin:18px 0;padding:18px;border-radius:12px;background:#f9fafb;color:#374151;">Ödülünüz işletme ekibi tarafından e-posta adresiniz üzerinden takip edilecektir.</div>`}
            <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">Bu e-posta Vion AI gamification modülü üzerinden otomatik gönderilmiştir.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
        const emailText = couponCode
            ? `${businessName} - Ödülünüz hazır\n\nKazanılan ödül: ${prize}\nKupon kodunuz: ${couponCode}\n\nVion AI`
            : `${businessName} - Ödülünüz hazır\n\nKazanılan ödül: ${prize}\nÖdülünüz işletme ekibi tarafından e-posta adresiniz üzerinden takip edilecektir.\n\nVion AI`

        const emailSent = await sendTransactionalEmail({
            to: email,
            subject: emailSubject,
            html: emailHtml,
            text: emailText,
        })

        await adminDb.collection("gamification_spins").doc(spinDocId).update({
            rewardEmailSent: emailSent,
            rewardEmailSentAt: emailSent ? new Date().toISOString() : null,
        })

        return NextResponse.json({ success: true, emailSent })
    } catch (error: any) {
        console.error("gamification/claim POST:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
