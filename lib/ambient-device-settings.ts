import type { AmbientDeviceAppearanceSettings } from "@/types/chatbot"

type DeviceKind = "mobile" | "desktop"

type AmbientSource = Record<string, any> & {
  ambientPerDeviceSettingsEnabled?: boolean
  ambientDesktopSettings?: AmbientDeviceAppearanceSettings | null
  ambientMobileSettings?: AmbientDeviceAppearanceSettings | null
}

const AMBIENT_DEVICE_KEYS = [
  "ambientMaxHeight",
  "ambientOverlayOpacity",
  "ambientWidth",
  "ambientInputWidth",
  "ambientSideMargin",
  "ambientBottomMargin",
  "ambientInputSize",
  "showAmbientIcon",
  "ambientIconUrl",
  "ambientIconType",
  "ambientLibraryIcon",
  "ambientIconColor",
  "ambientInputTextColor",
  "ambientPlaceholderText",
  "ambientTheme",
  "enableAmbientRainbowBorder",
  "ambientBorderColorIdle",
  "ambientBorderColorFocused",
  "ambientClosedBgColor",
  "ambientInputBgColorIdle",
  "ambientInputBgColorFocused",
  "ambientClosedBorderColorIdle",
  "ambientClosedBorderColorFocused",
  "ambientAiBubbleColor",
  "ambientUserBubbleColor",
  "ambientBorderGradientColor1",
  "ambientBorderGradientColor2",
  "ambientBorderGradientColor3",
  "ambientBorderGradientColor4",
  "ambientBorderGradientShowWhenCollapsed",
  "ambientBorderGradientShowWhenOpen",
  "ambientBorderGradientShowWhenThinking",
] as const

type AmbientDeviceKey = (typeof AMBIENT_DEVICE_KEYS)[number]

function pickAmbientShared(settings?: AmbientSource | null): Partial<Record<AmbientDeviceKey, unknown>> {
  const out: Partial<Record<AmbientDeviceKey, unknown>> = {}
  if (!settings) return out
  for (const key of AMBIENT_DEVICE_KEYS) {
    if (settings[key] !== undefined) {
      out[key] = settings[key]
    }
  }
  return out
}

export function resolveAmbientDeviceSettings(
  settings?: AmbientSource | null,
  device: DeviceKind = "desktop",
): AmbientDeviceAppearanceSettings {
  const shared = pickAmbientShared(settings)

  if (!settings?.ambientPerDeviceSettingsEnabled) {
    return shared as AmbientDeviceAppearanceSettings
  }

  const deviceSettings = (device === "mobile"
    ? settings.ambientMobileSettings
    : settings.ambientDesktopSettings) || undefined

  return {
    ...(shared as AmbientDeviceAppearanceSettings),
    ...(deviceSettings || {}),
  }
}

export function getAmbientDeviceSettingsKeys(): readonly string[] {
  return AMBIENT_DEVICE_KEYS
}
