export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import { authorizeTargetAccess } from "@/lib/api-auth";
import { createOAuthState } from "@/lib/oauth-state";

export const runtime = 'nodejs'

// Microsoft OAuth configuration
const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID
const OUTLOOK_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/outlook/callback`
    : 'http://localhost:3000/api/calendar/outlook/callback'

const SCOPES = [
    'openid',
    'profile',
    'offline_access',
    'Calendars.Read'
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

        if (!OUTLOOK_CLIENT_ID) {
            return NextResponse.json({
                error: 'Outlook Calendar integration is not configured. Please add OUTLOOK_CLIENT_ID to environment variables.'
            }, { status: 503 })
        }

        // Build OAuth URL
        const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
        authUrl.searchParams.set('client_id', OUTLOOK_CLIENT_ID)
        authUrl.searchParams.set('redirect_uri', OUTLOOK_REDIRECT_URI)
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('scope', SCOPES)
        authUrl.searchParams.set('response_mode', 'query')
        const state = await createOAuthState({
            provider: 'calendar-outlook',
            userId: chatbotId
        });
        authUrl.searchParams.set('state', state)

        return NextResponse.json({ authUrl: authUrl.toString() })
    } catch (error: any) {
        console.error('Outlook Auth Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
