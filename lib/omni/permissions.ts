import type { UserRole } from "@/lib/user-roles"

export type OmniPermission =
    | "dashboard.view"
    | "analytics.view"
    | "account.switch"
    | "directory.accounts.view"
    | "directory.accounts.manage"
    | "directory.agencies.view"
    | "content.view"
    | "content.manage"
    | "aiCore.view"
    | "aiCore.manage"
    | "channels.view"
    | "channels.manage"
    | "operations.view"
    | "operations.manage"
    | "settings.view"
    | "settings.manage"
    | "accountCenter.view"
    | "accountCenter.manage"

export const ALL_OMNI_PERMISSIONS: OmniPermission[] = [
    "dashboard.view",
    "analytics.view",
    "account.switch",
    "directory.accounts.view",
    "directory.accounts.manage",
    "directory.agencies.view",
    "content.view",
    "content.manage",
    "aiCore.view",
    "aiCore.manage",
    "channels.view",
    "channels.manage",
    "operations.view",
    "operations.manage",
    "settings.view",
    "settings.manage",
    "accountCenter.view",
    "accountCenter.manage",
]

const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, OmniPermission[]> = {
    SUPER_ADMIN: ALL_OMNI_PERMISSIONS,
    AGENCY_ADMIN: [
        "dashboard.view",
        "analytics.view",
        "account.switch",
        "directory.accounts.view",
        "directory.accounts.manage",
        "aiCore.view",
        "aiCore.manage",
        "channels.view",
        "channels.manage",
        "operations.view",
        "operations.manage",
        "settings.view",
        "settings.manage",
        "accountCenter.view",
        "accountCenter.manage",
    ],
    TENANT_ADMIN: [
        "dashboard.view",
        "analytics.view",
        "aiCore.view",
        "aiCore.manage",
        "channels.view",
        "channels.manage",
        "operations.view",
        "operations.manage",
        "settings.view",
        "settings.manage",
        "accountCenter.view",
        "accountCenter.manage",
    ],
    USER: ["accountCenter.view"],
}

function normalizePermissionList(value: unknown): OmniPermission[] {
    if (!Array.isArray(value)) return []

    return value
        .map((item) => String(item))
        .filter((item): item is OmniPermission => ALL_OMNI_PERMISSIONS.includes(item as OmniPermission))
}

export function resolveOmniPermissions(role: UserRole, explicitAllow?: unknown, explicitDeny?: unknown) {
    if (role === "SUPER_ADMIN") {
        return ALL_OMNI_PERMISSIONS
    }

    const base = new Set<OmniPermission>(DEFAULT_PERMISSIONS_BY_ROLE[role] || [])
    const allow = normalizePermissionList(explicitAllow)
    const deny = new Set<OmniPermission>(normalizePermissionList(explicitDeny))

    allow.forEach((permission) => base.add(permission))
    deny.forEach((permission) => base.delete(permission))

    return [...base]
}

export function hasOmniPermission(permissions: OmniPermission[], permission: OmniPermission) {
    return permissions.includes(permission)
}

export function hasOmniPermissionOrDefault(permissions: OmniPermission[] | undefined, permission: OmniPermission) {
    if (!permissions) return true
    return hasOmniPermission(permissions, permission)
}
