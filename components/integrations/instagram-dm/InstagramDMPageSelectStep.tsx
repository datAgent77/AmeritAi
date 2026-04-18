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
        <Card className="border-border/70">
            <CardHeader>
                <CardTitle className="text-base">2. Sayfanızı seçin</CardTitle>
                <CardDescription>Instagram DM bu Facebook sayfası üzerinden çalışır. Doğru sayfayı seçip bağlantıyı etkinleştirin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3">
                    {props.pages.map((page) => (
                        <button
                            key={page.id}
                            type="button"
                            onClick={() => props.onSelectPageId(page.id)}
                            className={cn(
                                "rounded-xl border p-4 text-left transition-colors",
                                props.selectedPageId === page.id ? "border-foreground bg-muted" : "border-border hover:bg-muted/60"
                            )}
                        >
                            <p className="text-sm font-medium text-foreground">{page.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {page.instagramUsername ? `@${page.instagramUsername}` : "Instagram kullanıcı adı bulunamadı"}
                            </p>
                        </button>
                    ))}
                </div>

                <Button type="button" onClick={props.onSave} disabled={props.saving || !props.selectedPageId}>
                    {props.saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Sayfayı kaydet ve bağlantıyı aç
                </Button>
            </CardContent>
        </Card>
    )
}
