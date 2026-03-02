import { afterEach, describe, expect, test, vi } from "vitest"
import {
  getAttributionContext,
  getTrafficSegmentFromCurrentUrl,
  persistAttributionContext,
  trackMarketingEvent,
} from "./marketing-tracking"

class SessionStorageMock {
  private store: Record<string, string> = {}

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value)
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  clear(): void {
    this.store = {}
  }
}

function createWindowStub(options: {
  search?: string
  pathname?: string
  sessionStorage?: SessionStorageMock
  gtag?: (...args: unknown[]) => void
}) {
  return {
    location: {
      search: options.search || "",
      pathname: options.pathname || "/",
    },
    sessionStorage: options.sessionStorage || new SessionStorageMock(),
    dataLayer: [] as Array<Record<string, unknown>>,
    gtag: options.gtag,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("marketing tracking attribution", () => {
  test("maps gclid traffic to ads_google", () => {
    vi.stubGlobal("window", createWindowStub({ search: "?gclid=abc123", pathname: "/" }))
    vi.stubGlobal("document", { documentElement: { lang: "en-US" } })

    expect(getTrafficSegmentFromCurrentUrl()).toBe("ads_google")
  })

  test("maps utm_source=google and utm_medium=cpc to ads_google", () => {
    vi.stubGlobal("window", createWindowStub({ search: "?utm_source=google&utm_medium=cpc", pathname: "/" }))
    vi.stubGlobal("document", { documentElement: { lang: "en-US" } })

    expect(getTrafficSegmentFromCurrentUrl()).toBe("ads_google")
  })

  test("maps empty query to organic_or_direct", () => {
    vi.stubGlobal("window", createWindowStub({ search: "", pathname: "/" }))
    vi.stubGlobal("document", { documentElement: { lang: "en-US" } })

    expect(getTrafficSegmentFromCurrentUrl()).toBe("organic_or_direct")
  })

  test("persists first-touch attribution and reuses it on later routes", () => {
    const storage = new SessionStorageMock()
    const windowStub = createWindowStub({
      search: "?utm_source=google&utm_medium=cpc&gclid=abc123",
      pathname: "/",
      sessionStorage: storage,
    })

    vi.stubGlobal("window", windowStub)
    vi.stubGlobal("document", { documentElement: { lang: "tr-TR" } })

    persistAttributionContext()

    const firstContext = getAttributionContext()
    expect(firstContext?.traffic_segment).toBe("ads_google")
    expect(firstContext?.landing_page).toBe("/?utm_source=google&utm_medium=cpc&gclid=abc123")
    expect(firstContext?.utm_source).toBe("google")

    windowStub.location.pathname = "/signup"
    windowStub.location.search = "?plan=growth&cycle=annual"

    persistAttributionContext()

    const laterContext = getAttributionContext()
    expect(laterContext?.landing_page).toBe("/?utm_source=google&utm_medium=cpc&gclid=abc123")
    expect(laterContext?.plan_id).toBe("growth")
    expect(laterContext?.billing_cycle).toBe("annual")
    expect(laterContext?.traffic_segment).toBe("ads_google")
  })

  test("enriches event payload with attribution defaults", () => {
    const gtag = vi.fn()
    const storage = new SessionStorageMock()
    const windowStub = createWindowStub({
      search: "?utm_source=google&utm_medium=cpc",
      pathname: "/pricing",
      sessionStorage: storage,
      gtag,
    })

    vi.stubGlobal("window", windowStub)
    vi.stubGlobal("document", { documentElement: { lang: "en-US" } })

    trackMarketingEvent("signup_submit_attempt", { method: "email" })

    expect(gtag).toHaveBeenCalledTimes(1)
    const [, eventName, payload] = gtag.mock.calls[0]
    expect(eventName).toBe("signup_submit_attempt")
    expect(payload).toMatchObject({
      method: "email",
      traffic_segment: "ads_google",
      landing_page: "/pricing?utm_source=google&utm_medium=cpc",
      language: "en",
    })
  })
})

