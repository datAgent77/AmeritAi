const FIREBASE_UNAVAILABLE_CODES = new Set<unknown>([
    "unavailable",
    14,
    "app/network-error",
])

const FIREBASE_UNAVAILABLE_MESSAGES = [
    "EHOSTUNREACH",
    "ENETUNREACH",
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "ERR_ADDRESS_UNREACHABLE",
    "Could not reach Cloud Firestore backend",
    "The operation could not be completed",
]

export function isFirebaseNetworkError(error: unknown): boolean {
    const candidate = error as {
        code?: unknown
        errorInfo?: { code?: unknown }
        message?: unknown
        cause?: unknown
    } | null

    if (!candidate) return false

    if (
        FIREBASE_UNAVAILABLE_CODES.has(candidate.code) ||
        FIREBASE_UNAVAILABLE_CODES.has(candidate.errorInfo?.code)
    ) {
        return true
    }

    const message = [
        typeof candidate.message === "string" ? candidate.message : "",
        candidate.cause instanceof Error ? candidate.cause.message : "",
    ].join(" ")

    return FIREBASE_UNAVAILABLE_MESSAGES.some((fragment) => message.includes(fragment))
}

export function shouldUseFirebaseOfflineFallback(error: unknown): boolean {
    return process.env.NODE_ENV !== "production" && isFirebaseNetworkError(error)
}
