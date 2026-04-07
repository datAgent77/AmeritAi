export type AmbientViewport = "mobile" | "desktop"
export type AmbientInputSizeKey = "sm" | "md" | "lg" | "xl"

interface AmbientLayoutSettingsLike {
    ambientWidth?: number | string
    ambientInputWidth?: number | string
    ambientSideMargin?: number
    ambientBottomMargin?: number
    ambientInputSize?: AmbientInputSizeKey | string
}

export interface AmbientInputSizeConfig {
    buttonSizeClass: string
    iconSizeClass: string
    textSizeClass: string
    leadingSizeClass: string
    leadingIconSizeClass: string
    formPaddingClass: string
    gapClass: string
    inputPaddingLeftClass: string
    inputPaddingRightClass: string
    inputPaddingYClass: string
}

export interface AmbientSurfaceLayout {
    railMaxWidth: string
    dockMaxWidth: string
    shellSidePaddingPx: number
    feedViewportInsetPx: number
    feedTopInsetPx: number
    bottomMarginPx: number
}

const DEFAULT_RAIL_WIDTH = "1080px"

const INPUT_SIZE_CONFIGS: Record<AmbientInputSizeKey, AmbientInputSizeConfig> = {
    sm: {
        buttonSizeClass: "h-8 w-8",
        iconSizeClass: "h-4 w-4",
        textSizeClass: "text-sm",
        leadingSizeClass: "h-7 w-7",
        leadingIconSizeClass: "h-4 w-4",
        formPaddingClass: "px-2 py-1.5",
        gapClass: "gap-1.5",
        inputPaddingLeftClass: "pl-3.5",
        inputPaddingRightClass: "pr-2",
        inputPaddingYClass: "py-2",
    },
    md: {
        buttonSizeClass: "h-9 w-9",
        iconSizeClass: "h-[18px] w-[18px]",
        textSizeClass: "text-base",
        leadingSizeClass: "h-8 w-8",
        leadingIconSizeClass: "h-[18px] w-[18px]",
        formPaddingClass: "px-2.5 py-2",
        gapClass: "gap-2",
        inputPaddingLeftClass: "pl-4",
        inputPaddingRightClass: "pr-2",
        inputPaddingYClass: "py-2.5",
    },
    lg: {
        buttonSizeClass: "h-10 w-10",
        iconSizeClass: "h-5 w-5",
        textSizeClass: "text-lg",
        leadingSizeClass: "h-9 w-9",
        leadingIconSizeClass: "h-5 w-5",
        formPaddingClass: "px-3 py-2.5",
        gapClass: "gap-2",
        inputPaddingLeftClass: "pl-4",
        inputPaddingRightClass: "pr-2.5",
        inputPaddingYClass: "py-3",
    },
    xl: {
        buttonSizeClass: "h-11 w-11",
        iconSizeClass: "h-5 w-5",
        textSizeClass: "text-xl",
        leadingSizeClass: "h-10 w-10",
        leadingIconSizeClass: "h-5 w-5",
        formPaddingClass: "px-3.5 py-3",
        gapClass: "gap-2.5",
        inputPaddingLeftClass: "pl-5",
        inputPaddingRightClass: "pr-3",
        inputPaddingYClass: "py-3.5",
    },
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
    const parsed = typeof value === "number" ? value : Number(value)
    if (!Number.isFinite(parsed)) return fallback
    return Math.min(max, Math.max(min, parsed))
}

function resolveWidth(value: unknown, fallback: string) {
    const parsed = typeof value === "number" ? value : Number(value)
    if (!Number.isFinite(parsed)) return fallback
    return parsed > 0 ? `${parsed}px` : "100%"
}

export function resolveAmbientInputSizeConfig(inputSize?: AmbientInputSizeKey | string | null): AmbientInputSizeConfig {
    if (inputSize && inputSize in INPUT_SIZE_CONFIGS) {
        return INPUT_SIZE_CONFIGS[inputSize as AmbientInputSizeKey]
    }

    return INPUT_SIZE_CONFIGS.lg
}

export function resolveAmbientSurfaceLayout(
    settings?: AmbientLayoutSettingsLike | null,
    viewport: AmbientViewport = "desktop",
): AmbientSurfaceLayout {
    const railMaxWidth = resolveWidth(settings?.ambientWidth, DEFAULT_RAIL_WIDTH)
    const dockMaxWidth = resolveWidth(settings?.ambientInputWidth ?? settings?.ambientWidth, railMaxWidth)

    return {
        railMaxWidth,
        dockMaxWidth,
        shellSidePaddingPx: clampNumber(settings?.ambientSideMargin, 0, 200, 0),
        feedViewportInsetPx: viewport === "mobile" ? 14 : 0,
        feedTopInsetPx: viewport === "mobile" ? 12 : 0,
        bottomMarginPx: clampNumber(settings?.ambientBottomMargin, 0, 200, 20),
    }
}
