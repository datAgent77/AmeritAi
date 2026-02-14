import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(_req: Request) {
    return NextResponse.json(
        {
            error: "Constant Contact integration has been disabled",
            code: "INTEGRATION_DISABLED",
            integration: "constant-contact"
        },
        { status: 410 }
    );
}
