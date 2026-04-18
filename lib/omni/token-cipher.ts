import crypto from "crypto"

/**
 * AES-256-GCM tabanlı token şifreleme/çözme yardımcısı.
 *
 * Kullanım:
 *   - Firestore'a yazmadan önce:  encryptToken(plaintext)
 *   - Firestore'dan okuyup kullanmadan önce: decryptToken(stored)
 *
 * Env var:
 *   TOKEN_CIPHER_KEY — 32 byte hex (64 karakter).
 *   Üretmek için: openssl rand -hex 32
 *
 * ⚠️ TOKEN_CIPHER_KEY tanımlı değilse:
 *   - encryptToken → değeri olduğu gibi döndürür (no-op, dev kolaylığı)
 *   - decryptToken → değeri olduğu gibi döndürür
 *   Production ortamında bu anahtarın mutlaka tanımlanması gerekir.
 *
 * Format:
 *   enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 *
 * Backward compatibility:
 *   "enc:v1:" prefix'i olmayan değerler düz metin kabul edilir ve
 *   decryptToken tarafından olduğu gibi döndürülür.
 */

const TOKEN_PREFIX = "enc:v1:"
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12 // 96-bit IV is recommended for GCM

function getCipherKey(): Buffer | null {
    const raw = process.env.TOKEN_CIPHER_KEY || ""
    if (!raw || raw.length !== 64) {
        if (process.env.NODE_ENV === "production" && raw.length === 0) {
            console.error(
                "[token-cipher] WARNING: TOKEN_CIPHER_KEY is not set. " +
                    "Access tokens will be stored in plaintext. " +
                    "Set TOKEN_CIPHER_KEY to a 64-character hex string (openssl rand -hex 32)."
            )
        }
        return null
    }
    try {
        const key = Buffer.from(raw, "hex")
        if (key.length !== 32) return null
        return key
    } catch {
        return null
    }
}

/**
 * Bir plaintext token'ı AES-256-GCM ile şifreler.
 * KEY yoksa veya boşsa değeri olduğu gibi döndürür.
 */
export function encryptToken(plaintext: string | null | undefined): string | null {
    if (!plaintext) return plaintext ?? null

    const key = getCipherKey()
    if (!key) {
        // No-op: key yoksa şifrelemeden döndür
        return plaintext
    }

    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
    const authTag = cipher.getAuthTag()

    return `${TOKEN_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`
}

/**
 * Şifrelenmiş bir token'ı çözer.
 * "enc:v1:" prefix'i yoksa (legacy / düz metin) değeri olduğu gibi döndürür.
 * KEY yoksa veya boşsa yine de backward compat olarak olduğu gibi döndürür.
 */
export function decryptToken(stored: string | null | undefined): string | null {
    if (!stored) return stored ?? null

    // Backward compat: prefix yoksa düz metin kabul et
    if (!stored.startsWith(TOKEN_PREFIX)) {
        return stored
    }

    const key = getCipherKey()
    if (!key) {
        // KEY yok — şifreli değeri çözemeyiz, güvenli hata
        console.error("[token-cipher] decryptToken: TOKEN_CIPHER_KEY not set but encrypted value found.")
        return null
    }

    const rest = stored.slice(TOKEN_PREFIX.length)
    const parts = rest.split(":")
    if (parts.length !== 3) {
        console.error("[token-cipher] decryptToken: Malformed encrypted token.")
        return null
    }

    const [ivHex, tagHex, ctHex] = parts
    try {
        const iv = Buffer.from(ivHex, "hex")
        const authTag = Buffer.from(tagHex, "hex")
        const ciphertext = Buffer.from(ctHex, "hex")

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM
        decipher.setAuthTag(authTag)
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
        return decrypted.toString("utf8")
    } catch (err) {
        console.error("[token-cipher] decryptToken: Decryption failed.", err)
        return null
    }
}

/**
 * Bir değerin şifrelenmiş formatta olup olmadığını kontrol eder.
 */
export function isEncryptedToken(value: string | null | undefined): boolean {
    return typeof value === "string" && value.startsWith(TOKEN_PREFIX)
}
