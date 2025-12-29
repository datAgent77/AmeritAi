export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export const runtime = 'nodejs'

const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID
const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET

// Helper to refresh access token if expired
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
    if (!OUTLOOK_CLIENT_ID || !OUTLOOK_CLIENT_SECRET) return null

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: OUTLOOK_CLIENT_ID,
            client_secret: OUTLOOK_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        })
    })

    const data = await response.json()
    return data.access_token || null
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const chatbotId = searchParams.get('chatbotId')
        const startDateTime = searchParams.get('startDateTime') || new Date().toISOString()
        const endDateTime = searchParams.get('endDateTime') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

        if (!chatbotId) {
            return NextResponse.json({ error: 'chatbotId is required' }, { status: 400 })
        }

        const adminDb = getAdminDb()
        if (!adminDb) {
            return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
        }

        // Get tokens
        const tokenDoc = await adminDb.collection('calendar_tokens').doc(chatbotId).get()
        if (!tokenDoc.exists || !tokenDoc.data()?.outlook) {
            return NextResponse.json({ error: 'Outlook Calendar not connected' }, { status: 404 })
        }

        let { accessToken, refreshToken, expiresAt } = tokenDoc.data()!.outlook

        // Check if token expired and refresh
        if (new Date(expiresAt) < new Date()) {
            const newToken = await refreshAccessToken(refreshToken)
            if (!newToken) {
                return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 })
            }
            accessToken = newToken

            // Update token in Firestore
            await adminDb.collection('calendar_tokens').doc(chatbotId).set({
                outlook: {
                    ...tokenDoc.data()!.outlook,
                    accessToken: newToken,
                    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
                }
            }, { merge: true })
        }

        // Fetch events from Microsoft Graph API
        const calendarUrl = new URL('https://graph.microsoft.com/v1.0/me/calendar/events')
        calendarUrl.searchParams.set('$filter', `start/dateTime ge '${startDateTime}' and end/dateTime le '${endDateTime}'`)
        calendarUrl.searchParams.set('$orderby', 'start/dateTime')
        calendarUrl.searchParams.set('$top', '50')

        const eventsResponse = await fetch(calendarUrl.toString(), {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })

        if (!eventsResponse.ok) {
            const error = await eventsResponse.json()
            console.error('Outlook Calendar API Error:', error)
            return NextResponse.json({ error: 'Failed to fetch events' }, { status: eventsResponse.status })
        }

        const eventsData = await eventsResponse.json()

        // Transform events to our format
        const events = (eventsData.value || []).map((event: any) => ({
            id: event.id,
            title: event.subject || 'Busy',
            start: event.start?.dateTime,
            end: event.end?.dateTime,
            source: 'outlook',
            status: event.showAs // free, busy, tentative, etc.
        }))

        return NextResponse.json({ events })

    } catch (error: any) {
        console.error('Outlook Events Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
