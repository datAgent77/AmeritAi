export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import { authorizeTargetAccess } from "@/lib/api-auth";
import { createOAuthState } from "@/lib/oauth-state";

export const runtime = 'nodejs'

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`
    : 'http://localhost:3000/api/calendar/google/callback'

const SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events.readonly'
].join(' ')

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const chatbotId = searchParams.get('chatbotId')

        if (!chatbotId) {
            return NextResponse.json({ error: 'chatbotId is required' }, { status: 400 })
        }

        const access = await authorizeTargetAccess(req, chatbotId);
        if (!access.ok) {
            const status = access.response.status;
            return NextResponse.json(
                { error: status === 403 ? 'Forbidden' : 'Unauthorized' },
                { status }
            );
        }

        if (!GOOGLE_CLIENT_ID) {
            return NextResponse.json({
                error: 'Google Calendar integration is not configured. Please add GOOGLE_CLIENT_ID to environment variables.'
            }, { status: 503 })
        }

        // Build OAuth URL
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
        authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
        authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI)
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('scope', SCOPES)
        authUrl.searchParams.set('access_type', 'offline')
        authUrl.searchParams.set('prompt', 'consent')
        const state = await createOAuthState({
            provider: 'calendar-google',
            userId: chatbotId
        });
        authUrl.searchParams.set('state', state)

        return NextResponse.json({ authUrl: authUrl.toString() })
    } catch (error: any) {
        console.error('Google Auth Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
