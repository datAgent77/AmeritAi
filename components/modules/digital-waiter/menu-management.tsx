"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Globe, FileText, List, Save, Loader2, Plus, Trash2, ExternalLink } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

interface MenuConfig {
    type: 'url' | 'pdf' | 'manual'
    url?: string
    pdfUrl?: string
    items?: MenuItem[]
}

interface MenuItem {
    id: string
    name: string
    price: string
    category: string
    description?: string
    image?: string
}

export function MenuManagement({ chatbotId }: { chatbotId: string }) {
    const [config, setConfig] = useState<MenuConfig>({ type: 'url' })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        if (!chatbotId) return
        
        const fetchConfig = async () => {
            try {
                const docSnap = await getDoc(doc(db, "digital_waiter_menu", chatbotId))
                if (docSnap.exists()) {
                    setConfig(docSnap.data() as MenuConfig)
                }
            } catch (error) {
                console.error("Fetch menu failed", error)
            } finally {
                setLoading(false)
            }
        }
        
        fetchConfig()
    }, [chatbotId])

    const saveMenu = async () => {
        setSaving(true)
        try {
            await setDoc(doc(db, "digital_waiter_menu", chatbotId), config)
            toast({
                title: "Başarılı",
                description: "Menü ayarları kaydedildi.",
            })
        } catch (error) {
            toast({
                title: "Hata",
                description: "Kaydedilirken bir sorun oluştu.",
                variant: "destructive"
            })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Menü Kaynağı</CardTitle>
                    <CardDescription>
                        Müşterilerinizin menüye nasıl erişeceğini seçin.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button 
                            variant={config.type === 'url' ? 'default' : 'outline'} 
                            className="h-24 flex flex-col gap-2"
                            onClick={() => setConfig({ ...config, type: 'url' })}
                        >
                            <Globe className="w-6 h-6" />
                            <span>Web URL</span>
                        </Button>
                        <Button 
                            variant={config.type === 'pdf' ? 'default' : 'outline'} 
                            className="h-24 flex flex-col gap-2"
                            onClick={() => setConfig({ ...config, type: 'pdf' })}
                        >
                            <FileText className="w-6 h-6" />
                            <span>PDF Menü</span>
                        </Button>
                        <Button 
                            variant={config.type === 'manual' ? 'default' : 'outline'} 
                            className="h-24 flex flex-col gap-2"
                            onClick={() => setConfig({ ...config, type: 'manual' })}
                        >
                            <List className="w-6 h-6" />
                            <span>Manuel Liste</span>
                        </Button>
                    </div>

                    <div className="pt-4 border-t">
                        {config.type === 'url' && (
                            <div className="space-y-2">
                                <Label>Menü Web Adresi (URL)</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="https://restoran.com/menu" 
                                        value={config.url || ""}
                                        onChange={(e) => setConfig({ ...config, url: e.target.value })}
                                    />
                                    <Button variant="ghost" size="icon" asChild disabled={!config.url}>
                                        <a href={config.url} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground italic">
                                    Mevcut dijital menünüzün linkini buraya yapıştırın. AI bu sayfayı tarayarak müşterilere bilgi verebilir.
                                </p>
                            </div>
                        )}

                        {config.type === 'pdf' && (
                            <div className="space-y-2">
                                <Label>PDF Dosyası URL</Label>
                                <Input 
                                    placeholder="https://restoran.com/menu.pdf" 
                                    value={config.pdfUrl || ""}
                                    onChange={(e) => setConfig({ ...config, pdfUrl: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground italic">
                                    Yüklediğiniz menü dosyasının linkini girin. Yakında direkt dosya yükleme eklenecektir.
                                </p>
                            </div>
                        )}

                        {config.type === 'manual' && (
                            <div className="py-8 text-center bg-muted/20 rounded-lg border-2 border-dashed">
                                <List className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Manuel ürün yönetimi yakında aktif edilecek.</p>
                                <Button variant="link" size="sm" onClick={() => setConfig({ ...config, type: 'url' })}>
                                    Şimdilik URL kullanın
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={saveMenu} disabled={saving}>
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            <Save className="w-4 h-4 mr-2" />
                            Değişiklikleri Kaydet
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
