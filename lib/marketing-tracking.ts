type MarketingPayload = Record<string, unknown>;
const GOOGLE_ADS_SIGNUP_CONVERSION_EVENT = "conversion_event_signup_1";

function toCleanPayload(payload: MarketingPayload): MarketingPayload {
    return Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
    );
}

export function trackMarketingEvent(eventName: string, payload: MarketingPayload = {}) {
    if (typeof window === "undefined") return;

    const cleanPayload = toCleanPayload(payload);
    const windowRef = window as typeof window & {
        dataLayer?: Array<Record<string, unknown>>;
        gtag?: (...args: unknown[]) => void;
    };

    if (typeof windowRef.gtag === "function") {
        windowRef.gtag("event", eventName, cleanPayload);
        return;
    }

    if (Array.isArray(windowRef.dataLayer)) {
        windowRef.dataLayer.push({
            event: eventName,
            ...cleanPayload
        });
    }
}

function trackGoogleAdsEvent(eventName: string, payload: MarketingPayload = {}) {
    if (typeof window === "undefined") return;

    const windowRef = window as typeof window & {
        gtag?: (...args: unknown[]) => void;
        dataLayer?: Array<Record<string, unknown>>;
    };

    if (typeof windowRef.gtag === "function") {
        windowRef.gtag("event", eventName, toCleanPayload(payload));
        return;
    }

    if (Array.isArray(windowRef.dataLayer)) {
        windowRef.dataLayer.push({
            event: eventName,
            ...toCleanPayload(payload),
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
}) {
    trackMarketingEvent("cta_click", {
        location: params.location,
        cta_label: params.ctaLabel,
        destination: params.destination,
        language: params.language
    });

    // Optional Google Ads web conversion (signup CTA click)
    const destination = String(params.destination || "");
    if (destination.startsWith("/signup")) {
        trackAdsSignupConversion({
            cta_location: params.location,
            cta_label: params.ctaLabel,
            destination,
            language: params.language,
        });
    }
}

export function trackPricingView(params: {
    billingCycle: "monthly" | "annual";
    language: string;
    items: Array<{ planId: string; price: number; currency: string }>;
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
                quantity: 1
            }))
        }
    });
}

export function trackPricingPlanSelect(params: {
    planId: string;
    billingCycle: "monthly" | "annual";
    price: number;
    currency: string;
    location?: string;
    language?: string;
}) {
    trackMarketingEvent("select_item", {
        location: params.location ?? "pricing_page",
        billing_cycle: params.billingCycle,
        language: params.language,
        ecommerce: {
            items: [
                {
                    item_id: params.planId,
                    item_name: params.planId,
                    item_category: "subscription",
                    price: params.price,
                    currency: params.currency,
                    quantity: 1
                }
            ]
        }
    });
}

export function trackSignUp(method: string, language: string) {
    trackMarketingEvent("sign_up", {
        method,
        language
    });
}

export function trackLeadGenerated(source: string, params: MarketingPayload = {}) {
    trackMarketingEvent("generate_lead", {
        lead_source: source,
        ...params
    });
}
