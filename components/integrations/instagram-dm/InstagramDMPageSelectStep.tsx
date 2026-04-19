"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { InstagramDMPageOption } from "@/lib/integrations/instagram-dm/types"
import { cn } from "@/lib/utils"

export function InstagramDMPageSelectStep(props: {
    pages: InstagramDMPageOption[]
    selectedPageId: string
    onSelectPageId: (value: string) => void
    onSave: () => void
    saving?: boolean
}) {
    return (
        <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="bg-slate-50/50 pb-4 border-b border-border/40">
                <CardTitle className="text-base flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-semibold">2</span>
                    Facebook Sayfanızı Seçin
                </CardTitle>
                <CardDescription className="text-xs">
                    Instagram DM mesajları bu Facebook sayfası üzerinden yönlendirilir. Bağlamak istediğiniz sayfayı seçin.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
                <div className="grid gap-3 sm:grid-cols-2">
                    {props.pages.map((page) => (
                        <button
                            key={page.id}
                            type="button"
                            onClick={() => props.onSelectPageId(page.id)}
                            className={cn(
                                "rounded-xl border p-4 text-left transition-all duration-200 group relative overflow-hidden",
                                props.selectedPageId === page.id 
                                    ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                                    : "border-border hover:border-primary/40 hover:bg-muted/60"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors",
                                    props.selectedPageId === page.id ? "border-primary/30 bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                )}>
                                    <span className="text-lg font-bold">{page.name.charAt(0).toUpperCase()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">{page.name}</p>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                        {page.instagramUsername ? `@${page.instagramUsername}` : "Instagram kullanıcı adı bulunamadı"}
                                    </p>
                                </div>
                            </div>
                            {props.selectedPageId === page.id && (
                                <div className="absolute top-0 right-0 h-full w-1 bg-primary"></div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="pt-2">
                    <Button 
                        type="button" 
                        onClick={props.onSave} 
                        disabled={props.saving || !props.selectedPageId}
                        className="w-full sm:w-auto"
                    >
                        {props.saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Seçimi Kaydet ve Devam Et
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
