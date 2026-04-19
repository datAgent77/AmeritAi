import { describe, expect, test } from "vitest"
import { computeContractVersionHash, getDefaultContractTemplate, getRequiredContractTypeForRole } from "./contracts"

describe("contracts helpers", () => {
    test("maps tenant and partner roles to the correct contract type", () => {
        expect(getRequiredContractTypeForRole("TENANT_ADMIN")).toBe("tenantAgreement")
        expect(getRequiredContractTypeForRole("AGENCY_ADMIN")).toBe("partnerAgreement")
        expect(getRequiredContractTypeForRole("SUPER_ADMIN")).toBeNull()
    })

    test("keeps a deterministic hash for the same contract payload", () => {
        const input = `${getDefaultContractTemplate("kvkkDefault").title}:${getDefaultContractTemplate("kvkkDefault").text}`
        expect(computeContractVersionHash(input)).toBe(computeContractVersionHash(input))
    })
})
