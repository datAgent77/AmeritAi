type MarketingPayload = Record<string, unknown>;
const GOOGLE_ADS_SIGNUP_CONVERSION_EVENT = "conversion_event_signup_1";
const ATTRIBUTION_STORAGE_KEY = "vion_attribution_v1";

export type TrafficSegment = "ads_google" | "ads_other" | "organic_or_direct";

export interface AttributionContext {
    traffic_segment: TrafficSegment;
    landing_page: string;
    first_touch_at: string;
    last_seen_at: string;
    last_seen_page: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    gclid?: string;
    fbclid?: string;
    msclkid?: string;
    plan_id?: string;
    billing_cycle?: string;
    language?: string;
}

const GOOGLE_ADS_MEDIUMS = new Set(["cpc", "ppc", "paid"]);
const ATTRIBUTION_PARAM_KEYS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
    "msclkid",
] as const;

function toCleanPayload(payload: MarketingPayload): MarketingPayload {
    return Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
    );
}

function normalizeParam(value: string | null | undefined): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeTrafficSegment(value: unknown): TrafficSegment {
    if (value === "ads_google" || value === "ads_other" || value === "organic_or_direct") {
        return value;
    }
    return "organic_or_direct";
}

function getCurrentSearchParams(): URLSearchParams {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
}

function getCurrentPagePath(): string {
    if (typeof window === "undefined") return "";
    const { pathname, search } = window.location;
    return `${pathname || ""}${search || ""}`;
}

function getDocumentLanguage(): string | undefined {
    if (typeof document === "undefined") return undefined;
    const raw = normalizeParam(document.documentElement?.lang);
    if (!raw) return undefined;
    return raw.split("-")[0]?.toLowerCase() || raw.toLowerCase();
}

function deriveTrafficSegmentFromParams(params: URLSearchParams): TrafficSegment {
    const gclid = normalizeParam(params.get("gclid"));
    if (gclid) return "ads_google";

    const utmSource = normalizeParam(params.get("utm_source"))?.toLowerCase();
    const utmMedium = normalizeParam(params.get("utm_medium"))?.toLowerCase();

    if (utmSource === "google" && utmMedium && GOOGLE_ADS_MEDIUMS.has(utmMedium)) {
        return "ads_google";
    }

    const fbclid = normalizeParam(params.get("fbclid"));
    const msclkid = normalizeParam(params.get("msclkid"));
    if (fbclid || msclkid || utmMedium === "paid") {
        return "ads_other";
    }

    return "organic_or_direct";
}

function buildParamsFromContext(context: Partial<AttributionContext>): URLSearchParams {
    const params = new URLSearchParams();

    ATTRIBUTION_PARAM_KEYS.forEach((key) => {
        const value = context[key];
        if (typeof value === "string" && value.trim()) {
            params.set(key, value);
        }
    });

    return params;
}

function readAttributionContextFromStorage(): AttributionContext | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as Partial<AttributionContext>;
        if (!parsed || typeof parsed !== "object") return null;

        return {
            traffic_segment: normalizeTrafficSegment(parsed.traffic_segment),
            landing_page: typeof parsed.landing_page === "string" ? parsed.landing_page : "",
            first_touch_at: typeof parsed.first_touch_at === "string" ? parsed.first_touch_at : "",
            last_seen_at: typeof parsed.last_seen_at === "string" ? parsed.last_seen_at : "",
            last_seen_page: typeof parsed.last_seen_page === "string" ? parsed.last_seen_page : "",
            utm_source: normalizeParam(parsed.utm_source),
            utm_medium: normalizeParam(parsed.utm_medium),
            utm_campaign: normalizeParam(parsed.utm_campaign),
            utm_term: normalizeParam(parsed.utm_term),
            utm_content: normalizeParam(parsed.utm_content),
            gclid: normalizeParam(parsed.gclid),
            fbclid: normalizeParam(parsed.fbclid),
            msclkid: normalizeParam(parsed.msclkid),
            plan_id: normalizeParam(parsed.plan_id),
            billing_cycle: normalizeParam(parsed.billing_cycle),
            language: normalizeParam(parsed.language),
        };
    } catch {
        return null;
    }
}

function writeAttributionContextToStorage(context: AttributionContext): void {
    if (typeof window === "undefined") return;

    try {
        window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(context));
    } catch {
        // Ignore storage errors (private mode, quota, etc.)
    }
}

