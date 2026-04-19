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
        <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="bg-slate-50/50 pb-4 border-b border-border/40">
                <CardTitle className="text-base flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-semibold">2</span>
                    WhatsApp İşletme Numaranızı Seçin
                </CardTitle>
                <CardDescription className="text-xs">
                    Müşterilerinizle iletişim kuracağınız ve Vion AI'ın yanıt vereceği işletme hesabını ve telefon numarasını belirleyin.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
                <div className="grid gap-3 sm:grid-cols-2">
                    {props.businesses.map((business) => (
                        <button
                            key={business.id}
                            type="button"
                            onClick={() => {
                                props.onSelectBusinessId(business.id)
                                props.onSelectPhoneNumberId(business.phoneNumbers[0]?.id || "")
                            }}
                            className={cn(
                                "rounded-xl border p-4 text-left transition-all duration-200 group relative overflow-hidden",
                                props.selectedBusinessId === business.id 
                                    ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/20" 
                                    : "border-border hover:border-emerald-500/40 hover:bg-muted/60"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors",
                                    props.selectedBusinessId === business.id ? "border-emerald-500/30 bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"
                                )}>
                                    <span className="text-lg font-bold">{business.name.charAt(0).toUpperCase()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">{business.name}</p>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                        {business.phoneNumbers.length} telefon numarası bulundu
                                    </p>
                                </div>
                            </div>
                            {props.selectedBusinessId === business.id && (
                                <div className="absolute top-0 right-0 h-full w-1 bg-emerald-500"></div>
                            )}
                        </button>
                    ))}
                </div>

                {currentBusiness && currentBusiness.phoneNumbers.length > 0 ? (
                    <div className="space-y-3 mt-6">
                        <h4 className="text-sm font-medium text-foreground">Bağlanacak Numarayı Seçin</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {currentBusiness.phoneNumbers.map((phone) => (
                                <button
                                    key={phone.id}
                                    type="button"
                                    onClick={() => props.onSelectPhoneNumberId(phone.id)}
                                    className={cn(
                                        "rounded-xl border p-4 text-left transition-all duration-200 flex items-center gap-3 relative overflow-hidden",
                                        props.selectedPhoneNumberId === phone.id 
                                            ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/20" 
                                            : "border-border hover:border-emerald-500/40 hover:bg-muted/60"
                                    )}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">{phone.displayNumber || "Numara adı yok"}</p>
                                        <p className="mt-1 text-xs text-muted-foreground truncate">{phone.verifiedName || "Doğrulanmış ad bulunamadı"}</p>
                                    </div>
                                    {props.selectedPhoneNumberId === phone.id && (
                                        <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="pt-2">
                    <Button 
                        type="button" 
                        onClick={props.onSave} 
                        disabled={props.saving || !props.selectedBusinessId || !props.selectedPhoneNumberId}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {props.saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Seçimi Kaydet ve Devam Et
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
