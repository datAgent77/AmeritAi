import { decryptToken, encryptToken } from "@/lib/omni/token-cipher"
import type { EcomCredentials } from "./types"

function mapStringValues(
    input: Record<string, unknown>,
    mapper: (value: string) => string | null
): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input)) {
        if (typeof value === "string") {
            out[key] = mapper(value) ?? ""
            continue
        }
        out[key] = value
    }
    return out
}

export function encryptEcomCredentials(credentials: EcomCredentials): EcomCredentials {
    return mapStringValues(credentials as Record<string, unknown>, (value) => encryptToken(value)) as EcomCredentials
}

export function decryptEcomCredentials(credentials: EcomCredentials): EcomCredentials {
    return mapStringValues(credentials as Record<string, unknown>, (value) => decryptToken(value)) as EcomCredentials
}
