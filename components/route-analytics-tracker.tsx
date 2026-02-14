"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { trackMarketingEvent } from "@/lib/marketing-tracking";

export function RouteAnalyticsTracker() {
    const pathname = usePathname();
    const { language } = useLanguage();
    const lastTrackedRef = useRef<string>("");

    useEffect(() => {
        const queryString =
            typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
        const pagePath = queryString ? `${pathname}?${queryString}` : pathname;
        const signature = `${pagePath}|${language}`;

        if (lastTrackedRef.current === signature) return;

        trackMarketingEvent("virtual_page_view", {
            page_path: pagePath,
            page_title: typeof document !== "undefined" ? document.title : "",
            page_location: typeof window !== "undefined" ? window.location.href : "",
            language
        });

        lastTrackedRef.current = signature;
    }, [pathname, language]);

    return null;
}
