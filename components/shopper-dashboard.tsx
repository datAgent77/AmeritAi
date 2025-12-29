"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingBag, Package, AlertCircle, DollarSign, Plus, List, Loader2, ArrowRight, TrendingUp, Sparkles, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ShopperStats {
    totalProducts: number
    inStock: number
    outOfStock: number
    totalValue: number
}

interface Product {
    id: string
    name: string
    price: number
    currency: string
    inStock: boolean
    updatedAt: any
}

interface ShopperDashboardProps {
    onNavigateToCatalog?: () => void
}

export function ShopperDashboard({ onNavigateToCatalog }: ShopperDashboardProps) {
    const { user } = useAuth()
    const [stats, setStats] = useState<ShopperStats | null>(null)
    const [recentProducts, setRecentProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchStats = useCallback(async () => {
        setIsLoading(true)
        try {
            const response = await fetch(`/api/shopper/stats?chatbotId=${user?.uid}`)
            if (response.ok) {
                const data = await response.json()
                setStats(data.stats)
                setRecentProducts(data.recentProducts)
            }
        } catch (error) {
            console.error("Error fetching shopper stats:", error)
        } finally {
            setIsLoading(false)
        }
    }, [user])

    useEffect(() => {
        if (user) {
            fetchStats()
        }
    }, [user, fetchStats])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground animate-pulse">Veriler yükleniyor...</p>
                </div>
            </div>
        )
    }

    const StatCard = ({ title, value, subtext, icon: Icon, colorClass, bgColorClass }: any) => (
        <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white/50 backdrop-blur-sm border border-white/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <div className={cn("p-2 rounded-xl", bgColorClass, colorClass)}>
                    <Icon className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold tracking-tight">{value}</div>
                <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
            </CardContent>
            <div className={cn("h-1 w-full", bgColorClass)} />
        </Card>
    )

    return (
        <div className="space-y-8 pb-8">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Toplam Ürün"
                    value={stats?.totalProducts || 0}
                    subtext="Kataloğunuzdaki tüm kalemler"
                    icon={ShoppingBag}
                    colorClass="text-blue-600"
                    bgColorClass="bg-blue-50"
                />
                <StatCard
                    title="Stokta"
                    value={stats?.inStock || 0}
                    subtext="Önerilmeye hazır ürünler"
                    icon={CheckCircle2}
                    colorClass="text-emerald-600"
                    bgColorClass="bg-emerald-50"
                />
                <StatCard
                    title="Tükendi"
                    value={stats?.outOfStock || 0}
                    subtext="Şu an önerilemeyenler"
                    icon={AlertCircle}
                    colorClass="text-amber-600"
                    bgColorClass="bg-amber-50"
                />
                <StatCard
                    title="Katalog Değeri"
                    value={new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(stats?.totalValue || 0)}
                    subtext="Toplam ürün birim maliyeti"
                    icon={DollarSign}
                    colorClass="text-indigo-600"
                    bgColorClass="bg-indigo-50"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-7">
                {/* Recent Products */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <div>
                            <h3 className="text-lg font-semibold tracking-tight">Son Eklenenler</h3>
                            <p className="text-sm text-muted-foreground">Kataloğa dahil edilen son 5 ürün</p>
                        </div>
                        <Button size="sm" variant="ghost" className="text-primary hover:text-primary/80 hover:bg-primary/5 font-medium" onClick={onNavigateToCatalog}>
                            Tümünü Gör <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>

                    <div className="rounded-2xl border bg-white/50 backdrop-blur-sm overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="w-[300px] text-xs uppercase font-bold text-muted-foreground">Ürün</TableHead>
                                    <TableHead className="text-xs uppercase font-bold text-muted-foreground">Fiyat</TableHead>
                                    <TableHead className="text-xs uppercase font-bold text-muted-foreground">Durum</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentProducts.length === 0 ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={3} className="h-48 text-center border-none">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <div className="p-4 bg-muted/50 rounded-full">
                                                    <Package className="h-8 w-8 text-muted-foreground/50" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-medium">Henüz ürün bulunmuyor</p>
                                                    <p className="text-sm text-muted-foreground">Veri kaynaklarını kullanarak ürün ekleyin.</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    recentProducts.map((product) => (
                                        <TableRow key={product.id} className="hover:bg-muted/20 transition-colors border-muted/30">
                                            <TableCell className="font-medium py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs">
                                                        {product.name.charAt(0)}
                                                    </div>
                                                    <span className="truncate max-w-[200px]">{product.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-semibold">
                                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: product.currency || 'TRY' }).format(product.price)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="secondary"
                                                    className={cn(
                                                        "rounded-full px-2.5 py-0.5 font-medium text-xs border border-transparent",
                                                        product.inStock
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                            : "bg-red-50 text-red-700 border-red-100"
                                                    )}
                                                >
                                                    {product.inStock ? "Stokta" : "Tükendi"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* AI & Quick Actions */}
                <div className="lg:col-span-3 space-y-6">
                    <Card className="border-none bg-gradient-to-br from-primary/10 via-indigo-50/50 to-white shadow-sm ring-1 ring-primary/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                                <Sparkles className="h-5 w-5" />
                                AI Satış Gücü
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-3 bg-white/60 rounded-xl border border-white/40 shadow-sm transition-hover hover:shadow-md transition-all">
                                <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Eğitim Durumu</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-primary w-[85%] rounded-full" />
                                    </div>
                                    <span className="text-xs font-bold text-primary">85%</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-2 font-medium">
                                    AI asistanınız son eklenen {recentProducts.length} ürünü analiz etti ve öğrenmeye devam ediyor.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-1 bg-blue-100 text-blue-600 rounded-md">
                                        <TrendingUp className="h-3 w-3" />
                                    </div>
                                    <p className="text-sm leading-snug">
                                        <span className="font-semibold block text-slate-800">Detaylı Açıklamalar</span>
                                        Ürün açıklamalarını zenginleştirerek öneri isabetini %40 artırabilirsiniz.
                                    </p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-1 bg-emerald-100 text-emerald-600 rounded-md">
                                        <CheckCircle2 className="h-3 w-3" />
                                    </div>
                                    <p className="text-sm leading-snug">
                                        <span className="font-semibold block text-slate-800">Stok Senkronizasyonu</span>
                                        Otomatik feed ile stoktakileri her zaman güncel tutun.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-muted/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">Panel Yönetimi</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            <Button variant="outline" className="w-full justify-between h-auto py-3 px-4 transition-all hover:border-primary/50 group" onClick={onNavigateToCatalog}>
                                <div className="flex items-center gap-3 text-left">
                                    <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        <List className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">Ürün Kataloğu</div>
                                        <div className="text-[11px] text-muted-foreground">Kataloğu düzenle ve yönet</div>
                                    </div>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </Button>

                            <Button variant="outline" className="w-full justify-between h-auto py-3 px-4 transition-all hover:border-primary/50 group">
                                <div className="flex items-center gap-3 text-left">
                                    <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        <TrendingUp className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">Analitikler</div>
                                        <div className="text-[11px] text-muted-foreground">Satış ve etkileşim raporları</div>
                                    </div>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
