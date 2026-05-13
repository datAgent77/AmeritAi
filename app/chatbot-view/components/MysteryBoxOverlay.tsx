"use client"

import { useState } from "react"
import { X, Gift, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Prize {
    name: string
    probability: number
    quantityLimit?: number
}

interface Props {
    chatbotId: string
    sessionId?: string
    prizes: Prize[]
    requireEmail?: boolean
    themeColor?: string
    onClose: () => void
    onPrize?: (prize: string, couponCode?: string) => void
    title?: string
    description?: string
    buttonText?: string
}

export function MysteryBoxOverlay({ 
    chatbotId, 
    sessionId, 
    prizes, 
    requireEmail = true, 
    themeColor = "#8b5cf6", 
    onClose, 
    onPrize,
    title = "Gizemli Kutuyu Seç!",
    description = "Hemen oyna ve sürpriz ödüllerden birini kazanma şansı yakala.",
    buttonText = "Devam Et"
}: Props) {
    const [contactEmail, setContactEmail] = useState("")
    const [contactName, setContactName] = useState("")
    const [contactPhone, setContactPhone] = useState("")
    const [kvkkAccepted, setKvkkAccepted] = useState(false)
    const [phase, setPhase] = useState<"play" | "result" | "final">("play")
    const [submitting, setSubmitting] = useState(false)
    const [wonPrize, setWonPrize] = useState<string | null>(null)
    const [couponCode, setCouponCode] = useState<string | null>(null)
    const [openedBox, setOpenedBox] = useState<number | null>(null)

    const handleBoxClick = async (index: number) => {
        if (openedBox !== null || submitting) return
        setOpenedBox(index)
        setSubmitting(true)
        try {
            const res = await fetch("/api/gamification/spin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chatbotId, sessionId }),
            })
            const data = await res.json()
            
            setSubmitting(false)
            setWonPrize(data.prize)
            setCouponCode(data.couponCode || null)
            setPhase("result")
            onPrize?.(data.prize, data.couponCode)
        } catch (error) {
            setSubmitting(false)
        }
    }

    const handleClaim = async () => {
        if (!contactName || !contactEmail || !contactPhone || !kvkkAccepted) return
        setSubmitting(true)
        try {
            await fetch("/api/gamification/claim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatbotId,
                    sessionId,
                    visitorId: typeof window !== "undefined" ? localStorage.getItem(`vid_${chatbotId}`) : undefined,
                    name: contactName,
                    email: contactEmail,
                    phone: contactPhone,
                    kvkk: kvkkAccepted
                })
            })
            setPhase("final")
        } catch (error) {
            console.error("Claim failed", error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div style={{ backgroundColor: themeColor }} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-white" />
                        <h2 className="text-white font-bold text-base">Gizemli Kutuyu Seç!</h2>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {phase === "play" && (
                        <div className="space-y-6">
                            <div className="space-y-2 text-center">
                                <h2 className="text-xl font-bold text-zinc-900">{title}</h2>
                                <p className="text-sm text-zinc-600">{description}</p>
                            </div>
                            <p className="text-center text-sm font-medium text-zinc-600">
                                Şanslı kutunu seç ve ödülünü gör!
                            </p>
                            <div className="flex justify-center gap-4">
                                {[0, 1, 2].map((i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleBoxClick(i)}
                                        disabled={openedBox !== null}
                                        className={`relative group w-24 h-24 rounded-xl border-4 transition-all duration-500 flex items-center justify-center
                                            ${openedBox === i ? 'scale-110 border-transparent' : 'border-zinc-200 hover:scale-105 hover:border-violet-400'}
                                            ${openedBox !== null && openedBox !== i ? 'opacity-50 scale-95' : ''}
                                        `}
                                        style={openedBox === i ? { backgroundColor: themeColor } : {}}
                                    >
                                        {openedBox === i && submitting ? (
                                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                                        ) : (
                                            <Gift className={`w-10 h-10 ${openedBox === i ? 'text-white' : 'text-zinc-400 group-hover:text-violet-500'}`} />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {phase === "result" && wonPrize && (
                        <div className="text-center space-y-4 py-2 animate-in zoom-in duration-300">
                            <div className="space-y-1">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                                <h3 className="text-xl font-bold text-zinc-900">Tebrikler!</h3>
                                <p className="text-zinc-600">
                                    <span className="font-bold text-zinc-900">{wonPrize}</span> kazandınız!
                                </p>
                            </div>

                            <div className="bg-zinc-50 p-4 rounded-xl space-y-3 text-left border border-zinc-100">
                                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ödülünüzü Almak İçin</p>
                                <div className="space-y-2">
                                    <Input 
                                        placeholder="Ad Soyad" 
                                        value={contactName}
                                        onChange={e => setContactName(e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                    <Input 
                                        placeholder="E-posta Adresi" 
                                        type="email"
                                        value={contactEmail}
                                        onChange={e => setContactEmail(e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                    <Input 
                                        placeholder="Telefon Numarası" 
                                        type="tel"
                                        value={contactPhone}
                                        onChange={e => setContactPhone(e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                </div>
                                <div className="flex items-start gap-2 pt-1">
                                    <input 
                                        type="checkbox" 
                                        id="kvkk_mystery" 
                                        className="mt-1"
                                        checked={kvkkAccepted}
                                        onChange={e => setKvkkAccepted(e.target.checked)}
                                    />
                                    <label htmlFor="kvkk_mystery" className="text-[10px] leading-tight text-zinc-500">
                                        Kişisel verilerimin işlenmesine ilişkin <span className="underline cursor-pointer">aydınlatma metnini</span> okudum ve kabul ediyorum.
                                    </label>
                                </div>
                                <Button 
                                    onClick={handleClaim}
                                    disabled={submitting || !contactName || !contactEmail || !contactPhone || !kvkkAccepted}
                                    style={{ backgroundColor: themeColor }}
                                    className="w-full h-9 text-sm hover:brightness-110 mt-2"
                                >
                                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Ödülü Tanımla
                                </Button>
                            </div>
                        </div>
                    )}

                    {phase === "final" && (
                        <div className="text-center space-y-5 py-4 animate-in fade-in zoom-in duration-500">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                <Gift className="w-8 h-8 text-emerald-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-zinc-900">Ödülünüz Hazır!</h3>
                                <p className="text-sm text-zinc-600">Bilgileriniz kaydedildi. Kupon kodunuzu aşağıda bulabilirsiniz:</p>
                            </div>
                            
                            {couponCode ? (
                                <div className="bg-emerald-50 border-2 border-dashed border-emerald-200 p-4 rounded-xl">
                                    <span className="text-2xl font-mono font-bold text-emerald-700 tracking-wider">
                                        {couponCode}
                                    </span>
                                </div>
                            ) : (
                                <div className="bg-zinc-50 p-4 rounded-xl italic text-zinc-500 text-sm">
                                    Ödülünüz e-posta adresinize gönderilecektir.
                                </div>
                            )}

                            <Button 
                                onClick={onClose}
                                className="w-full bg-zinc-900 text-white hover:bg-zinc-800"
                            >
                                Kapat
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
