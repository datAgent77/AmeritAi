import crypto from "crypto"

const TOKEN_PREFIX = "enc:v1:"
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12

function getCipherKey(): Buffer | null {
    const raw = process.env.TOKEN_CIPHER_KEY || ""
    if (!raw || raw.length !== 64) {
        if (process.env.NODE_ENV === "production" && raw.length === 0) {
            console.error(
                "[vion-token-cipher] TOKEN_CIPHER_KEY is not set. Access tokens stored in plaintext cannot be decrypted safely."
            )
        }
        return null
    }

    try {
        const key = Buffer.from(raw, "hex")
        return key.length === 32 ? key : null
    } catch {
        return null
    }
}

export function encryptToken(plaintext: string | null | undefined): string | null {
    if (!plaintext) return plaintext ?? null

    const key = getCipherKey()
    if (!key) return plaintext

    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
    const authTag = cipher.getAuthTag()

    return `${TOKEN_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`
}

export function decryptToken(stored: string | null | undefined): string | null {
    if (!stored) return stored ?? null
    if (!stored.startsWith(TOKEN_PREFIX)) return stored

    const key = getCipherKey()
    if (!key) {
        console.error("[vion-token-cipher] decryptToken: TOKEN_CIPHER_KEY not set but encrypted value found.")
        return null
    }

    const parts = stored.slice(TOKEN_PREFIX.length).split(":")
    if (parts.length !== 3) {
        console.error("[vion-token-cipher] decryptToken: malformed encrypted token.")
        return null
    }

    try {
        const [ivHex, tagHex, ctHex] = parts
        const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex")) as crypto.DecipherGCM
        decipher.setAuthTag(Buffer.from(tagHex, "hex"))
        const decrypted = Buffer.concat([decipher.update(Buffer.from(ctHex, "hex")), decipher.final()])
        return decrypted.toString("utf8")
    } catch (error) {
        console.error("[vion-token-cipher] decryptToken failed.", error)
        return null
    }
}
