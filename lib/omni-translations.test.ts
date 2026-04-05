import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { translations } from "@/lib/translations"

function collectOmniTranslationKeys() {
    const root = process.cwd()
    const keys = new Set<string>()

    const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name)
            if (entry.isDirectory()) {
                walk(fullPath)
                continue
            }

            if (!fullPath.endsWith(".ts") && !fullPath.endsWith(".tsx")) {
                continue
            }

            const source = fs.readFileSync(fullPath, "utf8")
            for (const match of source.matchAll(/t\((["'`])(omni\.[^"'`$]+)\1\)/g)) {
                keys.add(match[2])
            }
        }
    }

    walk(path.join(root, "components"))
    walk(path.join(root, "lib"))

    return [...keys].sort()
}

describe("omni translations parity", () => {
    it("covers every direct omni translation key in english and turkish", () => {
        const omniKeys = collectOmniTranslationKeys()

        const missingEn = omniKeys.filter((key) => !(key in translations.en))
        const missingTr = omniKeys.filter((key) => !(key in translations.tr))

        expect(missingEn).toEqual([])
        expect(missingTr).toEqual([])
    })
})
