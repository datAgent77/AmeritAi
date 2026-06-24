"use client"

import { useEffect, useMemo, useState } from "react"
import { Eye, Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { formatOmniDateTime } from "@/lib/omni/i18n"
import type { CmsBlogPost, CmsContentKind, CmsEducationItem, CmsFaqItem } from "@/lib/cms-content"

type ContentItem = CmsBlogPost | CmsFaqItem | CmsEducationItem

function getContentCopy(kind: CmsContentKind, language: string) {
    const pick = (tr: string, en: string, es: string) => (language === "tr" ? tr : language === "es" ? es : en)

    if (kind === "blog") {
        return {
            singular: pick("blog yazısı", "blog post", "entrada de blog"),
            plural: pick("Blog yazıları", "Blog posts", "Entradas de blog"),
            description: pick(
                "Global blog içeriklerini oluşturun, düzenleyin ve yayın durumunu yönetin.",
                "Create, edit, and manage publishing state for global blog content.",
                "Crea, edita y gestiona el estado de publicación del contenido global del blog."
            ),
            empty: pick("Henüz blog yazısı yok.", "No blog posts yet.", "Aún no hay entradas de blog."),
            titleLabel: pick("Başlık", "Title", "Título"),
            secondaryLabel: pick("Özet", "Excerpt", "Extracto"),
        }
    }

    if (kind === "faq") {
        return {
            singular: pick("SSS öğesi", "FAQ item", "elemento de FAQ"),
            plural: pick("SSS", "FAQs", "Preguntas frecuentes"),
            description: pick(
                "Global SSS içeriğini kategori ve sıralama bilgisiyle yönetin.",
                "Manage global FAQ content with category and ordering.",
                "Gestiona el contenido global de FAQ con categoría y orden."
            ),
            empty: pick("Henüz SSS kaydı yok.", "No FAQ items yet.", "Aún no hay elementos de FAQ."),
            titleLabel: pick("Soru", "Question", "Pregunta"),
            secondaryLabel: pick("Yanıt", "Answer", "Respuesta"),
        }
    }

    return {
        singular: pick("eğitim içeriği", "education item", "elemento de formación"),
        plural: pick("Eğitim içerikleri", "Education items", "Elementos de formación"),
        description: pick(
            "Operasyon rehberleri, eğitim videoları ve makaleleri burada yönetin.",
            "Manage operator guides, training videos, and education articles here.",
            "Gestiona aquí las guías para operadores, los videos de formación y los artículos."
        ),
        empty: pick("Henüz eğitim içeriği yok.", "No education items yet.", "Aún no hay elementos de formación."),
        titleLabel: pick("Başlık", "Title", "Título"),
        secondaryLabel: pick("Açıklama", "Description", "Descripción"),
    }
}

function getLocalizedValue(value: { en: string; tr: string }, language: string) {
    return language === "tr" ? value.tr : value.en
}

function createEmptyForm(kind: CmsContentKind) {
    if (kind === "blog") {
        return {
            slug: "",
            title: { en: "", tr: "" },
            excerpt: { en: "", tr: "" },
            content: { en: "", tr: "" },
            category: "",
            date: new Date().toISOString().slice(0, 10),
            readTime: "",
            published: true,
            image: "",
            author: { name: "AmeritAI Team", avatar: "VA" },
        }
    }

    if (kind === "faq") {
        return {
            question: { en: "", tr: "" },
            answer: { en: "", tr: "" },
            category: "",
            order: 0,
            published: true,
        }
    }

    return {
        title: { en: "", tr: "" },
        description: { en: "", tr: "" },
        type: "guide",
        url: "",
        published: true,
    }
}

export function OmniContentPanel({ kind }: { kind: CmsContentKind }) {
    const { user, hasOmniPermission } = useAuth()
    const { language } = useLanguage()
    const { toast } = useToast()
    const locale = language === "tr" ? "tr" : "en"
    const copy = useMemo(() => getContentCopy(kind, language), [kind, language])
    const [items, setItems] = useState<ContentItem[]>([])
    const [search, setSearch] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [editorOpen, setEditorOpen] = useState(false)
    const [previewOpen, setPreviewOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [previewItem, setPreviewItem] = useState<ContentItem | null>(null)
    const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all")
    const [form, setForm] = useState<any>(() => createEmptyForm(kind))

    const load = async () => {
        if (!user) return
        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/content/${kind}`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (!response.ok) {
                throw new Error("Failed to load content")
            }

            const data = await response.json()
            setItems(Array.isArray(data.items) ? data.items : [])
        } catch (error) {
            console.error("Failed to load content", error)
            toast({
                title: language === "tr" ? "İçerik yüklenemedi" : language === "es" ? "No se pudo cargar el contenido" : "Content could not be loaded",
                description: language === "tr" ? "Daha sonra tekrar deneyin." : language === "es" ? "Inténtalo de nuevo más tarde." : "Try again later.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [user, kind])

    const filteredItems = useMemo(() => {
        const query = search.trim().toLowerCase()
        const filteredByStatus = items.filter((item) => {
            const published = (item as any).published !== false
            if (statusFilter === "published") return published
            if (statusFilter === "draft") return !published
            return true
        })

        if (!query) return filteredByStatus

        return filteredByStatus.filter((item) => {
            if (kind === "blog") {
                const blog = item as CmsBlogPost
                return (
                    blog.title.en.toLowerCase().includes(query) ||
                    blog.title.tr.toLowerCase().includes(query) ||
                    blog.category.toLowerCase().includes(query)
                )
            }

            if (kind === "faq") {
                const faq = item as CmsFaqItem
                return (
                    faq.question.en.toLowerCase().includes(query) ||
                    faq.question.tr.toLowerCase().includes(query) ||
                    faq.category.toLowerCase().includes(query)
                )
            }

            const education = item as CmsEducationItem
            return (
                education.title.en.toLowerCase().includes(query) ||
                education.title.tr.toLowerCase().includes(query) ||
                String(education.type).toLowerCase().includes(query)
            )
        })
    }, [items, kind, search, statusFilter])

    const summary = useMemo(() => {
        return items.reduce(
            (accumulator, item) => {
                const published = (item as any).published !== false
                accumulator.total += 1
                if (published) accumulator.published += 1
                else accumulator.draft += 1
                return accumulator
            },
            { total: 0, published: 0, draft: 0 }
        )
    }, [items])

    const openCreate = () => {
        setEditingId(null)
        setForm(createEmptyForm(kind))
        setEditorOpen(true)
    }

    const openEdit = (item: ContentItem) => {
        setEditingId(item.id || null)
        setForm(JSON.parse(JSON.stringify(item)))
        setEditorOpen(true)
    }

    const openPreview = (item: ContentItem) => {
        setPreviewItem(item)
        setPreviewOpen(true)
    }

    const save = async () => {
        if (!user) return
        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const endpoint = editingId ? `/api/omni/content/${kind}/${editingId}` : `/api/omni/content/${kind}`
            const response = await fetch(endpoint, {
                method: editingId ? "PATCH" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            })

            if (!response.ok) {
                throw new Error("Failed to save content")
            }

            setEditorOpen(false)
            await load()
            toast({
                title: language === "tr" ? "Kaydedildi" : language === "es" ? "Guardado" : "Saved",
                description: language === "tr" ? "İçerik başarıyla güncellendi." : language === "es" ? "El contenido se actualizó correctamente." : "Content was updated successfully.",
            })
        } catch (error) {
            console.error("Failed to save content", error)
            toast({
                title: language === "tr" ? "Kaydedilemedi" : language === "es" ? "No se pudo guardar" : "Could not save",
                description: language === "tr" ? "Formu kontrol edip tekrar deneyin." : language === "es" ? "Revisa el formulario e inténtalo de nuevo." : "Check the form and try again.",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const remove = async (itemId?: string | null) => {
        if (!itemId || !user) return
        const confirmed = window.confirm(language === "tr" ? "Bu içeriği silmek istiyor musunuz?" : language === "es" ? "¿Eliminar este elemento de contenido?" : "Delete this content item?")
        if (!confirmed) return

        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/content/${kind}/${itemId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })

            if (!response.ok) {
                throw new Error("Failed to delete content")
            }

            await load()
            toast({
                title: language === "tr" ? "Silindi" : language === "es" ? "Eliminado" : "Deleted",
                description: language === "tr" ? "İçerik kaldırıldı." : language === "es" ? "El elemento de contenido se eliminó." : "Content item was removed.",
            })
        } catch (error) {
            console.error("Failed to delete content", error)
            toast({
                title: language === "tr" ? "Silinemedi" : language === "es" ? "No se pudo eliminar" : "Could not delete",
                description: language === "tr" ? "Tekrar deneyin." : language === "es" ? "Inténtalo de nuevo." : "Try again.",
                variant: "destructive",
            })
        }
    }

    const togglePublished = async (item: ContentItem) => {
        if (!item.id || !user) return

        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/content/${kind}/${item.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    published: (item as any).published === false,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to update publishing state")
            }

            await load()
            toast({
                title: language === "tr" ? "Yayın durumu güncellendi" : language === "es" ? "Estado de publicación actualizado" : "Publishing state updated",
                description:
                    (item as any).published === false
                        ? language === "tr"
                            ? "İçerik yayına alındı."
                            : language === "es"
                              ? "El elemento de contenido ahora está publicado."
                              : "The content item is now published."
                        : language === "tr"
                          ? "İçerik taslağa alındı."
                          : language === "es"
                            ? "El elemento de contenido se movió de nuevo a borrador."
                            : "The content item was moved back to draft.",
            })
        } catch (error) {
            console.error("Failed to update publishing state", error)
            toast({
                title: language === "tr" ? "Yayın durumu güncellenemedi" : language === "es" ? "No se pudo actualizar el estado de publicación" : "Publishing state could not be updated",
                description: language === "tr" ? "Tekrar deneyin." : language === "es" ? "Inténtalo de nuevo." : "Try again.",
                variant: "destructive",
            })
        }
    }

    if (!hasOmniPermission("content.manage")) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                    {language === "tr"
                        ? "İçerik yönetimi yalnızca super admin erişimi ile kullanılabilir."
                        : language === "es"
                        ? "La gestión de contenido solo está disponible para super administradores."
                        : "Content management is available to super admins only."}
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardDescription>{language === "tr" ? "Toplam içerik" : language === "es" ? "Contenido total" : "Total content"}</CardDescription>
                        <CardTitle className="text-2xl">{summary.total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{language === "tr" ? "Yayında" : language === "es" ? "Publicado" : "Published"}</CardDescription>
                        <CardTitle className="text-2xl">{summary.published}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{language === "tr" ? "Taslak" : language === "es" ? "Borrador" : "Draft"}</CardDescription>
                        <CardTitle className="text-2xl">{summary.draft}</CardTitle>
                    </CardHeader>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <CardTitle>{copy.plural}</CardTitle>
                            <CardDescription>{copy.description}</CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={load}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {language === "tr" ? "Yenile" : language === "es" ? "Actualizar" : "Refresh"}
                            </Button>
                            <Button onClick={openCreate}>
                                <Plus className="mr-2 h-4 w-4" />
                                {language === "tr" ? "Yeni ekle" : language === "es" ? "Añadir nuevo" : "Add new"}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative max-w-md">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={language === "tr" ? "İçerik ara..." : language === "es" ? "Buscar contenido..." : "Search content..."}
                            className="pl-9"
                        />
                    </div>
                    <div className="max-w-xs">
                        <Select value={statusFilter} onValueChange={(value: "all" | "published" | "draft") => setStatusFilter(value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{language === "tr" ? "Tüm durumlar" : language === "es" ? "Todos los estados" : "All states"}</SelectItem>
                                <SelectItem value="published">{language === "tr" ? "Yayında" : language === "es" ? "Publicado" : "Published"}</SelectItem>
                                <SelectItem value="draft">{language === "tr" ? "Taslak" : language === "es" ? "Borrador" : "Draft"}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center rounded-lg border py-16">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
                            {copy.empty}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredItems.map((item) => {
                                const title =
                                    kind === "blog"
                                        ? getLocalizedValue((item as CmsBlogPost).title, locale)
                                        : kind === "faq"
                                          ? getLocalizedValue((item as CmsFaqItem).question, locale)
                                          : getLocalizedValue((item as CmsEducationItem).title, locale)

                                const secondary =
                                    kind === "blog"
                                        ? getLocalizedValue((item as CmsBlogPost).excerpt, locale)
                                        : kind === "faq"
                                          ? getLocalizedValue((item as CmsFaqItem).answer, locale)
                                          : getLocalizedValue((item as CmsEducationItem).description, locale)

                                const meta =
                                    kind === "blog"
                                        ? `${(item as CmsBlogPost).category} • ${(item as CmsBlogPost).date} • ${(item as CmsBlogPost).readTime}`
                                        : kind === "faq"
                                          ? `${(item as CmsFaqItem).category} • #${(item as CmsFaqItem).order}`
                                          : `${(item as CmsEducationItem).type}${(item as CmsEducationItem).url ? ` • ${(item as CmsEducationItem).url}` : ""}`

                                return (
                                    <div key={item.id} className="rounded-lg border bg-white p-4">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="font-medium">{title}</div>
                                                    <Badge variant={(item as any).published !== false ? "secondary" : "outline"}>
                                                        {(item as any).published !== false
                                                            ? language === "tr" ? "Yayında" : language === "es" ? "Publicado" : "Published"
                                                            : language === "tr" ? "Taslak" : language === "es" ? "Borrador" : "Draft"}
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-muted-foreground">{secondary}</div>
                                                <div className="text-xs text-muted-foreground">{meta}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {language === "tr" ? "Güncellendi" : language === "es" ? "Actualizado" : "Updated"}:{" "}
                                                    {formatOmniDateTime((item as any).updatedAt || (item as any).createdAt || new Date().toISOString(), language)}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="sm" onClick={() => openPreview(item)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    {language === "tr" ? "Önizle" : language === "es" ? "Vista previa" : "Preview"}
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => togglePublished(item)}>
                                                    {(item as any).published !== false
                                                        ? language === "tr" ? "Taslağa al" : language === "es" ? "Mover a borrador" : "Move to draft"
                                                        : language === "tr" ? "Yayına al" : language === "es" ? "Publicar" : "Publish"}
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    {language === "tr" ? "Düzenle" : language === "es" ? "Editar" : "Edit"}
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => remove(item.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    {language === "tr" ? "Sil" : language === "es" ? "Eliminar" : "Delete"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
                <DialogContent className="max-h-[90vh] max-w-4xl p-0 overflow-hidden flex flex-col">
                    <DialogHeader className="px-8 pt-8 pb-4 shrink-0 border-b">
                        <DialogTitle>
                            {editingId
                                ? language === "tr" ? `${copy.singular} düzenle` : language === "es" ? `Editar ${copy.singular}` : `Edit ${copy.singular}`
                                : language === "tr" ? `Yeni ${copy.singular}` : language === "es" ? `Nuevo ${copy.singular}` : `New ${copy.singular}`}
                        </DialogTitle>
                        <DialogDescription>
                            {language === "tr"
                                ? "Türkçe ve İngilizce alanları birlikte yönetin."
                                : language === "es"
                                ? "Gestiona los campos en turco e inglés juntos."
                                : "Manage Turkish and English fields together."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 flex-1 overflow-y-auto px-8 py-6">
                        {kind === "blog" ? (
                            <>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Slug</Label>
                                        <Input value={form.slug || ""} onChange={(event) => setForm((current: any) => ({ ...current, slug: event.target.value }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{language === "tr" ? "Kategori" : language === "es" ? "Categoría" : "Category"}</Label>
                                        <Input value={form.category || ""} onChange={(event) => setForm((current: any) => ({ ...current, category: event.target.value }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{language === "tr" ? "Tarih" : language === "es" ? "Fecha" : "Date"}</Label>
                                        <Input type="date" value={form.date || ""} onChange={(event) => setForm((current: any) => ({ ...current, date: event.target.value }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{language === "tr" ? "Okuma süresi" : language === "es" ? "Tiempo de lectura" : "Read time"}</Label>
                                        <Input value={form.readTime || ""} onChange={(event) => setForm((current: any) => ({ ...current, readTime: event.target.value }))} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                                    <div>
                                        <div className="font-medium">{language === "tr" ? "Yayın durumu" : language === "es" ? "Estado de publicación" : "Publishing state"}</div>
                                        <div className="text-sm text-muted-foreground">{language === "tr" ? "Taslak veya yayında olarak işaretleyin." : language === "es" ? "Marca la entrada como borrador o publicada." : "Mark the post as draft or published."}</div>
                                    </div>
                                    <Switch checked={form.published !== false} onCheckedChange={(checked) => setForm((current: any) => ({ ...current, published: checked }))} />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>{copy.titleLabel} (EN)</Label>
                                        <Input value={form.title?.en || ""} onChange={(event) => setForm((current: any) => ({ ...current, title: { ...current.title, en: event.target.value } }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{copy.titleLabel} (TR)</Label>
                                        <Input value={form.title?.tr || ""} onChange={(event) => setForm((current: any) => ({ ...current, title: { ...current.title, tr: event.target.value } }))} />
                                    </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>{copy.secondaryLabel} (EN)</Label>
                                        <Textarea rows={3} value={form.excerpt?.en || ""} onChange={(event) => setForm((current: any) => ({ ...current, excerpt: { ...current.excerpt, en: event.target.value } }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{copy.secondaryLabel} (TR)</Label>
                                        <Textarea rows={3} value={form.excerpt?.tr || ""} onChange={(event) => setForm((current: any) => ({ ...current, excerpt: { ...current.excerpt, tr: event.target.value } }))} />
                                    </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>{language === "tr" ? "İçerik" : language === "es" ? "Contenido" : "Content"} (EN)</Label>
                                        <Textarea rows={10} value={form.content?.en || ""} onChange={(event) => setForm((current: any) => ({ ...current, content: { ...current.content, en: event.target.value } }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{language === "tr" ? "İçerik" : language === "es" ? "Contenido" : "Content"} (TR)</Label>
                                        <Textarea rows={10} value={form.content?.tr || ""} onChange={(event) => setForm((current: any) => ({ ...current, content: { ...current.content, tr: event.target.value } }))} />
                                    </div>
                                </div>
                            </>
                        ) : null}

                        {kind === "faq" ? (
                            <>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>{language === "tr" ? "Kategori" : language === "es" ? "Categoría" : "Category"}</Label>
                                        <Input value={form.category || ""} onChange={(event) => setForm((current: any) => ({ ...current, category: event.target.value }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{language === "tr" ? "Sıra" : language === "es" ? "Orden" : "Order"}</Label>
                                        <Input type="number" value={form.order ?? 0} onChange={(event) => setForm((current: any) => ({ ...current, order: Number(event.target.value || 0) }))} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                                    <div>
                                        <div className="font-medium">{language === "tr" ? "Yayın durumu" : language === "es" ? "Estado de publicación" : "Publishing state"}</div>
                                        <div className="text-sm text-muted-foreground">{language === "tr" ? "SSS maddesini taslakta tutabilir veya yayına alabilirsiniz." : language === "es" ? "Mantén el elemento de FAQ en borrador o publícalo." : "Keep the FAQ item in draft or publish it."}</div>
                                    </div>
                                    <Switch checked={form.published !== false} onCheckedChange={(checked) => setForm((current: any) => ({ ...current, published: checked }))} />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>{copy.titleLabel} (EN)</Label>
                                        <Textarea rows={3} value={form.question?.en || ""} onChange={(event) => setForm((current: any) => ({ ...current, question: { ...current.question, en: event.target.value } }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{copy.titleLabel} (TR)</Label>
                                        <Textarea rows={3} value={form.question?.tr || ""} onChange={(event) => setForm((current: any) => ({ ...current, question: { ...current.question, tr: event.target.value } }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{copy.secondaryLabel} (EN)</Label>
                                        <Textarea rows={6} value={form.answer?.en || ""} onChange={(event) => setForm((current: any) => ({ ...current, answer: { ...current.answer, en: event.target.value } }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{copy.secondaryLabel} (TR)</Label>
                                        <Textarea rows={6} value={form.answer?.tr || ""} onChange={(event) => setForm((current: any) => ({ ...current, answer: { ...current.answer, tr: event.target.value } }))} />
                                    </div>
                                </div>
                            </>
                        ) : null}

                        {kind === "education" ? (
                            <>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>{language === "tr" ? "Tür" : language === "es" ? "Tipo" : "Type"}</Label>
                                        <Select value={form.type || "guide"} onValueChange={(value) => setForm((current: any) => ({ ...current, type: value }))}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="guide">{language === "tr" ? "Rehber" : language === "es" ? "Guía" : "Guide"}</SelectItem>
                                                <SelectItem value="article">{language === "tr" ? "Makale" : language === "es" ? "Artículo" : "Article"}</SelectItem>
                                                <SelectItem value="video">{language === "tr" ? "Video" : "Video"}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>URL</Label>
                                        <Input value={form.url || ""} onChange={(event) => setForm((current: any) => ({ ...current, url: event.target.value }))} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                                    <div>
                                        <div className="font-medium">{language === "tr" ? "Yayın durumu" : language === "es" ? "Estado de publicación" : "Publishing state"}</div>
                                        <div className="text-sm text-muted-foreground">{language === "tr" ? "Eğitim içeriğini operatörlere açmadan önce taslakta tutabilirsiniz." : language === "es" ? "Mantén el elemento de formación en borrador antes de exponerlo a los operadores." : "Keep the education item in draft before exposing it to operators."}</div>
                                    </div>
                                    <Switch checked={form.published !== false} onCheckedChange={(checked) => setForm((current: any) => ({ ...current, published: checked }))} />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>{copy.titleLabel} (EN)</Label>
                                        <Input value={form.title?.en || ""} onChange={(event) => setForm((current: any) => ({ ...current, title: { ...current.title, en: event.target.value } }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{copy.titleLabel} (TR)</Label>
                                        <Input value={form.title?.tr || ""} onChange={(event) => setForm((current: any) => ({ ...current, title: { ...current.title, tr: event.target.value } }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{copy.secondaryLabel} (EN)</Label>
                                        <Textarea rows={5} value={form.description?.en || ""} onChange={(event) => setForm((current: any) => ({ ...current, description: { ...current.description, en: event.target.value } }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{copy.secondaryLabel} (TR)</Label>
                                        <Textarea rows={5} value={form.description?.tr || ""} onChange={(event) => setForm((current: any) => ({ ...current, description: { ...current.description, tr: event.target.value } }))} />
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>

                    <DialogFooter className="px-8 py-6 shrink-0 border-t bg-muted/20">
                        <Button variant="outline" onClick={() => setEditorOpen(false)}>
                            {language === "tr" ? "Kapat" : language === "es" ? "Cerrar" : "Close"}
                        </Button>
                        <Button onClick={save} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {language === "tr" ? "Kaydet" : language === "es" ? "Guardar" : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-h-[90vh] max-w-3xl p-0 overflow-hidden flex flex-col">
                    <DialogHeader className="px-8 pt-8 pb-4 shrink-0 border-b">
                        <DialogTitle>{language === "tr" ? "İçerik önizleme" : language === "es" ? "Vista previa del contenido" : "Content preview"}</DialogTitle>
                        <DialogDescription>
                            {language === "tr" ? "Seçili dilde nasıl görüneceğini burada kontrol edin." : language === "es" ? "Revisa cómo se verá en el idioma seleccionado." : "Review how the selected locale will appear."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-8 py-6">
                    {previewItem ? (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={(previewItem as any).published !== false ? "secondary" : "outline"}>
                                    {(previewItem as any).published !== false
                                        ? language === "tr" ? "Yayında" : language === "es" ? "Publicado" : "Published"
                                        : language === "tr" ? "Taslak" : language === "es" ? "Borrador" : "Draft"}
                                </Badge>
                                <Badge variant="outline">
                                    {kind === "blog"
                                        ? (previewItem as CmsBlogPost).category || (language === "tr" ? "Kategorisiz" : language === "es" ? "Sin categoría" : "Uncategorized")
                                        : kind === "faq"
                                          ? (previewItem as CmsFaqItem).category || (language === "tr" ? "Kategorisiz" : language === "es" ? "Sin categoría" : "Uncategorized")
                                          : (previewItem as CmsEducationItem).type}
                                </Badge>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-semibold">
                                    {kind === "blog"
                                        ? getLocalizedValue((previewItem as CmsBlogPost).title, locale)
                                        : kind === "faq"
                                          ? getLocalizedValue((previewItem as CmsFaqItem).question, locale)
                                          : getLocalizedValue((previewItem as CmsEducationItem).title, locale)}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {kind === "blog"
                                        ? `${(previewItem as CmsBlogPost).date} • ${(previewItem as CmsBlogPost).readTime}`
                                        : kind === "faq"
                                          ? `#${(previewItem as CmsFaqItem).order}`
                                          : (previewItem as CmsEducationItem).url || (language === "tr" ? "URL yok" : language === "es" ? "Sin URL" : "No URL")}
                                </p>
                            </div>
                            <div className="rounded-lg border bg-muted/20 p-4 whitespace-pre-wrap text-sm leading-7">
                                {kind === "blog"
                                    ? `${getLocalizedValue((previewItem as CmsBlogPost).excerpt, locale)}\n\n${getLocalizedValue((previewItem as CmsBlogPost).content, locale)}`
                                    : kind === "faq"
                                      ? getLocalizedValue((previewItem as CmsFaqItem).answer, locale)
                                      : getLocalizedValue((previewItem as CmsEducationItem).description, locale)}
                            </div>
                        </div>
                    ) : null}
                    </div>
                    <DialogFooter className="px-8 py-6 shrink-0 border-t bg-muted/20">
                        <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                            {language === "tr" ? "Kapat" : language === "es" ? "Cerrar" : "Close"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
