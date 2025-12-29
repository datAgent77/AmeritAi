"use client"

import { useState, useRef } from "react"
import { ShopperDashboard } from "@/components/shopper-dashboard"
import { ShopperSettings } from "@/components/shopper-settings"
import { ProductKnowledge } from "@/components/product-knowledge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { Loader2, RefreshCw, Rss, ShoppingBag, FileText, Plus } from "lucide-react"

export default function ShopperPage() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState("overview")
    const [feedUrl, setFeedUrl] = useState("")
    const [isUploading, setIsUploading] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0])
        }
    }

    const handleFileUpload = async (file: File) => {
        if (!user) return
        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('chatbotId', user.uid)

        try {
            const response = await fetch('/api/chatbot/shopper/upload', {
                method: 'POST',
                body: formData
            })
            const data = await response.json()

            if (data.success) {
                toast({
                    title: "Başarılı",
                    description: `${data.count} ürün başarıyla yüklendi.`
                })
                // Refresh catalog if active or notify user to check
                if (activeTab === 'catalog') {
                    // Trigger refresh logic? Components are decoupled via tabs.
                    // Ideally we lift state or use context, but simplest is just switch tab to force re-mounting or user checks.
                }
                setActiveTab("catalog")
            } else {
                throw new Error(data.error || "Yükleme başarısız")
            }
        } catch (error: any) {
            console.error("Upload error:", error)
            toast({
                title: "Yükleme Hatası",
                description: error.message,
                variant: "destructive"
            })
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    const handleSync = async () => {
        if (!feedUrl) {
            toast({
                title: "Hata",
                description: "Lütfen geçerli bir XML Feed URL girin.",
                variant: "destructive"
            })
            return
        }

        setIsSyncing(true)
        try {
            const response = await fetch("/api/chatbot/shopper/feed-sync", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${await user?.getIdToken()}`
                },
                body: JSON.stringify({
                    feedUrl,
                    chatbotId: user?.uid
                })
            })

            const data = await response.json()

            if (data.success) {
                toast({
                    title: "Başarılı",
                    description: `Feed başarıyla senkronize edildi. ${data.count} ürün işlendi.`
                })
            } else {
                throw new Error(data.error || "Feed senkronize edilemedi")
            }
        } catch (error: any) {
            console.error("Sync error:", error)
            toast({
                title: "Senkronizasyon Hatası",
                description: error.message,
                variant: "destructive"
            })
        } finally {
            setIsSyncing(false)
        }
    }

    return (
        <div className="p-8 space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Kişisel Alışveriş Asistanı</h1>
                <p className="text-muted-foreground">
                    Yapay zeka satış asistanınızı, ürün kataloğunuzu ve veri kaynaklarınızı yönetin.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
                    <TabsTrigger value="catalog">Ürün Kataloğu</TabsTrigger>
                    <TabsTrigger value="datasources">Veri Kaynakları</TabsTrigger>
                    <TabsTrigger value="settings">Asistan Ayarları</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <ShopperDashboard onNavigateToCatalog={() => setActiveTab("catalog")} />
                </TabsContent>

                <TabsContent value="catalog" className="space-y-4">
                    <div className="bg-white rounded-lg border p-6 shadow-sm">
                        <ProductKnowledge />
                    </div>
                </TabsContent>

                <TabsContent value="datasources" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* XML Feed */}
                        <Card className="flex flex-col border-none shadow-sm ring-1 ring-slate-200">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl">
                                        <Rss className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">XML Ürün Beslemesi</CardTitle>
                                        <CardDescription>Otomatik günlük senkronizasyon</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 flex-1">
                                <div className="space-y-3">
                                    <Label htmlFor="feed-url" className="text-sm font-semibold">Feed URL</Label>
                                    <Input
                                        id="feed-url"
                                        placeholder="https://ornek.com/products.xml"
                                        value={feedUrl}
                                        onChange={(e) => setFeedUrl(e.target.value)}
                                        className="h-11 shadow-sm"
                                    />
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                                            💡 Google Merchant Center, RSS 2.0 ve özel XML formatlarını destekler. Fiyat ve stoklar otomatik güncellenir.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-2">
                                <Button onClick={handleSync} disabled={isSyncing} className="w-full h-11 font-bold">
                                    {isSyncing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Senkronize Ediliyor...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Şimdi Senkronize Et
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Shopify (Placeholder) */}
                        <Card className="flex flex-col border-none shadow-sm ring-1 ring-slate-200 opacity-80 group hover:opacity-100 transition-opacity">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                                        <ShoppingBag className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Shopify Entegrasyonu</CardTitle>
                                        <CardDescription>Mağazanızı doğrudan bağlayın</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                                    Shopify mağazanızı bağlayarak ürünlerinizi, koleksiyonlarınızı ve stok durumunuzu tek tıkla aktarın.
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" className="w-full h-11 border-dashed border-2 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 font-bold transition-all">
                                    Çok Yakında
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* File Upload */}
                        <Card className="flex flex-col border-none shadow-sm ring-1 ring-slate-200 group hover:ring-primary/30 transition-shadow">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">CSV / Excel Yükle</CardTitle>
                                        <CardDescription>Manuel dosya aktarımı</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                                    Toplu ürün listelerinizi Excel veya CSV formatında yükleyerek kataloğunuzu saniyeler içinde oluşturun.
                                </p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".csv, .xlsx, .xls"
                                    onChange={handleFileSelect}
                                />
                            </CardContent>
                            <CardFooter>
                                <Button
                                    variant="outline"
                                    className="w-full h-11 font-bold group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Yükleniyor...
                                        </>
                                    ) : "Dosya Seç"}
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Manual Entry */}
                        <Card className="flex flex-col border-none shadow-sm ring-1 ring-slate-200 group hover:ring-primary/30 transition-shadow">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Manuel Ekleme</CardTitle>
                                        <CardDescription>Tekil ürün girişi</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                                    Ürünlerinizi manuel olarak tek tek ekleyebilir, fiyat ve stok bilgilerini istediğiniz zaman güncelleyebilirsiniz.
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    variant="outline"
                                    className="w-full h-11 font-bold group-hover:bg-slate-50 transition-colors"
                                    onClick={() => setActiveTab("catalog")}
                                >
                                    Kataloğa Git
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                    <ShopperSettings />
                </TabsContent>
            </Tabs>
        </div>
    )
}
