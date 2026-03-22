export type UserRole = "SUPER_ADMIN" | "AGENCY_ADMIN" | "TENANT_ADMIN" | "USER";

function normalizeRoleValue(role: unknown): string {
    return typeof role === "string" ? role.trim().toUpperCase() : "";
}

export function isSuperAdminRole(role: unknown): boolean {
    return normalizeRoleValue(role) === "SUPER_ADMIN";
}

export function isAgencyAdminRole(role: unknown): boolean {
    return normalizeRoleValue(role) === "AGENCY_ADMIN";
}

export function isTenantAdminRole(role: unknown): boolean {
    return normalizeRoleValue(role) === "TENANT_ADMIN";
}
