"use client"

import { useState } from "react"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus, CheckSquare, Square, Globe, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { KnowledgeList } from "@/components/knowledge/knowledge-list"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"

interface KnowledgeUrlContentProps {
    userId: string
}

export function KnowledgeUrlContent({ userId }: KnowledgeUrlContentProps) {
    const { t } = useLanguage()
    const { toast } = useToast()

    const [url, setUrl] = useState("")
    const [isAdding, setIsAdding] = useState(false)
    const [isDuplicate, setIsDuplicate] = useState(false)

    // Advanced Settings
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [selector, setSelector] = useState("")

    // Sitemap / Scraping States
    const [sitemapUrls, setSitemapUrls] = useState<string[]>([])
    const [selectedSitemapUrls, setSelectedSitemapUrls] = useState<string[]>([])
    const [isFetchingSitemap, setIsFetchingSitemap] = useState(false)
    const [importProgress, setImportProgress] = useState(0)

    // Preview States
    const [previewTitle, setPreviewTitle] = useState("")
    const [previewContent, setPreviewContent] = useState("")

    // Refresh trigger for list
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    // Check for duplicate URL
    const checkDuplicate = async (checkUrl: string) => {
        if (!checkUrl) return
        try {
            const res = await fetch(`/api/knowledge?chatbotId=${userId}&source=${encodeURIComponent(checkUrl)}`)
            const data = await res.json()
            if (data.docs && data.docs.length > 0) {
                setIsDuplicate(true)
            } else {
                setIsDuplicate(false)
            }
        } catch (e) {
            console.error("Duplicate check error:", e)
        }
    }

    const handleFetch = async () => {
        if (!url) return
        setIsAdding(true)
        setIsDuplicate(false)

        // Check duplicate first
        await checkDuplicate(url)

        // Reset sitemap state if switching to single fetch
        setSitemapUrls([])

        try {
            const res = await fetch('/api/crawl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, selector })
            })
            if (!res.ok) throw new Error('Failed to crawl')
            const data = await res.json()
            setPreviewTitle(data.title)
            setPreviewContent(data.content)
            toast({ title: t('success'), description: t('contentFetched') || "Content fetched successfully." })
        } catch (e: any) {
            console.error(e)
            toast({ title: t('error'), description: e.message || "Failed to fetch URL", variant: "destructive" })
        } finally {
            setIsAdding(false)
        }
    }

    const handleFetchSitemap = async () => {
        if (!url) return
        setIsFetchingSitemap(true)
        setSitemapUrls([])
        setSelectedSitemapUrls([])
        setPreviewContent("") // Clear single preview

        try {
            const response = await fetch("/api/admin/sitemap", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: url })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "Failed to fetch sitemap")
            }

            const data = await response.json()
            if (data.urls.length === 0) {
                toast({
                    title: t('info'),
                    description: t('noLinksFound') || "No links found.",
                })
            } else {
                setSitemapUrls(data.urls)
                toast({
                    title: t('success'),
                    description: `${t('urlsFound') || "URLs found"}: ${data.urls.length}`,
                })
            }
        } catch (error: any) {
            console.error("Sitemap error:", error)
            toast({
                title: t('error'),
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setIsFetchingSitemap(false)
        }
    }

    const handleAdd = async () => {
        if (!url) return

        setIsAdding(true)
        try {
            const docId = crypto.randomUUID();

            let payload: any = { chatbotId: userId, docId, type: "url", url }

            if (previewContent) {
                payload.text = previewContent;
                payload.title = previewTitle;
            }

            if (previewTitle) {
                payload.fileName = previewTitle;
            }

            const response = await fetch("/api/knowledge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || response.statusText)
            }

            toast({ title: t('success'), description: t('knowledgeAdded') })
            setUrl("")
            setPreviewTitle("")
            setPreviewContent("")
            setRefreshTrigger(prev => prev + 1)
        } catch (e: any) {
            console.error(e)
            toast({ title: t('error'), description: e.message || "Failed to add URL", variant: "destructive" })
        } finally {
            setIsAdding(false)
        }
    }

    const handleImportSitemap = async () => {
        if (selectedSitemapUrls.length === 0) return
        setIsAdding(true)
        setImportProgress(0)

        try {
            let successCount = 0
            for (let i = 0; i < selectedSitemapUrls.length; i++) {
                const urlToImport = selectedSitemapUrls[i]
                try {
                    const docId = crypto.randomUUID();

                    const response = await fetch("/api/knowledge", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ chatbotId: userId, docId, type: "url", url: urlToImport })
                    })

                    if (response.ok) {
                        successCount++
                    }
                } catch (e) {
                    console.error("Failed to import URL:", urlToImport, e)
                }
                setImportProgress(Math.round(((i + 1) / selectedSitemapUrls.length) * 100))
            }

            toast({
                title: t('success'),
                description: `Imported ${successCount}/${selectedSitemapUrls.length} URLs.`,
            })
            setSitemapUrls([])
            setSelectedSitemapUrls([])
            setRefreshTrigger(prev => prev + 1)
        } catch (error) {
            console.error("Import error:", error)
            toast({ title: t('error'), description: "Failed to complete import.", variant: "destructive" })
        } finally {
            setIsAdding(false)
            setImportProgress(0)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="space-y-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t('knowledgeUrl')}</h2>
                    <p className="text-muted-foreground">{t('scrapeDescription')}</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('addNewData')}</CardTitle>
                        <CardDescription>{t('knowledgeUrlDescription') || "Enter a website URL to fetch a single page or scan the entire site."}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="url">{t('websiteUrl')}</Label>
                            <div className="flex flex-col gap-3">
                                <div className="relative">
                                    <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="url"
                                        placeholder="https://example.com"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className="pl-9 h-10"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        onClick={handleFetch}
                                        disabled={isAdding || !url}
                                        variant="secondary"
                                        className="flex-1 sm:flex-none"
                                    >
                                        {isAdding && !sitemapUrls.length && !previewContent ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <Search className="h-4 w-4 mr-2" />
                                        )}
                                        {t('fetchPage') || "Fetch Page"}
                                    </Button>
                                    <Button
                                        onClick={handleFetchSitemap}
                                        disabled={isFetchingSitemap || !url}
                                        variant="outline"
                                        className="flex-1 sm:flex-none"
                                    >
                                        {isFetchingSitemap ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <Globe className="h-4 w-4 mr-2" />
                                        )}
                                        {t('scanSite') || "Scan Site"}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Duplicate Warning */}
                        {isDuplicate && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-3 text-sm flex items-start gap-2">
                                <Search className="h-4 w-4 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium">{t('duplicateUrl') || "Bu URL zaten eklenmiş."}</p>
                                    <p className="text-xs mt-1">{t('duplicateUrlDesc') || "Yine de eklemek isterseniz devam edebilirsiniz."}</p>
                                </div>
                            </div>
                        )}

                        {/* Advanced Scrape Settings */}
                        <div className="pt-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Checkbox
                                    id="advanced-settings"
                                    checked={showAdvanced}
                                    onCheckedChange={(c) => setShowAdvanced(!!c)}
                                />
                                <Label htmlFor="advanced-settings" className="cursor-pointer">
                                    {t('advancedSettings') || "Gelişmiş Ayarlar"}
                                </Label>
                            </div>

                            {showAdvanced && (
                                <div className="space-y-2 pl-6 animate-in slide-in-from-top-2">
                                    <Label htmlFor="selector">{t('cssSelector') || "CSS Seçici (Opsiyonel)"}</Label>
                                    <Input
                                        id="selector"
                                        placeholder="main, #content, .article-body"
                                        value={selector}
                                        onChange={(e) => setSelector(e.target.value)}
                                        className="h-8 text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('cssSelectorDesc') || "Belirli bir alanı çekmek için CSS seçici girin (örn: main). Boş bırakılırsa tüm sayfa taranır."}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Single Page Preview */}
                        {previewContent && (
                            <div className="space-y-4 border rounded-lg p-4 bg-muted/30 animate-in fade-in-0 duration-300">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <CheckSquare className="h-4 w-4 text-green-600" />
                                        {t('contentPreview') || "Preview"}
                                    </h4>
                                    <Button size="sm" variant="ghost" onClick={() => setPreviewContent("")}>
                                        Cancel
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input value={previewTitle} onChange={(e) => setPreviewTitle(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Content</Label>
                                    <Textarea
                                        value={previewContent}
                                        onChange={(e) => setPreviewContent(e.target.value)}
                                        className="h-32 font-mono text-xs"
                                    />
                                </div>
                                <Button className="w-full" onClick={handleAdd} disabled={isAdding}>
                                    {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                                    {t('addToKnowledgeBase')}
                                </Button>
                            </div>
                        )}

                        {/* Site Scan Results */}
                        {sitemapUrls.length > 0 && (
                            <div className="space-y-4 border rounded-lg p-4 bg-muted/30 animate-in fade-in-0 duration-300">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <h4 className="font-medium">{t('urlsFound') || "Pages Found"}: {sitemapUrls.length}</h4>
                                        <p className="text-xs text-muted-foreground">{t('selectPages import') || "Select pages to import"}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedSitemapUrls(sitemapUrls)} className="h-8">
                                            <CheckSquare className="w-3.5 h-3.5 mr-1.5" /> {t('selectAll')}
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedSitemapUrls([])} className="h-8">
                                            <Square className="w-3.5 h-3.5 mr-1.5" /> {t('deselectAll')}
                                        </Button>
                                    </div>
                                </div>
                                <div className="h-64 overflow-y-auto border rounded-md bg-background/50 p-2 space-y-1">
                                    {sitemapUrls.map((u, i) => (
                                        <div key={i} className="flex items-start space-x-2 p-2 rounded hover:bg-muted/50 transition-colors">
                                            <Checkbox
                                                id={`url-${i}`}
                                                checked={selectedSitemapUrls.includes(u)}
                                                onCheckedChange={(c) => {
                                                    if (c) setSelectedSitemapUrls([...selectedSitemapUrls, u])
                                                    else setSelectedSitemapUrls(selectedSitemapUrls.filter(su => su !== u))
                                                }}
                                                className="mt-1"
                                            />
                                            <div className="grid gap-1.5 leading-none">
                                                <label
                                                    htmlFor={`url-${i}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 break-all cursor-pointer"
                                                >
                                                    {u}
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button className="w-full" onClick={handleImportSitemap} disabled={isAdding || selectedSitemapUrls.length === 0}>
                                    {isAdding ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t('processing')} ({importProgress}%)
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t('importSelected')} ({selectedSitemapUrls.length})
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div>
                <KnowledgeList userId={userId} filterType="url" refreshTrigger={refreshTrigger} />
            </div>
        </div >
    )
}
