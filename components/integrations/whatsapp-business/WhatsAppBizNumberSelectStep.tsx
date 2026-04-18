"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { WhatsAppBusinessOption } from "@/lib/integrations/whatsapp-business/types"
import { cn } from "@/lib/utils"

export function WhatsAppBizNumberSelectStep(props: {
    businesses: WhatsAppBusinessOption[]
    selectedBusinessId: string
    selectedPhoneNumberId: string
    onSelectBusinessId: (value: string) => void
    onSelectPhoneNumberId: (value: string) => void
    onSave: () => void
    saving?: boolean
}) {
    const currentBusiness = props.businesses.find((item) => item.id === props.selectedBusinessId) || null

    return (
        <Card className="border-border/70">
            <CardHeader>
                <CardTitle className="text-base">3. Numaranızı seçin</CardTitle>
                <CardDescription>Mesajların hangi WhatsApp Business numarasına düşeceğini seçin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3">
                    {props.businesses.map((business) => (
                        <button
                            key={business.id}
                            type="button"
                            onClick={() => {
                                props.onSelectBusinessId(business.id)
                                props.onSelectPhoneNumberId(business.phoneNumbers[0]?.id || "")
                            }}
                            className={cn(
                                "rounded-xl border p-4 text-left transition-colors",
                                props.selectedBusinessId === business.id ? "border-foreground bg-muted" : "border-border hover:bg-muted/60"
                            )}
                        >
                            <p className="text-sm font-medium text-foreground">{business.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {business.phoneNumbers.length} numara bulundu
                            </p>
                        </button>
                    ))}
                </div>

                {currentBusiness ? (
                    <div className="grid gap-3">
                        {currentBusiness.phoneNumbers.map((phone) => (
                            <button
                                key={phone.id}
                                type="button"
                                onClick={() => props.onSelectPhoneNumberId(phone.id)}
                                className={cn(
                                    "rounded-xl border p-4 text-left transition-colors",
                                    props.selectedPhoneNumberId === phone.id ? "border-emerald-300 bg-emerald-50" : "border-border hover:bg-muted/60"
                                )}
                            >
                                <p className="text-sm font-medium text-foreground">{phone.displayNumber || "Numara adı yok"}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{phone.verifiedName || "Doğrulanmış ad bulunamadı"}</p>
                            </button>
                        ))}
                    </div>
                ) : null}

                <Button type="button" onClick={props.onSave} disabled={props.saving || !props.selectedBusinessId || !props.selectedPhoneNumberId}>
                    {props.saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Numarayı kaydet ve bağlantıyı aç
                </Button>
            </CardContent>
        </Card>
    )
}
