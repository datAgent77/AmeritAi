"use client"

import { useState } from "react"
import { X, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { useLanguage } from "@/context/LanguageContext"
import type { PlatformMeta } from "@/lib/integrations/ecommerce/platform-registry"
import type { EcomPlatform } from "@/lib/integrations/ecommerce/types"

interface Props {
    open: boolean
    meta: PlatformMeta
    chatbotId: string
    onClose: () => void
    onSuccess: (result: { connectionId: string; storeName?: string }) => void
}

export function EcommerceConnectionForm({ open, meta, chatbotId, onClose, onSuccess }: Props) {
    const { t } = useLanguage()
    const [values, setValues] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function handleChange(key: string, value: string) {
        setValues(prev => ({ ...prev, [key]: value }))
        setError(null)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const res = await fetch("/api/ecommerce/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatbotId,
                    platform: meta.id as EcomPlatform,
                    credentials: values,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error || t('ecomConnectFailed'))
                return
            }
            onSuccess({ connectionId: data.connectionId, storeName: data.storeName })
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={open => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('ecomFormTitle').replace('{platform}', meta.name)}</DialogTitle>
                    <DialogDescription>
                        {t('ecomFormDesc').replace('{platform}', meta.name)}
                        {meta.docsUrl && (
                            <>
                                {" "}
                                <a href={meta.docsUrl} target="_blank" rel="noopener noreferrer" className="underline">
                                    {t('ecomDocs')}
                                </a>
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col min-h-0 space-y-4 pt-4">
                    <div className="space-y-4 overflow-y-auto">
                        {meta.fields.map(field => (
                            <div key={field.key} className="space-y-1.5">
                                <Label htmlFor={field.key} className="text-sm font-medium">
                                    {field.label}
                                    {field.required && <span className="text-rose-500 ml-1">*</span>}
                                </Label>
                                <Input
                                    id={field.key}
                                    type={field.type === "password" ? "password" : "text"}
                                    placeholder={field.placeholder}
                                    value={values[field.key] || ""}
                                    onChange={e => handleChange(field.key, e.target.value)}
                                    required={field.required}
                                    className="text-sm"
                                />
                                {field.hint && (
                                    <p className="text-xs text-zinc-500">{field.hint}</p>
                                )}
                            </div>
                        ))}

                        {error && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" className="flex-1" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {t('ecomEstablishConnection')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
