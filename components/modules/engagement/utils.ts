import type { CSSProperties } from "react"
import type { EngagementSettings, EngagementBubbleStyle, EngagementAmbientAiBubbleTheme } from "./types"

export type EngagementPreviewVariantMode = "classic" | "ambient"

export const adjustColorBrightness = (hex: string, percent: number) => {
    if (!hex) return '#000000'
    const fullHex = hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (_m, r, g, b) => r + r + g + g + b + b)

    let num = parseInt(fullHex.replace("#", ""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        B = (num >> 8 & 0x00FF) + amt,
        G = (num & 0x0000FF) + amt
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (B < 255 ? B < 1 ? 0 : B : 255) * 0x100 + (G < 255 ? G < 1 ? 0 : G : 255)).toString(16).slice(1)
}

const getAmbientAiBubblePresetStyle = (
    base: EngagementBubbleStyle,
    theme: EngagementAmbientAiBubbleTheme = "default"
): Partial<EngagementBubbleStyle> => {
    const defaults: Partial<EngagementBubbleStyle> = {
        backgroundColor: base.backgroundColor || "#3557ff",
        textColor: "#FFFFFF",
        effect: "glass",
        backdropBlur: Math.max(base.backdropBlur || 0, 14),
        shape: "rounded",
        borderRadius: Math.max(base.borderRadius || 12, 18),
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
        shadow: "large",
    }

    if (theme === "minimal") {
        return {
            ...defaults,
            effect: "solid",
            backgroundColor: base.backgroundColor || "#101218",
            borderColor: "rgba(255,255,255,0.12)",
            borderWidth: 1,
            shadow: "small",
            borderRadius: Math.max(base.borderRadius || 12, 16),
        }
    }

    if (theme === "glass") {
        return {
            ...defaults,
            effect: "glass",
            backdropBlur: Math.max(base.backdropBlur || 0, 18),
            borderColor: "rgba(255,255,255,0.28)",
            shadow: "large",
            borderRadius: Math.max(base.borderRadius || 12, 20),
        }
    }

    if (theme === "compact") {
        return {
            ...defaults,
            fontSize: Math.min(base.fontSize || 14, 13),
            borderRadius: Math.max(base.borderRadius || 12, 14),
            shadow: "medium",
            backdropBlur: Math.max(base.backdropBlur || 0, 10),
        }
    }

    return defaults
}

export const getPreviewBubbleConfig = (settings: EngagementSettings, variantMode: EngagementPreviewVariantMode = "classic") => {
    const baseStyle = settings.bubble.style
    const ambientVariant = settings.bubble.ambientVariant
    const isAmbient = variantMode === "ambient"
    const ambientEnabled = !!(isAmbient && ambientVariant?.enabled)
    const renderStyle = (ambientEnabled ? ambientVariant?.renderStyle : undefined) || "custom"
    const aiBubbleTheme = (ambientVariant?.aiBubbleTheme || "default") as EngagementAmbientAiBubbleTheme

    let resolvedStyle: EngagementBubbleStyle = { ...baseStyle }
    if (ambientEnabled) {
        if (renderStyle === "ambient_ai_bubble" || renderStyle === "ambient_ai_bubble_typewriter") {
            resolvedStyle = {
                ...baseStyle,
                ...getAmbientAiBubblePresetStyle(baseStyle, aiBubbleTheme),
                ...(ambientVariant?.style || {})
            }
        } else {
            resolvedStyle = {
                ...baseStyle,
                ...(ambientVariant?.style || {})
            }
        }
    }

    return {
        style: resolvedStyle,
        animation: (ambientEnabled ? ambientVariant?.animation : settings.bubble.animation) || "bounce",
        position: (ambientEnabled ? ambientVariant?.position : settings.bubble.position) || "top",
        renderStyle,
        aiBubbleTheme,
        offsetX: Number.isFinite(Number(ambientVariant?.offsetX)) ? Number(ambientVariant?.offsetX) : 0,
        offsetY: Number.isFinite(Number(ambientVariant?.offsetY)) ? Number(ambientVariant?.offsetY) : 0,
        maxWidth: Number.isFinite(Number(ambientVariant?.maxWidth)) ? Number(ambientVariant?.maxWidth) : undefined,
        typewriter: {
            enabled: renderStyle === "ambient_ai_bubble_typewriter",
            charDelayMs: ambientVariant?.typewriter?.charDelayMs ?? 18,
            startDelayMs: ambientVariant?.typewriter?.startDelayMs ?? 100,
            cursorVisible: ambientVariant?.typewriter?.cursorVisible ?? true,
            cursorChar: ambientVariant?.typewriter?.cursorChar ?? "▍",
            completePauseMs: ambientVariant?.typewriter?.completePauseMs ?? 300
        }
    }
}

export const getPreviewStyle = (settings: EngagementSettings, variantMode: EngagementPreviewVariantMode = "classic"): CSSProperties => {
    const resolved = getPreviewBubbleConfig(settings, variantMode)
    const style = resolved.style
    const baseStyle: CSSProperties = {
        fontFamily: style.fontFamily,
        fontSize: `${style.fontSize}px`,
        opacity: style.opacity / 100,
        color: style.textColor,
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        maxWidth: resolved.maxWidth ? `${resolved.maxWidth}px` : undefined,
    }

    if (style.effect === 'glass') {
        baseStyle.backgroundColor = `${style.backgroundColor}A6`
        baseStyle.backdropFilter = `blur(${style.backdropBlur || 12}px)`
        baseStyle.border = style.borderWidth > 0
            ? `${style.borderWidth}px solid ${style.borderColor || `${style.textColor}26`}`
            : `1px solid ${style.textColor}26`
        baseStyle.boxShadow = '0 10px 30px rgba(0,0,0,0.18)'
    } else if (style.effect === 'gradient') {
        const color2 = adjustColorBrightness(style.backgroundColor, -40)
        baseStyle.background = `linear-gradient(135deg, ${style.backgroundColor} 0%, ${color2} 100%)`
        baseStyle.border = 'none'
    } else if (style.effect === 'outline') {
        baseStyle.backgroundColor = style.backgroundColor
        baseStyle.border = `2px solid ${style.textColor}`
    } else {
        baseStyle.backgroundColor = style.backgroundColor
        baseStyle.border = style.borderWidth > 0 ? `${style.borderWidth}px solid ${style.borderColor}` : '1px solid rgba(0,0,0,0.05)'
    }

    if (style.shape === 'pill') {
        baseStyle.borderRadius = '9999px'
    } else if (style.shape === 'square') {
        baseStyle.borderRadius = '0px'
    } else if (style.shape === 'speech') {
        baseStyle.borderRadius = `${style.borderRadius}px ${style.borderRadius}px ${style.borderRadius}px 4px`
    } else {
        baseStyle.borderRadius = `${style.borderRadius}px`
    }

    if (!baseStyle.boxShadow && style.effect !== 'glass') {
        if (style.shadow === 'glow') {
            baseStyle.boxShadow = `0 0 15px ${style.backgroundColor}60`
        } else {
            const shadows = {
                none: 'none',
                small: '0 2px 8px rgba(0,0,0,0.1)',
                medium: '0 4px 12px rgba(0,0,0,0.15)',
                large: '0 8px 24px rgba(0,0,0,0.2)'
            } as const
            baseStyle.boxShadow = shadows[style.shadow] || shadows.medium
        }
    }

    return baseStyle
}
