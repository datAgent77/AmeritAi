"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LayoutGrid } from "lucide-react"
import { getVisibleProducts } from "@/lib/product-items"

import { useAuth } from "@/context/AuthContext"

export function ProductLauncher() {
    const router = useRouter()
    const { productEntitlements, role } = useAuth()
    const visibleProducts = getVisibleProducts(productEntitlements, {
        includeAll: role === "SUPER_ADMIN",
    })

    // Don't render the launcher if no products are visible
    if (visibleProducts.length === 0) {
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
                            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <div className={`p-3 rounded-xl ${product.bgColor} ${product.color}`}>
                                <product.icon className="w-6 h-6" />
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
