"use client"

import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasswordStrengthProps {
    password: string
    className?: string
    language?: string
}

interface Requirement {
    label: string
    met: boolean
}

const COMMON_WEAK_PASSWORDS = new Set([
    "password",
    "password123",
    "12345678",
    "123456789",
    "1234567890",
    "qwerty",
    "qwerty123",
    "letmein",
    "welcome",
    "admin",
    "iloveyou",
])

function getPasswordChecks(password: string) {
    const normalized = password.trim().toLowerCase()
    const hasLetters = /[a-z]/i.test(password)
    const hasNumbers = /[0-9]/.test(password)
    const hasSymbols = /[^a-z0-9]/i.test(password)
    const hasLower = /[a-z]/.test(password)
    const hasUpper = /[A-Z]/.test(password)
    const categoryCount = Number(hasLetters) + Number(hasNumbers) + Number(hasSymbols)

    const repeatedPattern = /^([a-zA-Z0-9])\1{5,}$/.test(password)
    const sequentialPattern = /(0123|1234|2345|3456|4567|5678|6789|7890|abcd|bcde|cdef|qwer)/i.test(normalized)
    const isCommonWeak = COMMON_WEAK_PASSWORDS.has(normalized) || repeatedPattern || sequentialPattern

    return {
        hasLower,
        hasUpper,
        categoryCount,
        isCommonWeak,
        isMinLength: password.length >= 8,
    }
}

function getStrengthScore(password: string): number {
    if (!password) return 0
    const checks = getPasswordChecks(password)
    if (checks.isCommonWeak) return 0

    let score = 0
    if (checks.isMinLength) score += 1
    if (password.length >= 12) score += 1
    if (checks.categoryCount >= 2) score += 1
    if (checks.categoryCount === 3) score += 1
    if (checks.hasLower && checks.hasUpper) score += 1
    return score
}

function getStrengthLevel(score: number): "weak" | "good" | "strong" {
    if (score <= 1) return "weak"
    if (score <= 3) return "good"
    return "strong"
}

function getStrengthMeta(score: number, language: string) {
    const level = getStrengthLevel(score)
    const isTurkish = language === "tr"

    if (level === "weak") {
        return {
            label: isTurkish ? "Zayıf" : "Weak",
            colorClass: "text-red-500",
            activeBars: 1,
            barClass: "bg-red-500",
        }
    }

    if (level === "good") {
        return {
            label: isTurkish ? "İyi" : "Good",
            colorClass: "text-amber-500",
            activeBars: 2,
            barClass: "bg-amber-500",
        }
    }

    return {
        label: isTurkish ? "Güçlü" : "Strong",
        colorClass: "text-green-500",
        activeBars: 3,
        barClass: "bg-green-500",
    }
}

export function PasswordStrength({ password, className, language = "en" }: PasswordStrengthProps) {
    const checks = getPasswordChecks(password)
    const score = getStrengthScore(password)
    const strength = getStrengthMeta(score, language)
    const isTurkish = language === "tr"

    const requirements: Requirement[] = [
        { label: isTurkish ? "En az 8 karakter" : "At least 8 characters", met: checks.isMinLength },
        { label: isTurkish ? "En az iki tip: harf, sayı, sembol" : "At least 2 types: letters, numbers, symbols", met: checks.categoryCount >= 2 },
        { label: isTurkish ? "Yaygın/zayıf şifre kullanma" : "Avoid common or weak passwords", met: !checks.isCommonWeak },
    ]

    const hasTyped = password.length > 0

    return (
        <div className={cn("space-y-2 text-xs", className)}>
            <div className="flex items-center justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">
                    {isTurkish ? "Şifre Gücü" : "Password strength"}
                </span>
                <span
                    className={cn(
                        "font-medium transition-colors",
                        hasTyped ? strength.colorClass : "text-zinc-400 dark:text-zinc-500"
                    )}
                >
                    {hasTyped ? strength.label : (isTurkish ? "Başlayın" : "Start typing")}
                </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
                {[0, 1, 2].map((bar) => (
                    <div
                        key={bar}
                        className={cn(
                            "h-1.5 rounded-full transition-colors",
                            hasTyped && bar < strength.activeBars ? strength.barClass : "bg-zinc-700/40"
                        )}
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 gap-y-1">
                {requirements.map((req, index) => (
                    <div
                        key={index}
                        className={cn(
                            "flex items-center gap-1.5 transition-colors",
                            req.met ? "text-green-600 dark:text-green-400" : "text-zinc-400 dark:text-zinc-500"
                        )}
                    >
                        {req.met ? (
                            <Check className="h-3 w-3" />
                        ) : (
                            <X className="h-3 w-3" />
                        )}
                        <span>{req.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export function isPasswordStrong(password: string): boolean {
    const checks = getPasswordChecks(password)
    return checks.isMinLength && checks.categoryCount >= 2 && !checks.isCommonWeak
}
