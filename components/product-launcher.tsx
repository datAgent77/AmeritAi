"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LayoutGrid } from "lucide-react"
import { getVisibleProducts } from "@/lib/product-items"
import type { ProductEntitlements } from "@/lib/omni/types"

import { useAuth } from "@/context/AuthContext"

export function ProductLauncher({ targetUserId }: { targetUserId?: string }) {
    const router = useRouter()
    const pathname = usePathname() || ""
    const { productEntitlements, role, user } = useAuth()
    const [targetEntitlements, setTargetEntitlements] = useState<ProductEntitlements | null>(null)

    useEffect(() => {
        let cancelled = false

        const loadTargetEntitlements = async () => {
            if (!targetUserId || !user || (role !== "SUPER_ADMIN" && role !== "AGENCY_ADMIN")) {
                setTargetEntitlements(null)
                return
            }

            try {
                const token = await user.getIdToken()
                const response = await fetch(`/api/console/settings?chatbotId=${encodeURIComponent(targetUserId)}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (!response.ok) throw new Error("Failed to load target product entitlements")
                const data = await response.json()
                if (cancelled) return
                setTargetEntitlements({
                    chatbot: data.productEntitlements?.chatbot ?? (data.enableChatbot !== false),
                    omniChannel: data.productEntitlements?.omniChannel === true || data.enableOmniChannel === true,
                    cookieConsent: data.productEntitlements?.cookieConsent === true || data.enableCookieConsent === true,
                    copywriter: data.productEntitlements?.copywriter === true,
                    leadFinder: data.productEntitlements?.leadFinder === true,
                })
            } catch (error) {
                if (cancelled) return
                console.error("Failed to load target product entitlements:", error)
                setTargetEntitlements(null)
            }
        }

        loadTargetEntitlements()

        return () => {
            cancelled = true
        }
    }, [role, targetUserId, user])

    const activeProductId = useMemo(() => {
        if (pathname.startsWith("/omni")) return "omni-channel"
        if (pathname.startsWith("/cookie")) return "cookie-consent"
        return "chatbot"
    }, [pathname])

    const shouldUseTargetEntitlements = Boolean(targetUserId && (role === "SUPER_ADMIN" || role === "AGENCY_ADMIN"))
    const effectiveEntitlements = shouldUseTargetEntitlements ? targetEntitlements : productEntitlements
    if (!effectiveEntitlements) {
        return null
    }

    const visibleProducts = getVisibleProducts(effectiveEntitlements, {
        includeAll: role === "SUPER_ADMIN" && !targetUserId,
    })

    if (visibleProducts.length < 2) {
        return null
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
                    <LayoutGrid className="h-5 w-5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
                <div className="grid grid-cols-3 gap-4">
                    {visibleProducts.map((product) => (
                        <button
                            key={product.id}
                            onClick={() => product.status === "active" && router.push(product.href)}
                            disabled={product.status !== "active"}
                            className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors disabled:cursor-not-allowed disabled:opacity-50 group ${
                                product.id === activeProductId
                                    ? "border-foreground bg-muted"
                                    : "border-transparent hover:border-border hover:bg-muted/60"
                            }`}
                        >
                            <div className="rounded-xl bg-muted p-3 text-foreground">
                                <product.icon className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-medium text-center group-hover:text-primary">
                                {product.title}
                            </span>
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}
