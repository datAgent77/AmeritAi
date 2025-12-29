import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export const runtime = 'nodejs'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

// Helper to refresh access token if expired
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
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
        const timeMin = searchParams.get('timeMin') || new Date().toISOString()
        const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

        if (!chatbotId) {
            return NextResponse.json({ error: 'chatbotId is required' }, { status: 400 })
        }

        const adminDb = getAdminDb()
        if (!adminDb) {
            return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
        }

        // Get tokens
        const tokenDoc = await adminDb.collection('calendar_tokens').doc(chatbotId).get()
        if (!tokenDoc.exists || !tokenDoc.data()?.google) {
            return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 404 })
        }

        let { accessToken, refreshToken, expiresAt } = tokenDoc.data()!.google

        // Check if token expired and refresh
        if (new Date(expiresAt) < new Date()) {
            const newToken = await refreshAccessToken(refreshToken)
            if (!newToken) {
                return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 })
            }
            accessToken = newToken

            // Update token in Firestore
            await adminDb.collection('calendar_tokens').doc(chatbotId).set({
                google: {
                    ...tokenDoc.data()!.google,
                    accessToken: newToken,
                    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
                }
            }, { merge: true })
        }

        // Fetch events from Google Calendar
        const calendarUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
        calendarUrl.searchParams.set('timeMin', timeMin)
        calendarUrl.searchParams.set('timeMax', timeMax)
        calendarUrl.searchParams.set('singleEvents', 'true')
        calendarUrl.searchParams.set('orderBy', 'startTime')

        const eventsResponse = await fetch(calendarUrl.toString(), {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })

        if (!eventsResponse.ok) {
            const error = await eventsResponse.json()
            console.error('Google Calendar API Error:', error)
            return NextResponse.json({ error: 'Failed to fetch events' }, { status: eventsResponse.status })
        }

        const eventsData = await eventsResponse.json()

        // Transform events to our format
        const events = (eventsData.items || []).map((event: any) => ({
            id: event.id,
            title: event.summary || 'Busy',
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            source: 'google',
            status: event.status
        }))

        return NextResponse.json({ events })

    } catch (error: any) {
        console.error('Google Events Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
