import { NextResponse } from "next/server";

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const url = new URL(req.url);
        const action = url.searchParams.get('action'); // 'transcribe' or 'generate'

        if (action === 'transcribe') {
            const formData = await req.formData();

            const response = await fetch('https://api.klassifier.com/stt/transcribe', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                return new Response(errorText, { status: response.status });
            }

            const data = await response.json();
            return NextResponse.json(data);
        }

        if (action === 'generate') {
            const body = await req.json();

            const response = await fetch('https://api.klassifier.com/text-to-speech/generate-realtime', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                return new Response(errorText, { status: response.status });
            }

            const data = await response.json();
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Klassifier Proxy Error:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
