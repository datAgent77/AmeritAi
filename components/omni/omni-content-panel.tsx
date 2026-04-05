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

function getContentCopy(kind: CmsContentKind, language: "tr" | "en") {
    const tr = language === "tr"

    if (kind === "blog") {
        return {
            singular: tr ? "blog yazısı" : "blog post",
            plural: tr ? "Blog yazıları" : "Blog posts",
            description: tr
                ? "Global blog içeriklerini oluşturun, düzenleyin ve yayın durumunu yönetin."
                : "Create, edit, and manage publishing state for global blog content.",
            empty: tr ? "Henüz blog yazısı yok." : "No blog posts yet.",
            titleLabel: tr ? "Başlık" : "Title",
            secondaryLabel: tr ? "Özet" : "Excerpt",
        }
    }

    if (kind === "faq") {
        return {
            singular: tr ? "SSS öğesi" : "FAQ item",
            plural: tr ? "SSS" : "FAQs",
            description: tr
                ? "Global SSS içeriğini kategori ve sıralama bilgisiyle yönetin."
                : "Manage global FAQ content with category and ordering.",
            empty: tr ? "Henüz SSS kaydı yok." : "No FAQ items yet.",
            titleLabel: tr ? "Soru" : "Question",
            secondaryLabel: tr ? "Yanıt" : "Answer",
        }
    }

    return {
        singular: tr ? "eğitim içeriği" : "education item",
        plural: tr ? "Eğitim içerikleri" : "Education items",
        description: tr
            ? "Operasyon rehberleri, eğitim videoları ve makaleleri burada yönetin."
            : "Manage operator guides, training videos, and education articles here.",
        empty: tr ? "Henüz eğitim içeriği yok." : "No education items yet.",
        titleLabel: tr ? "Başlık" : "Title",
        secondaryLabel: tr ? "Açıklama" : "Description",
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
            author: { name: "Vion AI Team", avatar: "VA" },
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
    const copy = useMemo(() => getContentCopy(kind, locale), [kind, locale])
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
                title: language === "tr" ? "İçerik yüklenemedi" : "Content could not be loaded",
                description: language === "tr" ? "Daha sonra tekrar deneyin." : "Try again later.",
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
                title: language === "tr" ? "Kaydedildi" : "Saved",
                description: language === "tr" ? "İçerik başarıyla güncellendi." : "Content was updated successfully.",
            })
        } catch (error) {
            console.error("Failed to save content", error)
            toast({
                title: language === "tr" ? "Kaydedilemedi" : "Could not save",
                description: language === "tr" ? "Formu kontrol edip tekrar deneyin." : "Check the form and try again.",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const remove = async (itemId?: string | null) => {
        if (!itemId || !user) return
        const confirmed = window.confirm(language === "tr" ? "Bu içeriği silmek istiyor musunuz?" : "Delete this content item?")
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
                title: language === "tr" ? "Silindi" : "Deleted",
                description: language === "tr" ? "İçerik kaldırıldı." : "Content item was removed.",
            })
        } catch (error) {
            console.error("Failed to delete content", error)
            toast({
                title: language === "tr" ? "Silinemedi" : "Could not delete",
                description: language === "tr" ? "Tekrar deneyin." : "Try again.",
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
                title: language === "tr" ? "Yayın durumu güncellendi" : "Publishing state updated",
                description:
                    (item as any).published === false
                        ? language === "tr"
                            ? "İçerik yayına alındı."
                            : "The content item is now published."
                        : language === "tr"
                          ? "İçerik taslağa alındı."
                          : "The content item was moved back to draft.",
            })
        } catch (error) {
            console.error("Failed to update publishing state", error)
            toast({
                title: language === "tr" ? "Yayın durumu güncellenemedi" : "Publishing state could not be updated",
                description: language === "tr" ? "Tekrar deneyin." : "Try again.",
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
                        <CardDescription>{language === "tr" ? "Toplam içerik" : "Total content"}</CardDescription>
                        <CardTitle className="text-2xl">{summary.total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{language === "tr" ? "Yayında" : "Published"}</CardDescription>
                        <CardTitle className="text-2xl">{summary.published}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{language === "tr" ? "Taslak" : "Draft"}</CardDescription>
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
                                {language === "tr" ? "Yenile" : "Refresh"}
                            </Button>
                            <Button onClick={openCreate}>
                                <Plus className="mr-2 h-4 w-4" />
                                {language === "tr" ? "Yeni ekle" : "Add new"}
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
                            placeholder={language === "tr" ? "İçerik ara..." : "Search content..."}
                            className="pl-9"
                        />
                    </div>
                    <div className="max-w-xs">
                        <Select value={statusFilter} onValueChange={(value: "all" | "published" | "draft") => setStatusFilter(value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{language === "tr" ? "Tüm durumlar" : "All states"}</SelectItem>
                                <SelectItem value="published">{language === "tr" ? "Yayında" : "Published"}</SelectItem>
                                <SelectItem value="draft">{language === "tr" ? "Taslak" : "Draft"}</SelectItem>
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
                                                            ? language === "tr" ? "Yayında" : "Published"
                                                            : language === "tr" ? "Taslak" : "Draft"}
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-muted-foreground">{secondary}</div>
                                                <div className="text-xs text-muted-foreground">{meta}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {language === "tr" ? "Güncellendi" : "Updated"}:{" "}
                                                    {formatOmniDateTime((item as any).updatedAt || (item as any).createdAt || new Date().toISOString(), language)}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="sm" onClick={() => openPreview(item)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    {language === "tr" ? "Önizle" : "Preview"}
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => togglePublished(item)}>
                                                    {(item as any).published !== false
                                                        ? language === "tr" ? "Taslağa al" : "Move to draft"
                                                        : language === "tr" ? "Yayına al" : "Publish"}
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    {language === "tr" ? "Düzenle" : "Edit"}
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => remove(item.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    {language === "tr" ? "Sil" : "Delete"}
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
                <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingId
                                ? language === "tr" ? `${copy.singular} düzenle` : `Edit ${copy.singular}`
                                : language === "tr" ? `Yeni ${copy.singular}` : `New ${copy.singular}`}
                        </DialogTitle>
                        <DialogDescription>
                            {language === "tr"
                                ? "Türkçe ve İngilizce alanları birlikte yönetin."
                                : "Manage Turkish and English fields together."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6">
                        {kind === "blog" ? (
                            <>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Slug</Label>
                                        <Input value={form.slug || ""} onChange={(event) => setForm((current: any) => ({ ...current, slug: event.target.value }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{language === "tr" ? "Kategori" : "Category"}</Label>
                                        <Input value={form.category || ""} onChange={(event) => setForm((current: any) => ({ ...current, category: event.target.value }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{language === "tr" ? "Tarih" : "Date"}</Label>
                                        <Input type="date" value={form.date || ""} onChange={(event) => setForm((current: any) => ({ ...current, date: event.target.value }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{language === "tr" ? "Okuma süresi" : "Read time"}</Label>
                                        <Input value={form.readTime || ""} onChange={(event) => setForm((current: any) => ({ ...current, readTime: event.target.value }))} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                                    <div>
                                        <div className="font-medium">{language === "tr" ? "Yayın durumu" : "Publishing state"}</div>
                                        <div className="text-sm text-muted-foreground">{language === "tr" ? "Taslak veya yayında olarak işaretleyin." : "Mark the post as draft or published."}</div>
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
                                        <Label>{language === "tr" ? "İçerik" : "Content"} (EN)</Label>
                                        <Textarea rows={10} value={form.content?.en || ""} onChange={(event) => setForm((current: any) => ({ ...current, content: { ...current.content, en: event.target.value } }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{language === "tr" ? "İçerik" : "Content"} (TR)</Label>
                                        <Textarea rows={10} value={form.content?.tr || ""} onChange={(event) => setForm((current: any) => ({ ...current, content: { ...current.content, tr: event.target.value } }))} />
                                    </div>
                                </div>
                            </>
                        ) : null}

                        {kind === "faq" ? (
                            <>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>{language === "tr" ? "Kategori" : "Category"}</Label>
                                        <Input value={form.category || ""} onChange={(event) => setForm((current: any) => ({ ...current, category: event.target.value }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{language === "tr" ? "Sıra" : "Order"}</Label>
                                        <Input type="number" value={form.order ?? 0} onChange={(event) => setForm((current: any) => ({ ...current, order: Number(event.target.value || 0) }))} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                                    <div>
                                        <div className="font-medium">{language === "tr" ? "Yayın durumu" : "Publishing state"}</div>
                                        <div className="text-sm text-muted-foreground">{language === "tr" ? "SSS maddesini taslakta tutabilir veya yayına alabilirsiniz." : "Keep the FAQ item in draft or publish it."}</div>
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
                                        <Label>{language === "tr" ? "Tür" : "Type"}</Label>
                                        <Select value={form.type || "guide"} onValueChange={(value) => setForm((current: any) => ({ ...current, type: value }))}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="guide">{language === "tr" ? "Rehber" : "Guide"}</SelectItem>
                                                <SelectItem value="article">{language === "tr" ? "Makale" : "Article"}</SelectItem>
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
                                        <div className="font-medium">{language === "tr" ? "Yayın durumu" : "Publishing state"}</div>
                                        <div className="text-sm text-muted-foreground">{language === "tr" ? "Eğitim içeriğini operatörlere açmadan önce taslakta tutabilirsiniz." : "Keep the education item in draft before exposing it to operators."}</div>
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

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditorOpen(false)}>
                            {language === "tr" ? "Kapat" : "Close"}
                        </Button>
                        <Button onClick={save} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {language === "tr" ? "Kaydet" : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{language === "tr" ? "İçerik önizleme" : "Content preview"}</DialogTitle>
                        <DialogDescription>
                            {language === "tr" ? "Seçili dilde nasıl görüneceğini burada kontrol edin." : "Review how the selected locale will appear."}
                        </DialogDescription>
                    </DialogHeader>
                    {previewItem ? (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={(previewItem as any).published !== false ? "secondary" : "outline"}>
                                    {(previewItem as any).published !== false
                                        ? language === "tr" ? "Yayında" : "Published"
                                        : language === "tr" ? "Taslak" : "Draft"}
                                </Badge>
                                <Badge variant="outline">
                                    {kind === "blog"
                                        ? (previewItem as CmsBlogPost).category || (language === "tr" ? "Kategorisiz" : "Uncategorized")
                                        : kind === "faq"
                                          ? (previewItem as CmsFaqItem).category || (language === "tr" ? "Kategorisiz" : "Uncategorized")
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
                                          : (previewItem as CmsEducationItem).url || (language === "tr" ? "URL yok" : "No URL")}
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
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                            {language === "tr" ? "Kapat" : "Close"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
