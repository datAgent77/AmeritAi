"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getVisibleProducts } from "@/lib/product-items"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

export default function ProductsPage() {
    const { productEntitlements, role } = useAuth()
    const visibleProducts = getVisibleProducts(productEntitlements, {
        includeAll: role === "SUPER_ADMIN",
    })

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Ürünler</h1>
                <p className="text-muted-foreground">Vion platformundaki ürünlerinizi yönetin.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {visibleProducts.map((product) => (
                    <Card key={product.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                        <div className={`absolute top-0 left-0 right-0 h-1 ${product.bgColor}`}></div>
                        <CardHeader>
                            <div className={`w-12 h-12 rounded-lg ${product.bgColor} flex items-center justify-center mb-4`}>
                                <product.icon className={`h-6 w-6 ${product.color}`} />
                            </div>
                            <CardTitle className="flex items-center justify-between">
                                {product.title}
                                {product.status === "coming_soon" && (
                                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                                        Soon
                                    </span>
                                )}
                            </CardTitle>
                            <CardDescription>{product.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href={product.href}>
                                <Button className="w-full" variant="outline">
                                    Ürüne Git
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
