export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export const runtime = 'nodejs'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`
    : 'http://localhost:3000/api/calendar/google/callback'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const code = searchParams.get('code')
        const state = searchParams.get('state') // chatbotId
        const error = searchParams.get('error')

        if (error) {
            // Redirect to appointments page with error
            return NextResponse.redirect(new URL(`/console/chatbot/appointments?error=${error}`, req.url))
        }

        if (!code || !state) {
            return NextResponse.redirect(new URL('/console/chatbot/appointments?error=missing_params', req.url))
        }

        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
            return NextResponse.redirect(new URL('/console/chatbot/appointments?error=not_configured', req.url))
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code'
            })
        })

        const tokens = await tokenResponse.json()

        if (tokens.error) {
            console.error('Google Token Error:', tokens)
            return NextResponse.redirect(new URL(`/console/chatbot/appointments?error=${tokens.error}`, req.url))
        }

        // Save tokens to Firestore
        const adminDb = getAdminDb()
        if (!adminDb) {
            return NextResponse.redirect(new URL('/console/chatbot/appointments?error=db_error', req.url))
        }

        await adminDb.collection('calendar_tokens').doc(state).set({
            google: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                scope: tokens.scope
            }
        }, { merge: true })

        // Update appointments_settings to mark as connected
        await adminDb.collection('appointments_settings').doc(state).set({
            googleCalendarConnected: true
        }, { merge: true })

        console.log('Google Calendar connected for chatbot:', state)

        // Redirect back to appointments page with success
        return NextResponse.redirect(new URL('/console/chatbot/appointments?tab=integrations&success=google', req.url))

    } catch (error: any) {
        console.error('Google Callback Error:', error)
        return NextResponse.redirect(new URL(`/console/chatbot/appointments?error=${error.message}`, req.url))
    }
}
