/**
 * Centralized error reporting.
 *
 * Always logs to the server console. If ERROR_WEBHOOK_URL is configured, it also
 * forwards a compact payload there (fire-and-forget) — so you can pipe production
 * errors to Slack/Sentry/a logger without changing call sites. Wiring full Sentry
 * later becomes a config + small adapter change, not a code rewrite.
 *
 * This function never throws and never blocks the request path.
 */
export function captureError(error: unknown, context?: Record<string, unknown>) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Always log server-side (visible in Vercel/host logs).
    console.error("[captureError]", message, context ? JSON.stringify(context) : "", stack || "");

    const webhook = process.env.ERROR_WEBHOOK_URL?.trim();
    if (!webhook) return;

    try {
        void fetch(webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message,
                stack,
                context: context || {},
                ts: new Date().toISOString(),
                env: process.env.NODE_ENV,
            }),
            signal: AbortSignal.timeout(2000),
        }).catch(() => {
            /* never let error reporting cause errors */
        });
    } catch {
        /* ignore */
    }
}
