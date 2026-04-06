import { test } from "playwright/test"

const targets = [
  { name: "eas", url: "https://www.easaluminium.eu/" },
  { name: "userex", url: "https://www.userex.com.tr/" },
]

for (const target of targets) {
  test(`widget smoke ${target.name}`, async ({ page }) => {
    await page.goto(target.url, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(12000)

    const initial = await page.evaluate(() => {
      const container = document.getElementById("userex-chatbot-container") as HTMLElement | null
      const launcher = document.getElementById("userex-chatbot-launcher") as HTMLElement | null
      const wrapper = document.getElementById("userex-launcher-wrapper") as HTMLElement | null
      const cs = container ? window.getComputedStyle(container) : null
      const ls = launcher ? window.getComputedStyle(launcher) : null
      return {
        hasContainer: !!container,
        hasLauncher: !!launcher,
        containerDisplay: cs?.display || null,
        containerOpacity: cs?.opacity || null,
        containerWidth: cs?.width || null,
        containerHeight: cs?.height || null,
        launcherDisplay: ls?.display || null,
        launcherOpacity: ls?.opacity || null,
        wrapperDisplay: wrapper ? window.getComputedStyle(wrapper).display : null,
      }
    })

    console.log(`[${target.name}] initial`, JSON.stringify(initial))

    const launcher = page.locator("#userex-chatbot-launcher")
    if (await launcher.count()) {
      await launcher.first().click({ force: true })
      await page.waitForTimeout(1500)
      const afterClick = await page.evaluate(() => {
        const container = document.getElementById("userex-chatbot-container") as HTMLElement | null
        const cs = container ? window.getComputedStyle(container) : null
        const rect = container?.getBoundingClientRect()
        return {
          containerDisplay: cs?.display || null,
          containerWidth: cs?.width || null,
          containerHeight: cs?.height || null,
          rect: rect
            ? { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }
            : null,
        }
      })
      console.log(`[${target.name}] afterClick`, JSON.stringify(afterClick))
    }
  })
}
