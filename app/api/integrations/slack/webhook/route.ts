import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(_req: Request) {
    return NextResponse.json(
        {
            error: "Slack integration has been disabled",
            code: "INTEGRATION_DISABLED",
            integration: "slack"
        },
        { status: 410 }
    );
}
