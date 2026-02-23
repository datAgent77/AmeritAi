import { describe, expect, test } from "vitest"
import { resolveAmbientDeviceSettings } from "./ambient-device-settings"

describe("resolveAmbientDeviceSettings", () => {
  test("returns shared ambient settings in shared mode", () => {
    const result = resolveAmbientDeviceSettings(
      {
        ambientPerDeviceSettingsEnabled: false,
        ambientMaxHeight: 320,
        ambientBorderColorIdle: "#111111",
      },
      "desktop",
    )

    expect(result.ambientMaxHeight).toBe(320)
    expect(result.ambientBorderColorIdle).toBe("#111111")
  })

  test("uses mobile overrides when per-device is enabled", () => {
    const result = resolveAmbientDeviceSettings(
      {
        ambientPerDeviceSettingsEnabled: true,
        ambientBorderColorIdle: "#111111",
        ambientMobileSettings: {
          ambientBorderColorIdle: "#22aa22",
          ambientBottomMargin: 12,
        },
      },
      "mobile",
    )

    expect(result.ambientBorderColorIdle).toBe("#22aa22")
    expect(result.ambientBottomMargin).toBe(12)
  })

  test("falls back missing device fields to shared values", () => {
    const result = resolveAmbientDeviceSettings(
      {
        ambientPerDeviceSettingsEnabled: true,
        ambientInputBgColorIdle: "#0f0f0f",
        ambientDesktopSettings: {
          ambientBorderColorFocused: "#ffffff",
        },
      },
      "desktop",
    )

    expect(result.ambientBorderColorFocused).toBe("#ffffff")
    expect(result.ambientInputBgColorIdle).toBe("#0f0f0f")
  })
})
