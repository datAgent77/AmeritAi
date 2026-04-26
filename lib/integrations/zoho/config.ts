export type ZohoRegion = "com" | "eu" | "in" | "com.au" | "jp" | "com.cn"

export const ZOHO_REGIONS: { value: ZohoRegion; label: string }[] = [
    { value: "com", label: "United States (.com)" },
    { value: "eu", label: "Europe (.eu)" },
    { value: "in", label: "India (.in)" },
    { value: "com.au", label: "Australia (.com.au)" },
    { value: "jp", label: "Japan (.jp)" },
    { value: "com.cn", label: "China (.com.cn)" },
]

export const ZOHO_DEFAULT_REGION: ZohoRegion = "com"

export const ZOHO_LEAD_SCOPE = "ZohoCRM.modules.leads.CREATE,ZohoCRM.modules.leads.READ,ZohoCRM.users.READ"

export function isZohoRegion(value: unknown): value is ZohoRegion {
    return ZOHO_REGIONS.some((r) => r.value === value)
}

export function getAccountsServer(region: ZohoRegion): string {
    return `https://accounts.zoho.${region}`
}

export function getApiDomain(region: ZohoRegion): string {
    return `https://www.zohoapis.${region}`
}