function buildCurrentAttributionPatch(params: URLSearchParams): Partial<AttributionContext> {
    return {
        utm_source: normalizeParam(params.get("utm_source")),
        utm_medium: normalizeParam(params.get("utm_medium")),
        utm_campaign: normalizeParam(params.get("utm_campaign")),
        utm_term: normalizeParam(params.get("utm_term")),
        utm_content: normalizeParam(params.get("utm_content")),
        gclid: normalizeParam(params.get("gclid")),
        fbclid: normalizeParam(params.get("fbclid")),
        msclkid: normalizeParam(params.get("msclkid")),
        plan_id: normalizeParam(params.get("plan")),
        billing_cycle: normalizeParam(params.get("cycle")),
        language: normalizeParam(params.get("lang")) || normalizeParam(params.get("language")),
    };
}

export function getTrafficSegmentFromCurrentUrl(): TrafficSegment {
    if (typeof window === "undefined") return "organic_or_direct";
    return deriveTrafficSegmentFromParams(getCurrentSearchParams());
}

export function persistAttributionContext(): void {
    if (typeof window === "undefined") return;

    const now = new Date().toISOString();
    const params = getCurrentSearchParams();
    const currentPath = getCurrentPagePath();
    const currentPatch = buildCurrentAttributionPatch(params);
    const existing = readAttributionContextFromStorage();

    if (!existing) {
        const initialContext: AttributionContext = {
            traffic_segment: deriveTrafficSegmentFromParams(params),
            landing_page: currentPath,
            first_touch_at: now,
            last_seen_at: now,
            last_seen_page: currentPath,
            ...currentPatch,
        };

        if (!initialContext.language) {
            initialContext.language = getDocumentLanguage();
        }

        writeAttributionContextToStorage(initialContext);
        return;
    }

    const next: AttributionContext = {
        ...existing,
        landing_page: existing.landing_page || currentPath,
        first_touch_at: existing.first_touch_at || now,
        last_seen_at: now,
        last_seen_page: currentPath,
    };

    // Keep first-touch campaign params stable; only fill missing values.
    ATTRIBUTION_PARAM_KEYS.forEach((key) => {
        const incomingValue = currentPatch[key];
        if (!next[key] && typeof incomingValue === "string" && incomingValue.trim()) {
            next[key] = incomingValue;
        }
    });

    // These can update through the funnel.
    if (currentPatch.plan_id) {
        next.plan_id = currentPatch.plan_id;
    }
    if (currentPatch.billing_cycle) {
        next.billing_cycle = currentPatch.billing_cycle;
    }
    if (currentPatch.language) {
        next.language = currentPatch.language;
    }
    if (!next.language) {
        next.language = getDocumentLanguage();
    }

    next.traffic_segment = deriveTrafficSegmentFromParams(buildParamsFromContext(next));
    writeAttributionContextToStorage(next);
}

export function getAttributionContext(): AttributionContext | null {
    if (typeof window === "undefined") return null;
    persistAttributionContext();
    return readAttributionContextFromStorage();
}

function buildDefaultPayloadFromContext(context: AttributionContext | null): MarketingPayload {
    const params = getCurrentSearchParams();

    return toCleanPayload({
        traffic_segment: context?.traffic_segment || deriveTrafficSegmentFromParams(params),
        landing_page: context?.landing_page || getCurrentPagePath(),
        plan_id: context?.plan_id || normalizeParam(params.get("plan")),
        billing_cycle: context?.billing_cycle || normalizeParam(params.get("cycle")),
        language:
            context?.language ||
            normalizeParam(params.get("lang")) ||
            normalizeParam(params.get("language")) ||
            getDocumentLanguage(),
    });
}

function buildEnrichedPayload(payload: MarketingPayload = {}): MarketingPayload {
    if (typeof window === "undefined") {
        return toCleanPayload(payload);
    }

    persistAttributionContext();
    const context = readAttributionContextFromStorage();
    const defaults = buildDefaultPayloadFromContext(context);
    return toCleanPayload({
        ...defaults,
        ...toCleanPayload(payload),
    });
}

