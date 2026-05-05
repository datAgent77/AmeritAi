import { NextResponse } from "next/server"

// Minimal HTML page that loads the real widget.js for iframe preview
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId") || ""

    if (!chatbotId) {
        return new NextResponse("Missing chatbotId", { status: 400 })
    }

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Widget Preview</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
  </style>
</head>
<body>
  <script
    src="/widget.js?t=${Date.now()}"
    data-chatbot-id="${chatbotId}"
    data-runtime-mode="test"
    async
  ></script>
</body>
</html>`

    return new NextResponse(html, {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            // Allow embedding as iframe from same origin
            "X-Frame-Options": "SAMEORIGIN",
        },
    })
}
