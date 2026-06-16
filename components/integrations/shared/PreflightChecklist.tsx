"use client"

import { CheckCircle2, CircleDashed, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/context/LanguageContext"

type ChecklistItem = {
    id: string
    title: string
    ok: boolean | null
    okMessage: string
    failMessage: string
}

export function PreflightChecklist({ items }: { items: ChecklistItem[] }) {
    const { language } = useLanguage()
    const notCheckedYet = language === "tr" ? "Henüz kontrol edilmedi." : language === "es" ? "Aún no se ha comprobado." : "Not checked yet."
    return (
        <div className="space-y-2">
            {items.map((item) => {
                const isOk = item.ok === true
                const isUnknown = item.ok === null

                return (
                    <div
                        key={item.id}
                        className={cn(
                            "flex items-start gap-3 rounded-xl border px-4 py-3",
                            isOk
                                ? "border-emerald-200 bg-emerald-50/60"
                                : isUnknown
                                  ? "border-border bg-muted/40"
                                  : "border-rose-200 bg-rose-50/70"
                        )}
                    >
                        {isOk ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                        ) : isUnknown ? (
                            <CircleDashed className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        ) : (
                            <XCircle className="mt-0.5 h-4 w-4 text-rose-600" />
                        )}
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{isOk ? item.okMessage : isUnknown ? notCheckedYet : item.failMessage}</p>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