export function trackMarketingEvent(eventName: string, payload: MarketingPayload = {}) {
    if (typeof window === "undefined") return;

    const enrichedPayload = buildEnrichedPayload(payload);
    const windowRef = window as typeof window & {
        dataLayer?: Array<Record<string, unknown>>;
        gtag?: (...args: unknown[]) => void;
    };

    if (typeof windowRef.gtag === "function") {
        windowRef.gtag("event", eventName, enrichedPayload);
        return;
    }

    if (Array.isArray(windowRef.dataLayer)) {
        windowRef.dataLayer.push({
            event: eventName,
            ...enrichedPayload,
        });
    }
}

function trackGoogleAdsEvent(eventName: string, payload: MarketingPayload = {}) {
    if (typeof window === "undefined") return;

    const enrichedPayload = buildEnrichedPayload(payload);
    const windowRef = window as typeof window & {
        gtag?: (...args: unknown[]) => void;
        dataLayer?: Array<Record<string, unknown>>;
    };

    if (typeof windowRef.gtag === "function") {
        windowRef.gtag("event", eventName, enrichedPayload);
        return;
    }

    if (Array.isArray(windowRef.dataLayer)) {
        windowRef.dataLayer.push({
            event: eventName,
            ...enrichedPayload,
        });
    }
}

export function trackAdsSignupConversion(payload: MarketingPayload = {}) {
    trackGoogleAdsEvent(GOOGLE_ADS_SIGNUP_CONVERSION_EVENT, {
        event_timeout: 2000,
        ...payload,
    });
}

// React/Next version of the Google Ads "delayed navigation helper" snippet.
// Use this when you need to guarantee event send before navigating away.
export function trackAdsSignupConversionAndNavigate(url?: string) {
    if (typeof window === "undefined") return false;

    const callback = () => {
        if (typeof url === "string") {
            window.location.href = url;
        }
    };

    const windowRef = window as typeof window & { gtag?: (...args: unknown[]) => void };
    if (typeof windowRef.gtag === "function") {
        windowRef.gtag("event", GOOGLE_ADS_SIGNUP_CONVERSION_EVENT, {
            event_callback: callback,
            event_timeout: 2000,
            ...buildDefaultPayloadFromContext(readAttributionContextFromStorage()),
        });

        if (typeof url === "string") {
            window.setTimeout(callback, 2100);
        }

        return false;
    }

    callback();
    return false;
}

export function trackCtaClick(params: {
    location: string;
    ctaLabel: string;
    destination?: string;
    language?: string;
    metadata?: MarketingPayload;
}) {
    trackMarketingEvent("cta_click", {
        location: params.location,
        cta_label: params.ctaLabel,
        destination: params.destination,
        language: params.language,
        ...toCleanPayload(params.metadata || {}),
    });

    // Optional Google Ads web conversion (signup CTA click)
    const destination = String(params.destination || "");
    if (destination.startsWith("/signup")) {
        trackAdsSignupConversion({
            cta_location: params.location,
            cta_label: params.ctaLabel,
            destination,
            language: params.language,
            ...toCleanPayload(params.metadata || {}),
        });
    }
}

export function trackPricingView(params: {
    billingCycle: "monthly" | "annual";
    language: string;
    items: Array<{ planId: string; price?: number; currency?: string }>;
}) {
    trackMarketingEvent("view_item_list", {
        item_list_name: "pricing_plans",
        billing_cycle: params.billingCycle,
        language: params.language,
        ecommerce: {
            items: params.items.map((item) => ({
                item_id: item.planId,
                item_name: item.planId,
                item_category: "subscription",
                price: item.price,
                currency: item.currency,
                quantity: 1,
            })).map(toCleanPayload),
        },
    });
}

export function trackPricingPlanSelect(params: {
    planId: string;
    billingCycle: "monthly" | "annual";
    price?: number;
    currency?: string;
    location?: string;
    language?: string;
}) {
    trackMarketingEvent("select_item", {
        location: params.location ?? "pricing_page",
        billing_cycle: params.billingCycle,
        language: params.language,
        ecommerce: {
            items: [
                toCleanPayload({
                    item_id: params.planId,
                    item_name: params.planId,
                    item_category: "subscription",
                    price: params.price,
                    currency: params.currency,
                    quantity: 1,
                }),
            ],
        },
    });
}

export function trackSignUp(method: string, language: string) {
    trackMarketingEvent("sign_up", {
        method,
        language,
    });
}

export function trackLeadGenerated(source: string, params: MarketingPayload = {}) {
    trackMarketingEvent("generate_lead", {
        lead_source: source,
        ...params,
    });
}
