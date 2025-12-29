import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export const runtime = 'nodejs'

const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID
const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET
const OUTLOOK_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/outlook/callback`
    : 'http://localhost:3000/api/calendar/outlook/callback'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const code = searchParams.get('code')
        const state = searchParams.get('state') // chatbotId
        const error = searchParams.get('error')

        if (error) {
            return NextResponse.redirect(new URL(`/console/chatbot/appointments?error=${error}`, req.url))
        }

        if (!code || !state) {
            return NextResponse.redirect(new URL('/console/chatbot/appointments?error=missing_params', req.url))
        }

        if (!OUTLOOK_CLIENT_ID || !OUTLOOK_CLIENT_SECRET) {
            return NextResponse.redirect(new URL('/console/chatbot/appointments?error=not_configured', req.url))
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: OUTLOOK_CLIENT_ID,
                client_secret: OUTLOOK_CLIENT_SECRET,
                redirect_uri: OUTLOOK_REDIRECT_URI,
                grant_type: 'authorization_code'
            })
        })

        const tokens = await tokenResponse.json()

        if (tokens.error) {
            console.error('Outlook Token Error:', tokens)
            return NextResponse.redirect(new URL(`/console/chatbot/appointments?error=${tokens.error}`, req.url))
        }

        // Save tokens to Firestore
        const adminDb = getAdminDb()
        if (!adminDb) {
            return NextResponse.redirect(new URL('/console/chatbot/appointments?error=db_error', req.url))
        }

        await adminDb.collection('calendar_tokens').doc(state).set({
            outlook: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                scope: tokens.scope
            }
        }, { merge: true })

        // Update appointments_settings to mark as connected
        await adminDb.collection('appointments_settings').doc(state).set({
            outlookCalendarConnected: true
        }, { merge: true })

        console.log('Outlook Calendar connected for chatbot:', state)

        // Redirect back to appointments page with success
        return NextResponse.redirect(new URL('/console/chatbot/appointments?tab=integrations&success=outlook', req.url))

    } catch (error: any) {
        console.error('Outlook Callback Error:', error)
        return NextResponse.redirect(new URL(`/console/chatbot/appointments?error=${error.message}`, req.url))
    }
}
