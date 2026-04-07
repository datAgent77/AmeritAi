const BLOCKED_WIDGET_ROUTE_PREFIXES = [
    "/admin",
    "/agency",
    "/console",
    "/menu",
    "/onboarding",
    "/chatbot-view",
    "/widget-test",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
]

const WIDGET_RUNTIME_IDS = [
    "userex-chatbot-launcher",
    "userex-launcher-wrapper",
    "userex-chatbot-container",
    "userex-engagement-bubble",
    "userex-mobile-styles",
    "userex-animation-styles",
    "userex-engagement-animations",
    "userex-lucide-script",
    "userex-sidecar-layout-styles",
]

type UserexWidgetApi = {
    destroy?: () => void
}

type WindowWithWidgetRuntime = Window & {
    __VION_WIDGET_INITIALIZED__?: boolean
    UserexWidget?: UserexWidgetApi
    userexEngagement?: {
        destroy?: () => void
    }
}

export function shouldDisablePublicWidget(pathname?: string | null) {
    return BLOCKED_WIDGET_ROUTE_PREFIXES.some((prefix) => pathname?.startsWith(prefix))
}

export function cleanupVionWidgetRuntime() {
    if (typeof window === "undefined") return

    const runtimeWindow = window as WindowWithWidgetRuntime

    try {
        runtimeWindow.UserexWidget?.destroy?.()
    } catch (error) {
        console.warn("Widget runtime cleanup: destroy API failed", error)
    }

    try {
        runtimeWindow.userexEngagement?.destroy?.()
    } catch (error) {
        console.warn("Widget runtime cleanup: engagement destroy failed", error)
    }

    WIDGET_RUNTIME_IDS.forEach((id) => {
        const node = document.getElementById(id)
        if (node?.parentNode) {
            node.parentNode.removeChild(node)
        }
    })

    document.querySelectorAll('script[src*="/widget.js"]').forEach((script) => {
        script.parentNode?.removeChild(script)
    })

    document.documentElement.classList.remove("userex-sidecar-active")
    document.documentElement.style.marginRight = ""
    document.documentElement.style.width = ""
    document.documentElement.style.transition = ""
    document.body.style.marginRight = ""
    document.body.style.overflowX = ""

    delete runtimeWindow.userexEngagement
    delete runtimeWindow.UserexWidget
    delete runtimeWindow.__VION_WIDGET_INITIALIZED__
}
