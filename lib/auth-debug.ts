type AuthDebugPayload = Record<string, unknown> | undefined

type AuthDebugEvent = {
    ts: string
    event: string
    payload?: AuthDebugPayload
}

declare global {
    interface Window {
        __VION_AUTH_DEBUG_EVENTS__?: AuthDebugEvent[]
        vionAuthDebugDump?: () => AuthDebugEvent[]
    }
}

const AUTH_DEBUG_STORAGE_KEY = "vion_auth_debug_events"
const AUTH_DEBUG_MAX_EVENTS = 200

function hasWindow() {
    return typeof window !== "undefined"
}

export function isAuthDebugEnabled(): boolean {
    if (!hasWindow()) return false

    try {
        const queryFlag = new URLSearchParams(window.location.search).get("authDebug") === "1"
        if (queryFlag) return true
    } catch {
        // no-op
    }

    try {
        return window.localStorage.getItem("vion_auth_debug") === "1"
    } catch {
        return false
    }
}

function appendEvent(entry: AuthDebugEvent) {
    if (!hasWindow()) return

    const current = window.__VION_AUTH_DEBUG_EVENTS__ || []
    const next = [...current, entry].slice(-AUTH_DEBUG_MAX_EVENTS)
    window.__VION_AUTH_DEBUG_EVENTS__ = next

    try {
        window.sessionStorage.setItem(AUTH_DEBUG_STORAGE_KEY, JSON.stringify(next))
    } catch {
        // no-op
    }
}

export function installAuthDebugDump() {
    if (!hasWindow() || !isAuthDebugEnabled()) return

    if (window.__VION_AUTH_DEBUG_EVENTS__ === undefined) {
        try {
            const raw = window.sessionStorage.getItem(AUTH_DEBUG_STORAGE_KEY)
            window.__VION_AUTH_DEBUG_EVENTS__ = raw ? (JSON.parse(raw) as AuthDebugEvent[]) : []
        } catch {
            window.__VION_AUTH_DEBUG_EVENTS__ = []
        }
    }

    if (!window.vionAuthDebugDump) {
        window.vionAuthDebugDump = () => window.__VION_AUTH_DEBUG_EVENTS__ || []
    }
}

export function recordAuthDebug(event: string, payload?: AuthDebugPayload) {
    if (!isAuthDebugEnabled()) return
    installAuthDebugDump()

    const entry: AuthDebugEvent = {
        ts: new Date().toISOString(),
        event,
        payload,
    }

    appendEvent(entry)

    try {
        console.warn("[AUTH-DEBUG]", entry.event, entry.payload || {})
    } catch {
        // no-op
    }
}

