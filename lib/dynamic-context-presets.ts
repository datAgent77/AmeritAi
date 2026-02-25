import type { SectorId } from "@/lib/modules-registry";

export type DynamicContextPresetId =
    | "generic-web-app"
    | "ecommerce-generic"
    | "logistics-generic"
    | "saas-generic"
    | "crm-erp-generic";

export type DynamicContextPresetStatus = "ready" | "beta";

export type DynamicContextNetworkPolicy = {
    allowGetJson: boolean;
    allowGraphQLSummary: boolean;
    allowedPostEndpoints: string[];
    allowedGraphQLOperations: string[];
    responseFieldAllowlist?: string[];
    responseFieldDenylist?: string[];
};

export type DynamicContextEntityTarget =
    | "dashboard"
    | "tasks"
    | "projects"
    | "profile"
    | "orders"
    | "shipments"
    | "returns"
    | "cart"
    | "account";

export type DynamicContextPresetRuntime = {
    presetId: DynamicContextPresetId;
    routeHints: string[];
    networkPolicy: DynamicContextNetworkPolicy;
    entityTargets: DynamicContextEntityTarget[];
    confidenceBase: number;
    extractorHints?: Record<string, unknown>;
};

export type DynamicContextPreset = {
    presetId: DynamicContextPresetId;
    displayName: {
        en: string;
        tr: string;
    };
    description: {
        en: string;
        tr: string;
    };
    supportedSectors: SectorId[];
    priority: number;
    status: DynamicContextPresetStatus;
    routeHints: string[];
    entityTargets: DynamicContextEntityTarget[];
    networkPolicy: DynamicContextNetworkPolicy;
    extractorHints?: Record<string, unknown>;
};

export type DynamicContextPresetMode = "none" | "suggested" | "approved";

export type DynamicContextPresetSelectionInput = {
    sectorId?: string;
    presetMode?: DynamicContextPresetMode;
    presetId?: string;
    presetOverrides?: Record<string, unknown> | null;
    networkAllowlist?: string[] | null;
    graphqlOperationAllowlist?: string[] | null;
};

export type DynamicContextPresetSelectionResult = {
    normalizedSectorId: SectorId;
    suggestedPresetId: DynamicContextPresetId;
    suggestedPreset: DynamicContextPreset;
    activePresetId: DynamicContextPresetId;
    activePreset: DynamicContextPreset;
    runtimePreset: DynamicContextPresetRuntime;
    isApproved: boolean;
};

const DEFAULT_RESPONSE_FIELD_DENYLIST = [
    "password",
    "passwd",
    "pwd",
    "token",
    "accessToken",
    "refreshToken",
    "authorization",
    "cookie",
    "secret",
    "otp",
    "cvv",
    "cvc",
];

