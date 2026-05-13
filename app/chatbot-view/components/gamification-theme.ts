const FALLBACK_COLOR = "#8b5cf6"

type Rgb = {
    r: number
    g: number
    b: number
}

function normalizeHexColor(color?: string) {
    const value = color?.trim()
    if (!value) return FALLBACK_COLOR

    const shortHex = /^#([0-9a-fA-F]{3})$/
    const fullHex = /^#([0-9a-fA-F]{6})$/

    if (fullHex.test(value)) return value.toLowerCase()
    const shortMatch = value.match(shortHex)
    if (shortMatch) {
        return `#${shortMatch[1]
            .split("")
            .map((char) => `${char}${char}`)
            .join("")}`.toLowerCase()
    }

    return FALLBACK_COLOR
}

function hexToRgb(hex: string): Rgb {
    const normalized = normalizeHexColor(hex).slice(1)
    return {
        r: parseInt(normalized.slice(0, 2), 16),
        g: parseInt(normalized.slice(2, 4), 16),
        b: parseInt(normalized.slice(4, 6), 16),
    }
}

function rgbToHex({ r, g, b }: Rgb) {
    return `#${[r, g, b]
        .map((channel) => Math.round(Math.max(0, Math.min(255, channel))).toString(16).padStart(2, "0"))
        .join("")}`
}

function mix(color: string, target: string, weight: number) {
    const from = hexToRgb(color)
    const to = hexToRgb(target)
    const ratio = Math.max(0, Math.min(1, weight))

    return rgbToHex({
        r: from.r * (1 - ratio) + to.r * ratio,
        g: from.g * (1 - ratio) + to.g * ratio,
        b: from.b * (1 - ratio) + to.b * ratio,
    })
}

function rgba(color: string, alpha: number) {
    const { r, g, b } = hexToRgb(color)
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
}

function luminance(color: string) {
    const { r, g, b } = hexToRgb(color)
    const values = [r, g, b].map((channel) => {
        const normalized = channel / 255
        return normalized <= 0.03928
            ? normalized / 12.92
            : Math.pow((normalized + 0.055) / 1.055, 2.4)
    })

    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722
}

function readableText(color: string) {
    return luminance(color) > 0.5 ? "#111827" : "#ffffff"
}

export function getGamificationTheme(themeColor?: string) {
    const primary = normalizeHexColor(themeColor)
    const textOnPrimary = readableText(primary)
    const primaryDark = mix(primary, "#111827", 0.22)
    const primarySoft = mix(primary, "#ffffff", 0.9)
    const primarySoftStrong = mix(primary, "#ffffff", 0.78)
    const primaryText = luminance(primary) > 0.35 ? mix(primary, "#111827", 0.35) : primary
    const neutralAction = primaryDark

    return {
        primary,
        primaryDark,
        primarySoft,
        primarySoftStrong,
        primaryBorder: mix(primary, "#ffffff", 0.68),
        primaryText,
        textOnPrimary,
        textOnNeutralAction: readableText(neutralAction),
        subtleShadow: rgba(primary, 0.2),
        neutralAction,
        wheelColors: [
            primary,
            mix(primary, "#ffffff", 0.18),
            mix(primary, "#111827", 0.16),
            mix(primary, "#ffffff", 0.34),
            mix(primary, "#111827", 0.28),
            mix(primary, "#ffffff", 0.52),
        ],
    }
}
