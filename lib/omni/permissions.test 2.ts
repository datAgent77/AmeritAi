import { describe, expect, test } from "vitest"
import { hasOmniPermission, resolveOmniPermissions } from "@/lib/omni/permissions"

describe("omni permissions", () => {
    test("grants content access only to super admin by default", () => {
        expect(hasOmniPermission(resolveOmniPermissions("SUPER_ADMIN"), "content.manage")).toBe(true)
        expect(hasOmniPermission(resolveOmniPermissions("AGENCY_ADMIN"), "content.manage")).toBe(false)
        expect(hasOmniPermission(resolveOmniPermissions("TENANT_ADMIN"), "content.manage")).toBe(false)
    })

    test("supports explicit allow and deny overrides", () => {
        const permissions = resolveOmniPermissions("TENANT_ADMIN", ["account.switch", "directory.accounts.view"], ["settings.manage"])

        expect(hasOmniPermission(permissions, "account.switch")).toBe(true)
        expect(hasOmniPermission(permissions, "directory.accounts.view")).toBe(true)
        expect(hasOmniPermission(permissions, "settings.manage")).toBe(false)
    })
})