const PRESETS: DynamicContextPreset[] = [
    {
        presetId: "generic-web-app",
        displayName: {
            en: "Generic Web App",
            tr: "Genel Web Uygulaması",
        },
        description: {
            en: "Safe default preset with generic tables, forms and dashboard summaries.",
            tr: "Genel tablo, form ve dashboard özetleri için güvenli varsayılan preset.",
        },
        supportedSectors: [],
        priority: 1,
        status: "ready",
        routeHints: ["dashboard", "overview", "profile", "account", "settings", "projects", "tasks"],
        entityTargets: ["dashboard", "tasks", "projects", "profile"],
        networkPolicy: {
            allowGetJson: true,
            allowGraphQLSummary: false,
            allowedPostEndpoints: [],
            allowedGraphQLOperations: [],
            responseFieldDenylist: DEFAULT_RESPONSE_FIELD_DENYLIST,
        },
        extractorHints: {
            dom: {
                tableKeywords: ["task", "görev", "project", "proje", "profile", "profil"],
                statKeywords: ["total", "count", "adet", "bekleyen", "tamamlanan", "pending", "completed"],
            },
        },
    },
    {
        presetId: "ecommerce-generic",
        displayName: {
            en: "E-commerce (Generic)",
            tr: "E-Ticaret (Genel)",
        },
        description: {
            en: "Extracts orders, shipments, cart and account summaries from customer panels and stores.",
            tr: "Müşteri paneli ve mağaza sayfalarından sipariş, kargo, sepet ve hesap özetlerini çıkarır.",
        },
        supportedSectors: ["ecommerce"],
        priority: 100,
        status: "beta",
        routeHints: [
            "order", "orders", "siparis", "siparislerim",
            "shipment", "shipping", "kargo", "teslimat", "tracking", "takip",
            "account", "my-account", "hesabim", "profil",
            "cart", "sepet", "checkout", "returns", "iade"
        ],
        entityTargets: ["orders", "shipments", "returns", "cart", "account", "dashboard"],
        networkPolicy: {
            allowGetJson: true,
            allowGraphQLSummary: true,
            allowedPostEndpoints: [
                "/graphql",
                "/api/orders",
                "/api/order",
                "/api/account/orders",
                "/api/shipping",
                "/api/shipment",
                "/api/tracking",
                "/customer/order",
                "/customer/orders",
            ],
            allowedGraphQLOperations: [
                "GetOrders",
                "Orders",
                "OrderList",
                "GetOrderHistory",
                "CustomerOrders",
                "GetShipment",
                "TrackShipment",
                "GetTracking",
                "CustomerAccount",
                "GetCart",
            ],
            responseFieldAllowlist: [
                "orders",
                "order",
                "shipments",
                "shipment",
                "tracking",
                "trackingNumber",
                "status",
                "items",
                "total",
                "currency",
                "createdAt",
                "updatedAt",
                "cart",
                "account",
                "customer",
                "profile",
                "returns",
            ],
            responseFieldDenylist: DEFAULT_RESPONSE_FIELD_DENYLIST,
        },
        extractorHints: {
            ecommerce: {
                orderRouteKeywords: ["order", "orders", "siparis", "sipariş"],
                shipmentRouteKeywords: ["shipment", "shipping", "kargo", "teslimat", "tracking", "takip"],
                accountRouteKeywords: ["account", "hesabim", "profil", "my-account"],
                cartRouteKeywords: ["cart", "sepet", "checkout"],
                statusKeywords: ["pending", "processing", "shipped", "delivered", "cancelled", "hazirlaniyor", "kargoda", "teslim", "iptal"],
            },
        },
    },
    {
        presetId: "logistics-generic",
        displayName: { en: "Logistics (Generic)", tr: "Lojistik (Genel)" },
        description: { en: "Shipment and tracking-oriented portal extractor preset.", tr: "Kargo ve takip odaklı portal extractor preset." },
        supportedSectors: ["logistics", "maritime"],
        priority: 90,
        status: "beta",
        routeHints: ["shipment", "tracking", "kargo", "takip", "cargo", "delivery", "dispatch"],
        entityTargets: ["shipments", "dashboard", "account"],
        networkPolicy: {
            allowGetJson: true,
            allowGraphQLSummary: true,
            allowedPostEndpoints: ["/graphql", "/api/shipment", "/api/tracking", "/api/dispatch"],
            allowedGraphQLOperations: ["TrackShipment", "GetShipments", "ShipmentList", "TrackCargo"],
            responseFieldDenylist: DEFAULT_RESPONSE_FIELD_DENYLIST,
        },
    },
    {
        presetId: "saas-generic",
        displayName: { en: "SaaS (Generic)", tr: "SaaS (Genel)" },
        description: { en: "Usage, subscription, billing and account panel summaries.", tr: "Kullanım, abonelik, faturalama ve hesap paneli özetleri." },
        supportedSectors: ["saas"],
        priority: 80,
        status: "beta",
        routeHints: ["dashboard", "billing", "subscription", "usage", "workspace", "settings"],
        entityTargets: ["dashboard", "account", "projects"],
        networkPolicy: {
            allowGetJson: true,
            allowGraphQLSummary: true,
            allowedPostEndpoints: ["/graphql", "/api/billing", "/api/subscription", "/api/usage"],
            allowedGraphQLOperations: ["GetSubscription", "GetUsage", "WorkspaceDashboard"],
            responseFieldDenylist: DEFAULT_RESPONSE_FIELD_DENYLIST,
        },
    },
    {
        presetId: "crm-erp-generic",
        displayName: { en: "CRM/ERP (Generic)", tr: "CRM/ERP (Genel)" },
        description: { en: "Tasks, projects, leads and profile-heavy business portal preset.", tr: "Görev, proje, lead ve profil ağırlıklı iş portalı preset’i." },
        supportedSectors: ["service", "finance", "manufacturing", "other", "education", "academic"],
        priority: 70,
        status: "beta",
        routeHints: ["dashboard", "tasks", "gorev", "projects", "proje", "crm", "erp", "lead", "profile", "ozet"],
        entityTargets: ["dashboard", "tasks", "projects", "profile", "account"],
        networkPolicy: {
            allowGetJson: true,
            allowGraphQLSummary: true,
            allowedPostEndpoints: ["/graphql", "/api/tasks", "/api/projects", "/api/leads", "/api/account"],
            allowedGraphQLOperations: ["GetTasks", "GetProjects", "GetDashboard", "GetProfile"],
            responseFieldDenylist: DEFAULT_RESPONSE_FIELD_DENYLIST,
        },
    },
];

export const DYNAMIC_CONTEXT_PRESETS: DynamicContextPreset[] = PRESETS;

const PRESET_MAP = new Map<DynamicContextPresetId, DynamicContextPreset>(
    PRESETS.map((preset) => [preset.presetId, preset])
);

