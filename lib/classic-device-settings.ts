import type { ClassicDeviceAppearanceSettings } from "@/types/chatbot"

type DeviceKind = "mobile" | "desktop"

type ClassicSource = Record<string, any> & {
  classicPerDeviceSettingsEnabled?: boolean
  classicDesktopSettings?: ClassicDeviceAppearanceSettings | null
  classicMobileSettings?: ClassicDeviceAppearanceSettings | null
  mobileBottomSpacing?: number
  mobileSideSpacing?: number
  mobileLauncherAnimation?: string
}

const CLASSIC_DEVICE_KEYS = [
  "bottomSpacing",
  "sideSpacing",
  "launcherAnimation",
  "launcherStyle",
  "launcherCollapse",
  "launcherText",
  "launcherRadius",
  "launcherHeight",
  "launcherWidth",
  "fullImageLauncherWidth",
  "fullImageLauncherHeight",
  "launcherIcon",
  "launcherIconUrl",
  "launcherLibraryIcon",
  "launcherIconColor",
  "launcherBackgroundColor",
  "launcherShadow",
  "launcherType",
  "launcherImageMode",
  "launcherFullImageUrl",
  "launcherLottieUrl",
  "launcherHoverEffect",
  "viewMode",
  "modalSize",
] as const

type ClassicDeviceKey = (typeof CLASSIC_DEVICE_KEYS)[number]

function pickClassicShared(settings?: ClassicSource | null): Partial<Record<ClassicDeviceKey, unknown>> {
  const out: Partial<Record<ClassicDeviceKey, unknown>> = {}
  if (!settings) return out
  for (const key of CLASSIC_DEVICE_KEYS) {
    if (settings[key] !== undefined) {
      out[key] = settings[key]
    }
  }
  return out
}

function applyLegacyMobileFallback(
  base: ClassicDeviceAppearanceSettings,
  settings?: ClassicSource | null,
  device: DeviceKind = "desktop",
  deviceSettings?: ClassicDeviceAppearanceSettings | null,
): ClassicDeviceAppearanceSettings {
  if (device !== "mobile" || !settings) return base

  const next = { ...base }
  const hasDeviceBottom = !!deviceSettings && Object.prototype.hasOwnProperty.call(deviceSettings, "bottomSpacing")
  const hasDeviceSide = !!deviceSettings && Object.prototype.hasOwnProperty.call(deviceSettings, "sideSpacing")
  const hasDeviceAnimation = !!deviceSettings && Object.prototype.hasOwnProperty.call(deviceSettings, "launcherAnimation")

  if (!hasDeviceBottom && typeof settings.mobileBottomSpacing === "number") {
    next.bottomSpacing = settings.mobileBottomSpacing
  }
  if (!hasDeviceSide && typeof settings.mobileSideSpacing === "number") {
    next.sideSpacing = settings.mobileSideSpacing
  }
  if (!hasDeviceAnimation && typeof settings.mobileLauncherAnimation === "string") {
    next.launcherAnimation = settings.mobileLauncherAnimation
  }
  return next
}

export function resolveClassicDeviceSettings(
  settings?: ClassicSource | null,
  device: DeviceKind = "desktop",
): ClassicDeviceAppearanceSettings {
  const shared = pickClassicShared(settings) as ClassicDeviceAppearanceSettings

  if (!settings?.classicPerDeviceSettingsEnabled) {
    return applyLegacyMobileFallback(shared, settings, device)
  }

  const deviceSettings = (device === "mobile"
    ? settings.classicMobileSettings
    : settings.classicDesktopSettings) || undefined

  return applyLegacyMobileFallback(
    {
      ...shared,
      ...(deviceSettings || {}),
    },
    settings,
    device,
    deviceSettings,
  )
}

export function getClassicDeviceSettingsKeys(): readonly string[] {
  return CLASSIC_DEVICE_KEYS
}
