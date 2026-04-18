import { describe, test, expect } from "vitest"
import { encryptToken, decryptToken, isEncryptedToken } from "./token-cipher"

// Test için sabit bir 32-byte key (hex = 64 karakter)
const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

function withKey(key: string | undefined, fn: () => void) {
    const original = process.env.TOKEN_CIPHER_KEY
    if (key !== undefined) {
        process.env.TOKEN_CIPHER_KEY = key
    } else {
        delete process.env.TOKEN_CIPHER_KEY
    }
    try {
        fn()
    } finally {
        if (original !== undefined) {
            process.env.TOKEN_CIPHER_KEY = original
        } else {
            delete process.env.TOKEN_CIPHER_KEY
        }
    }
}

describe("token-cipher", () => {
    describe("encryptToken / decryptToken roundtrip", () => {
        test("encrypts and decrypts a token correctly", () => {
            withKey(TEST_KEY, () => {
                const plaintext = "EAAxxxSomeFakeMetaToken1234567890"
                const encrypted = encryptToken(plaintext)
                expect(encrypted).not.toBeNull()
                expect(encrypted).not.toBe(plaintext)
                expect(encrypted!.startsWith("enc:v1:")).toBe(true)

                const decrypted = decryptToken(encrypted)
                expect(decrypted).toBe(plaintext)
            })
        })

        test("each encrypt call produces a different ciphertext (random IV)", () => {
            withKey(TEST_KEY, () => {
                const plaintext = "same_plaintext_token"
                const enc1 = encryptToken(plaintext)
                const enc2 = encryptToken(plaintext)
                expect(enc1).not.toBe(enc2)
                expect(decryptToken(enc1)).toBe(plaintext)
                expect(decryptToken(enc2)).toBe(plaintext)
            })
        })

        test("handles null/undefined gracefully", () => {
            withKey(TEST_KEY, () => {
                expect(encryptToken(null)).toBeNull()
                expect(encryptToken(undefined)).toBeNull()
                expect(decryptToken(null)).toBeNull()
                expect(decryptToken(undefined)).toBeNull()
            })
        })

        test("handles empty string", () => {
            withKey(TEST_KEY, () => {
                expect(encryptToken("")).toBe("")
                expect(decryptToken("")).toBe("")
            })
        })
    })

    describe("backward compatibility (legacy plaintext tokens)", () => {
        test("decryptToken passes through non-prefixed values unchanged", () => {
            withKey(TEST_KEY, () => {
                const legacy = "EAAxxxOldPlaintextToken"
                expect(decryptToken(legacy)).toBe(legacy)
            })
        })

        test("decryptToken passes through non-prefixed values when KEY is missing", () => {
            withKey(undefined, () => {
                const legacy = "EAAxxxOldPlaintextToken"
                expect(decryptToken(legacy)).toBe(legacy)
            })
        })
    })

    describe("no-op mode (KEY not set)", () => {
        test("encryptToken returns plaintext when KEY not set", () => {
            withKey(undefined, () => {
                const plaintext = "EAAxxxSomeMetaToken"
                const result = encryptToken(plaintext)
                expect(result).toBe(plaintext)
                expect(isEncryptedToken(result)).toBe(false)
            })
        })

        test("decryptToken returns null for encrypted value when KEY not set", () => {
            // Önce şifrele (key varken)
            let encrypted: string | null = null
            withKey(TEST_KEY, () => {
                encrypted = encryptToken("EAAxxxToken")
            })
            // Sonra key olmadan çöz — null dönmeli
            withKey(undefined, () => {
                expect(decryptToken(encrypted)).toBeNull()
            })
        })
    })

    describe("isEncryptedToken", () => {
        test("returns true for encrypted token", () => {
            withKey(TEST_KEY, () => {
                const enc = encryptToken("something")
                expect(isEncryptedToken(enc)).toBe(true)
            })
        })

        test("returns false for plaintext", () => {
            expect(isEncryptedToken("EAAxxxPlaintext")).toBe(false)
            expect(isEncryptedToken(null)).toBe(false)
            expect(isEncryptedToken(undefined)).toBe(false)
        })
    })

    describe("tamper detection", () => {
        test("decryptToken returns null when ciphertext is tampered", () => {
            withKey(TEST_KEY, () => {
                const encrypted = encryptToken("EAAxxxToken")!
                const parts = encrypted.split(":")
                // Ciphertext kısmını bozalım (son kısım)
                parts[parts.length - 1] = "deadbeef"
                const tampered = parts.join(":")
                expect(decryptToken(tampered)).toBeNull()
            })
        })

        test("decryptToken returns null for malformed enc:v1: value", () => {
            withKey(TEST_KEY, () => {
                expect(decryptToken("enc:v1:onlytwoparts")).toBeNull()
                expect(decryptToken("enc:v1:a:b:c:d")).toBeNull() // too many parts → 4 when split on ":" (rest split), actually 4 parts
            })
        })
    })
})