export function normalizeDynamicContextSectorId(raw: string | undefined | null): SectorId {
    if (!raw || typeof raw !== "string") return "other";
    const value = raw.toLowerCase().trim();
    const map: Record<string, SectorId> = {
        ecommerce: "ecommerce",
        "e-commerce": "ecommerce",
        booking: "booking",
        travel: "booking",
        real_estate: "real_estate",
        "real-estate": "real_estate",
        realestate: "real_estate",
        saas: "saas",
        software: "saas",
        service: "service",
        healthcare: "healthcare",
        health: "healthcare",
        education: "education",
        academic: "academic",
        finance: "finance",
        fintech: "finance",
        restaurant: "restaurant",
        hospitality: "restaurant",
        agriculture: "agriculture",
        automotive: "automotive",
        insurance: "insurance",
        logistics: "logistics",
        beauty: "beauty",
        legal: "legal",
        fitness: "fitness",
        maritime: "maritime",
        manufacturing: "manufacturing",
        other: "other",
        technology: "saas",
        tech: "saas",
        crm: "service",
        erp: "manufacturing",
    };
    return map[value] || "other";
}

export function getDynamicContextPresetById(presetId?: string | null): DynamicContextPreset | undefined {
    if (!presetId) return undefined;
    return PRESET_MAP.get(presetId as DynamicContextPresetId);
}

export function getDynamicContextPresetSuggestionsForSector(rawSectorId?: string | null): DynamicContextPreset[] {
    const sectorId = normalizeDynamicContextSectorId(rawSectorId);
    const candidates = PRESETS.filter((preset) => {
        if (preset.presetId === "generic-web-app") return true;
        if (preset.supportedSectors.length === 0) return true;
        return preset.supportedSectors.includes(sectorId);
    });
    return candidates.sort((a, b) => b.priority - a.priority);
}

export function getSuggestedDynamicContextPresetForSector(rawSectorId?: string | null): DynamicContextPreset {
    const suggestions = getDynamicContextPresetSuggestionsForSector(rawSectorId);
    return suggestions[0] || PRESET_MAP.get("generic-web-app")!;
}

function sanitizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter(Boolean);
}

export function resolveDynamicContextPresetSelection(
    input: DynamicContextPresetSelectionInput
): DynamicContextPresetSelectionResult {
    const normalizedSectorId = normalizeDynamicContextSectorId(input.sectorId);
    const suggestedPreset = getSuggestedDynamicContextPresetForSector(normalizedSectorId);
    const mode: DynamicContextPresetMode = input.presetMode === "approved"
        ? "approved"
        : input.presetMode === "suggested"
            ? "suggested"
            : "none";

    const approvedPreset = mode === "approved" ? getDynamicContextPresetById(input.presetId) : undefined;
    const activePreset = approvedPreset || PRESET_MAP.get("generic-web-app")!;

    const overrideObj = (input.presetOverrides && typeof input.presetOverrides === "object")
        ? input.presetOverrides
        : {};

    const networkAllowlist = sanitizeStringArray(input.networkAllowlist);
    const graphqlAllowlist = sanitizeStringArray(input.graphqlOperationAllowlist);

    const runtimePreset: DynamicContextPresetRuntime = {
        presetId: activePreset.presetId,
        routeHints: sanitizeStringArray((overrideObj as any).routeHints).length > 0
            ? sanitizeStringArray((overrideObj as any).routeHints)
            : [...activePreset.routeHints],
        entityTargets: (Array.isArray((overrideObj as any).entityTargets)
            ? (overrideObj as any).entityTargets
            : activePreset.entityTargets) as DynamicContextEntityTarget[],
        confidenceBase: typeof (overrideObj as any).confidenceBase === "number"
            ? Math.max(0.1, Math.min(1, (overrideObj as any).confidenceBase))
            : (activePreset.presetId === "generic-web-app" ? 0.55 : 0.72),
        extractorHints: {
            ...(activePreset.extractorHints || {}),
            ...((overrideObj as any).extractorHints && typeof (overrideObj as any).extractorHints === "object"
                ? (overrideObj as any).extractorHints
                : {})
        },
        networkPolicy: {
            allowGetJson: activePreset.networkPolicy.allowGetJson !== false,
            allowGraphQLSummary: activePreset.networkPolicy.allowGraphQLSummary === true,
            allowedPostEndpoints: Array.from(new Set([
                ...activePreset.networkPolicy.allowedPostEndpoints,
                ...networkAllowlist
            ])),
            allowedGraphQLOperations: Array.from(new Set([
                ...activePreset.networkPolicy.allowedGraphQLOperations,
                ...graphqlAllowlist
            ])),
            responseFieldAllowlist: sanitizeStringArray((overrideObj as any).responseFieldAllowlist).length > 0
                ? sanitizeStringArray((overrideObj as any).responseFieldAllowlist)
                : (activePreset.networkPolicy.responseFieldAllowlist ? [...activePreset.networkPolicy.responseFieldAllowlist] : undefined),
            responseFieldDenylist: sanitizeStringArray((overrideObj as any).responseFieldDenylist).length > 0
                ? sanitizeStringArray((overrideObj as any).responseFieldDenylist)
                : (activePreset.networkPolicy.responseFieldDenylist ? [...activePreset.networkPolicy.responseFieldDenylist] : undefined),
        },
    };

    return {
        normalizedSectorId,
        suggestedPresetId: suggestedPreset.presetId,
        suggestedPreset,
        activePresetId: activePreset.presetId,
        activePreset,
        runtimePreset,
        isApproved: !!approvedPreset,
    };
}

