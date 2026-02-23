import { describe, expect, test } from "vitest"
import { resolveClassicDeviceSettings } from "./classic-device-settings"

describe("resolveClassicDeviceSettings", () => {
  test("returns shared settings in shared mode", () => {
    const result = resolveClassicDeviceSettings(
      {
        classicPerDeviceSettingsEnabled: false,
        launcherWidth: 72,
        bottomSpacing: 24,
      },
      "desktop",
    )

    expect(result.launcherWidth).toBe(72)
    expect(result.bottomSpacing).toBe(24)
  })

  test("uses legacy mobile fields in shared mode on mobile", () => {
    const result = resolveClassicDeviceSettings(
      {
        classicPerDeviceSettingsEnabled: false,
        bottomSpacing: 24,
        sideSpacing: 30,
        launcherAnimation: "pulse",
        mobileBottomSpacing: 10,
        mobileSideSpacing: 12,
        mobileLauncherAnimation: "bounce",
      },
      "mobile",
    )

    expect(result.bottomSpacing).toBe(10)
    expect(result.sideSpacing).toBe(12)
    expect(result.launcherAnimation).toBe("bounce")
  })

  test("uses per-device mobile overrides when enabled", () => {
    const result = resolveClassicDeviceSettings(
      {
        classicPerDeviceSettingsEnabled: true,
        launcherWidth: 60,
        classicMobileSettings: {
          launcherWidth: 84,
          launcherAnimation: "float",
        },
      },
      "mobile",
    )

    expect(result.launcherWidth).toBe(84)
    expect(result.launcherAnimation).toBe("float")
  })

  test("falls back mobile spacing/animation to legacy values if device object omits them", () => {
    const result = resolveClassicDeviceSettings(
      {
        classicPerDeviceSettingsEnabled: true,
        bottomSpacing: 20,
        sideSpacing: 20,
        launcherAnimation: "none",
        mobileBottomSpacing: 8,
        mobileSideSpacing: 9,
        mobileLauncherAnimation: "pulse",
        classicMobileSettings: {
          launcherWidth: 90,
        },
      },
      "mobile",
    )

    expect(result.launcherWidth).toBe(90)
    expect(result.bottomSpacing).toBe(8)
    expect(result.sideSpacing).toBe(9)
    expect(result.launcherAnimation).toBe("pulse")
  })

  test("falls back missing device fields to shared values", () => {
    const result = resolveClassicDeviceSettings(
      {
        classicPerDeviceSettingsEnabled: true,
        launcherShadow: "heavy",
        classicDesktopSettings: {
          launcherWidth: 96,
        },
      },
      "desktop",
    )

    expect(result.launcherWidth).toBe(96)
    expect(result.launcherShadow).toBe("heavy")
  })
})
