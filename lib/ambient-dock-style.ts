export type AmbientDockVisualState =
    | "collapsed-idle"
    | "collapsed-focused"
    | "open-idle"
    | "open-focused"

export type AmbientDockPreviewState = AmbientDockVisualState | "auto"

export type AmbientDockBorderMode = "solid" | "gradient" | "animated"

export interface AmbientDockStyleSettingsLike {
    brandColor?: string
    enableAmbientRainbowBorder?: boolean
    ambientClosedBgColor?: string
    ambientClosedBorderColorIdle?: string
    ambientClosedBorderColorFocused?: string
    ambientBorderColorIdle?: string
    ambientBorderColorFocused?: string
    ambientInputBgColorIdle?: string
    ambientInputBgColorFocused?: string
    ambientBorderGradientColor1?: string
    ambientBorderGradientColor2?: string
    ambientBorderGradientColor3?: string
    ambientBorderGradientColor4?: string
    ambientBorderGradientShowWhenCollapsed?: boolean
    ambientBorderGradientShowWhenOpen?: boolean
    ambientBorderGradientShowWhenThinking?: boolean
}

export interface ResolveAmbientDockStyleOptions {
    settings?: AmbientDockStyleSettingsLike | null
    state: AmbientDockVisualState
    isChatLoading?: boolean
}

export interface AmbientDockStyleResult {
    borderMode: AmbientDockBorderMode
    outerBorderColor?: string
    formBackgroundColor: string
    isCollapsed: boolean
    isFocused: boolean
    gradientColors: [string, string, string, string]
    gradientCssVars: Record<string, string>
}

const DEFAULT_CLOSED_BORDER_FOCUSED = "#d1d5db"
const DEFAULT_OPEN_BORDER_FOCUSED = "#3b82f6"
const DEFAULT_OPEN_BORDER_IDLE = "#17b5e8"
const DEFAULT_FORM_BG = "#f3f4f6"
const DEFAULT_GRADIENT_COLORS: [string, string, string, string] = ["#17b5e8", "#3f6eea", "#7c3aed", "#f59e0b"]

function isCollapsedState(state: AmbientDockVisualState) {
    return state.startsWith("collapsed")
}

function isFocusedState(state: AmbientDockVisualState) {
    return state.endsWith("focused")
}

export function resolveAmbientDockStyle({
    settings,
    state,
    isChatLoading = false,
}: ResolveAmbientDockStyleOptions): AmbientDockStyleResult {
    const isCollapsed = isCollapsedState(state)
    const isFocused = isFocusedState(state)
    const brandColor = settings?.brandColor || DEFAULT_OPEN_BORDER_FOCUSED
    const closedBg = settings?.ambientClosedBgColor || DEFAULT_FORM_BG
    const gradientColors: [string, string, string, string] = [
        settings?.ambientBorderGradientColor1 || DEFAULT_GRADIENT_COLORS[0],
        settings?.ambientBorderGradientColor2 || DEFAULT_GRADIENT_COLORS[1],
        settings?.ambientBorderGradientColor3 || DEFAULT_GRADIENT_COLORS[2],
        settings?.ambientBorderGradientColor4 || DEFAULT_GRADIENT_COLORS[3],
    ]
    const gradientCssVars = {
        "--ambient-g1": gradientColors[0],
        "--ambient-g2": gradientColors[1],
        "--ambient-g3": gradientColors[2],
        "--ambient-g4": gradientColors[3],
    }

    const rainbowEnabled = settings?.enableAmbientRainbowBorder === true
    const showWhenCollapsed = settings?.ambientBorderGradientShowWhenCollapsed ?? false
    const showWhenOpen = settings?.ambientBorderGradientShowWhenOpen ?? true
    const showWhenThinking = settings?.ambientBorderGradientShowWhenThinking ?? true
    const shouldAnimateGradient = rainbowEnabled && (
        (isChatLoading && showWhenThinking)
        || (!isChatLoading && isCollapsed && showWhenCollapsed)
        || (!isChatLoading && !isCollapsed && showWhenOpen)
    )

    if (isCollapsed) {
        if (shouldAnimateGradient) {
            return {
                borderMode: "animated",
                formBackgroundColor: closedBg,
                isCollapsed,
                isFocused,
                gradientColors,
                gradientCssVars,
            }
        }

        return {
            borderMode: "solid",
            outerBorderColor: isFocused
                ? (settings?.ambientBorderColorFocused || settings?.ambientClosedBorderColorFocused || brandColor || DEFAULT_CLOSED_BORDER_FOCUSED)
                : (settings?.ambientBorderColorIdle || settings?.ambientClosedBorderColorIdle || DEFAULT_OPEN_BORDER_IDLE),
            formBackgroundColor: closedBg,
            isCollapsed,
            isFocused,
            gradientColors,
            gradientCssVars,
        }
    }

    const formBackgroundColor = isFocused
        ? (settings?.ambientInputBgColorFocused || settings?.ambientInputBgColorIdle || closedBg)
        : (settings?.ambientInputBgColorIdle || closedBg)

    if (shouldAnimateGradient) {
        return {
            borderMode: "animated",
            formBackgroundColor,
            isCollapsed,
            isFocused,
            gradientColors,
            gradientCssVars,
        }
    }

    if (isFocused) {
        return {
            borderMode: "solid",
            outerBorderColor: settings?.ambientBorderColorFocused || settings?.ambientClosedBorderColorFocused || brandColor || DEFAULT_OPEN_BORDER_FOCUSED,
            formBackgroundColor,
            isCollapsed,
            isFocused,
            gradientColors,
            gradientCssVars,
        }
    }

    if (settings?.ambientBorderColorIdle || settings?.ambientClosedBorderColorIdle) {
        return {
            borderMode: "solid",
            outerBorderColor: settings?.ambientBorderColorIdle || settings?.ambientClosedBorderColorIdle,
            formBackgroundColor,
            isCollapsed,
            isFocused,
            gradientColors,
            gradientCssVars,
        }
    }

    return {
        borderMode: "gradient",
        formBackgroundColor,
        isCollapsed,
        isFocused,
        gradientColors,
        gradientCssVars,
    }
}

export function getAmbientDockStateKey(options: {
    isCollapsed: boolean
    isFocused: boolean
}): AmbientDockVisualState {
    const { isCollapsed, isFocused } = options
    if (isCollapsed) {
        return isFocused ? "collapsed-focused" : "collapsed-idle"
    }
    return isFocused ? "open-focused" : "open-idle"
}
