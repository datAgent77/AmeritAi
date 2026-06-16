"use client"

import { useEffect, useState } from "react"
import { Loader2, Megaphone, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { formatOmniDateTime } from "@/lib/omni/i18n"

interface AnnouncementPayload {
    isActive: boolean
    message: string
    updatedAt?: string | null
    updatedBy?: string | null
}

export function OmniAnnouncementsPanel() {
    const { user, hasOmniPermission } = useAuth()
    const { language } = useLanguage()
    const { toast } = useToast()
    const [form, setForm] = useState<AnnouncementPayload>({
        isActive: false,
        message: "",
        updatedAt: null,
        updatedBy: null,
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const load = async () => {
        if (!user) return
        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/content/announcements", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!response.ok) {
                throw new Error("Failed to load announcement")
            }

            const data = await response.json()
            setForm(data.announcement || { isActive: false, message: "" })
        } catch (error) {
            console.error("Failed to load announcement", error)
            toast({
                title: language === "tr" ? "Duyuru yüklenemedi" : language === "es" ? "No se pudo cargar el anuncio" : "Announcement could not be loaded",
                description: language === "tr" ? "Daha sonra tekrar deneyin." : language === "es" ? "Inténtalo de nuevo más tarde." : "Try again later.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [user])

    const save = async () => {
        if (!user) return
        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/content/announcements", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    isActive: form.isActive,
                    message: form.message,
                }),
            })
            if (!response.ok) {
                throw new Error("Failed to save announcement")
            }

            const data = await response.json()
            setForm(data.announcement || form)
            toast({
                title: language === "tr" ? "Kaydedildi" : language === "es" ? "Guardado" : "Saved",
                description: language === "tr" ? "Duyuru güncellendi." : language === "es" ? "El anuncio se actualizó." : "Announcement was updated.",
            })
        } catch (error) {
            console.error("Failed to save announcement", error)
            toast({
                title: language === "tr" ? "Kaydedilemedi" : "Could not save",
                description: language === "tr" ? "Tekrar deneyin." : "Try again.",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (!hasOmniPermission("content.manage")) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                    {language === "tr"
                        ? "Global duyuru yönetimi yalnızca super admin erişimi ile kullanılabilir."
                        : language === "es"
                        ? "La gestión global de anuncios solo está disponible para super administradores."
                        : "Global announcement management is available to super admins only."}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Megaphone className="h-5 w-5" />
                            {language === "tr" ? "Global Duyuru" : "Global Announcement"}
                        </CardTitle>
                        <CardDescription>
                            {language === "tr"
                                ? "Tenant dashboard yüzeylerinde görünen global banner mesajını yönetin."
                                : language === "es"
                                ? "Gestiona el mensaje del banner global que se muestra en las superficies del panel del cliente."
                                : "Manage the global banner message shown across tenant dashboard surfaces."}
                        </CardDescription>
                    </div>
                    <Button variant="outline" onClick={load}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {language === "tr" ? "Yenile" : "Refresh"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                            <div>
                                <div className="font-medium">{language === "tr" ? "Duyuru aktif" : "Announcement active"}</div>
                                <div className="text-sm text-muted-foreground">
                                    {language === "tr"
                                        ? "Aktif olduğunda dashboard üzerinde banner görünür."
                                        : language === "es"
                                        ? "Cuando está activado, el banner se muestra en los paneles."
                                        : "When enabled, the banner is shown on dashboards."}
                                </div>
                            </div>
                            <Switch checked={form.isActive} onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))} />
                        </div>

                        <div className="space-y-2">
                            <Label>{language === "tr" ? "Mesaj" : "Message"}</Label>
                            <Input
                                value={form.message || ""}
                                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                                placeholder={language === "tr" ? "Örn. Planlı bakım bu gece 23:00'te başlayacak." : language === "es" ? "Ej. El mantenimiento programado comienza esta noche a las 23:00." : "e.g. Scheduled maintenance starts tonight at 23:00."}
                            />
                        </div>

                        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                            <div>
                                {language === "tr" ? "Son güncelleme" : language === "es" ? "Última actualización" : "Last updated"}:{" "}
                                {form.updatedAt ? formatOmniDateTime(form.updatedAt, language) : "-"}
                            </div>
                            <div>
                                {language === "tr" ? "Güncelleyen" : language === "es" ? "Actualizado por" : "Updated by"}: {form.updatedBy || "-"}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={save} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {language === "tr" ? "Kaydet" : "Save"}
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
