import { describe, expect, test } from "vitest"
import { resolveAmbientDockStyle } from "./ambient-dock-style"

describe("resolveAmbientDockStyle", () => {
    test("returns collapsed idle border and background fallbacks", () => {
        const result = resolveAmbientDockStyle({
            state: "collapsed-idle",
            settings: {},
        })

        expect(result.borderMode).toBe("solid")
        expect(result.outerBorderColor).toBe("#17b5e8")
        expect(result.formBackgroundColor).toBe("#f3f4f6")
        expect(result.gradientColors).toEqual(["#17b5e8", "#3f6eea", "#7c3aed", "#f59e0b"])
    })

    test("uses collapsed focused border field", () => {
        const result = resolveAmbientDockStyle({
            state: "collapsed-focused",
            settings: {
                ambientClosedBorderColorFocused: "#111111",
                ambientClosedBgColor: "#222222",
            },
        })

        expect(result.borderMode).toBe("solid")
        expect(result.outerBorderColor).toBe("#111111")
        expect(result.formBackgroundColor).toBe("#222222")
    })

    test("uses open idle border and background fields", () => {
        const result = resolveAmbientDockStyle({
            state: "open-idle",
            settings: {
                ambientBorderColorIdle: "#00aa00",
                ambientInputBgColorIdle: "#101010",
                ambientClosedBgColor: "#202020",
            },
        })

        expect(result.borderMode).toBe("solid")
        expect(result.outerBorderColor).toBe("#00aa00")
        expect(result.formBackgroundColor).toBe("#101010")
    })

    test("uses open focused border and background fields", () => {
        const result = resolveAmbientDockStyle({
            state: "open-focused",
            settings: {
                ambientBorderColorFocused: "#00bbff",
                ambientInputBgColorFocused: "#111122",
                ambientInputBgColorIdle: "#222233",
                ambientClosedBgColor: "#333344",
            },
        })

        expect(result.borderMode).toBe("solid")
        expect(result.outerBorderColor).toBe("#00bbff")
        expect(result.formBackgroundColor).toBe("#111122")
    })

    test("falls back open focused background to open idle then closed background", () => {
        const withOpenIdle = resolveAmbientDockStyle({
            state: "open-focused",
            settings: {
                ambientInputBgColorIdle: "#abcabc",
                ambientClosedBgColor: "#defdef",
            },
        })

        const withClosedOnly = resolveAmbientDockStyle({
            state: "open-focused",
            settings: {
                ambientClosedBgColor: "#defdef",
            },
        })

        expect(withOpenIdle.formBackgroundColor).toBe("#abcabc")
        expect(withClosedOnly.formBackgroundColor).toBe("#defdef")
    })

    test("enables animated border when rainbow is enabled", () => {
        const result = resolveAmbientDockStyle({
            state: "open-idle",
            settings: {
                enableAmbientRainbowBorder: true,
                ambientInputBgColorIdle: "#ffffff",
            },
        })

        expect(result.borderMode).toBe("animated")
        expect(result.formBackgroundColor).toBe("#ffffff")
    })

    test("keeps animated override while chat is loading when rainbow toggle is enabled", () => {
        const result = resolveAmbientDockStyle({
            state: "open-focused",
            isChatLoading: true,
            settings: {
                enableAmbientRainbowBorder: true,
                ambientBorderColorFocused: "#0000ff",
                ambientInputBgColorFocused: "#f0f0f0",
            },
        })

        expect(result.borderMode).toBe("animated")
        expect(result.outerBorderColor).toBeUndefined()
        expect(result.formBackgroundColor).toBe("#f0f0f0")
    })

    test("does not animate on loading when rainbow toggle is disabled", () => {
        const result = resolveAmbientDockStyle({
            state: "open-focused",
            isChatLoading: true,
            settings: {
                ambientBorderColorFocused: "#0000ff",
                ambientInputBgColorFocused: "#f0f0f0",
            },
        })

        expect(result.borderMode).toBe("solid")
        expect(result.outerBorderColor).toBe("#0000ff")
        expect(result.formBackgroundColor).toBe("#f0f0f0")
    })

    test("does not animate in collapsed state when collapsed visibility is disabled", () => {
        const result = resolveAmbientDockStyle({
            state: "collapsed-idle",
            settings: {
                enableAmbientRainbowBorder: true,
                ambientBorderGradientShowWhenCollapsed: false,
                ambientBorderColorIdle: "#123456",
            },
        })

        expect(result.borderMode).toBe("solid")
        expect(result.outerBorderColor).toBe("#123456")
    })

    test("animates in collapsed state when collapsed visibility is enabled", () => {
        const result = resolveAmbientDockStyle({
            state: "open-idle",
            settings: {
                enableAmbientRainbowBorder: true,
                ambientBorderGradientShowWhenOpen: false,
                ambientBorderGradientShowWhenCollapsed: true,
            },
        })

        const collapsed = resolveAmbientDockStyle({
            state: "collapsed-idle",
            settings: {
                enableAmbientRainbowBorder: true,
                ambientBorderGradientShowWhenCollapsed: true,
            },
        })

        expect(result.borderMode).toBe("gradient")
        expect(collapsed.borderMode).toBe("animated")
    })

    test("respects thinking visibility override when loading", () => {
        const disabledThinking = resolveAmbientDockStyle({
            state: "open-idle",
            isChatLoading: true,
            settings: {
                enableAmbientRainbowBorder: true,
                ambientBorderGradientShowWhenThinking: false,
                ambientBorderColorIdle: "#222222",
            },
        })

        const enabledThinking = resolveAmbientDockStyle({
            state: "open-idle",
            isChatLoading: true,
            settings: {
                enableAmbientRainbowBorder: true,
                ambientBorderGradientShowWhenThinking: true,
            },
        })

        expect(disabledThinking.borderMode).toBe("solid")
        expect(enabledThinking.borderMode).toBe("animated")
    })

    test("uses custom four-color gradient palette with fallbacks", () => {
        const result = resolveAmbientDockStyle({
            state: "open-idle",
            settings: {
                ambientBorderGradientColor1: "#010101",
                ambientBorderGradientColor3: "#030303",
            },
        })

        expect(result.gradientColors).toEqual(["#010101", "#3f6eea", "#030303", "#f59e0b"])
        expect(result.gradientCssVars["--ambient-g1"]).toBe("#010101")
        expect(result.gradientCssVars["--ambient-g4"]).toBe("#f59e0b")
    })
})
