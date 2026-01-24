## 2024-05-22 - [Critical] SSRF in URL Crawling
**Vulnerability:** The `/api/crawl` endpoint accepted arbitrary URLs without validation, allowing potential Server-Side Request Forgery (SSRF) attacks against internal services (e.g., cloud metadata, local network).
**Learning:** Next.js API routes that fetch external content must always validate the target URL to ensure it points to a public, safe destination.
**Prevention:** Use the `isSafeUrl` utility from `@/lib/security` for all user-provided URLs before making outbound requests.
