"use client"

import { useState, useRef, useEffect } from "react"
import { X, Gift, Loader2, CheckCircle2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getGamificationTheme } from "./gamification-theme"

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

export function ScratchCardOverlay({ 
    chatbotId, 
    sessionId, 
    prizes, 
    requireEmail = true, 
    themeColor = "#8b5cf6", 
    onClose, 
    onPrize,
    title = "Kazı Kazan!",
    description = "Hemen oyna ve sürpriz ödüllerden birini kazanma şansı yakala.",
    buttonText = "Devam Et"
}: Props) {
    const brandTheme = getGamificationTheme(themeColor)
    const [contactEmail, setContactEmail] = useState("")
    const [contactName, setContactName] = useState("")
    const [contactPhone, setContactPhone] = useState("")
    const [kvkkAccepted, setKvkkAccepted] = useState(false)
    const [phase, setPhase] = useState<"collect" | "play" | "result" | "final">("collect")
    const [submitting, setSubmitting] = useState(false)
    const [wonPrize, setWonPrize] = useState<string | null>(null)
    const [couponCode, setCouponCode] = useState<string | null>(null)
    const [scratched, setScratched] = useState(false)
    const [isRevealed, setIsRevealed] = useState(false)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDrawingRef = useRef(false)
    const scratchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const scratchAttemptedRef = useRef(false)

    const handleStart = async () => {
        if (requireEmail && !contactEmail.includes("@")) return
        setPhase("play")
    }

    const handleScratch = async () => {
        if (scratchAttemptedRef.current) return
        scratchAttemptedRef.current = true
        
        setScratched(true)
        setSubmitting(true)
        try {
            const res = await fetch("/api/gamification/spin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    chatbotId, 
                    sessionId, 
                    visitorId: typeof window !== "undefined" ? localStorage.getItem(`vid_${chatbotId}`) : undefined,
                    email: contactEmail 
                }),
            })
            const data = await res.json()
            
            setSubmitting(false)
            if (data.error) {
                setWonPrize("Hata oluştu")
            } else {
                setWonPrize(data.prize)
                setCouponCode(data.couponCode || null)
            }
        } catch {
            setSubmitting(false)
            // Fallback if error so they don't get stuck
            setWonPrize("Bir hata oluştu") 
        }
    }

    useEffect(() => {
        if (phase === "play" && canvasRef.current) {
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d', { willReadFrequently: true })
            if (!ctx) return

            // High DPI support
            const dpr = window.devicePixelRatio || 1
            const rect = canvas.getBoundingClientRect()
            canvas.width = rect.width * dpr
            canvas.height = rect.height * dpr
            ctx.scale(dpr, dpr)

            // Fill background with elegant metallic pattern
            const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height)
            gradient.addColorStop(0, brandTheme.primarySoft)
            gradient.addColorStop(0.5, brandTheme.primarySoftStrong)
            gradient.addColorStop(1, brandTheme.primarySoft)
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, rect.width, rect.height)

            // Add pattern overlay
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
            for (let i = 0; i < rect.width; i += 4) {
                ctx.fillRect(i, 0, 1, rect.height)
            }

            // Draw text
            ctx.fillStyle = brandTheme.primaryText
            ctx.font = '600 16px Inter, sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('Ödülü Görmek İçin Kazıyın', rect.width / 2, rect.height / 2)
        }
    }, [brandTheme.primarySoft, brandTheme.primarySoftStrong, brandTheme.primaryText, phase])

    useEffect(() => {
        if (isRevealed) {
            // Once revealed, wait 2 seconds so user can see the prize clearly before jumping to the result phase
            const timer = setTimeout(() => {
                setPhase("result")
                if (wonPrize) {
                    onPrize?.(wonPrize, couponCode || undefined)
                }
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [isRevealed, wonPrize, couponCode, onPrize])

    const scratch = (clientX: number, clientY: number) => {
        if (isRevealed) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const rect = canvas.getBoundingClientRect()
        const x = clientX - rect.left
        const y = clientY - rect.top

        ctx.globalCompositeOperation = 'destination-out'
        ctx.beginPath()
        ctx.arc(x, y, 24, 0, Math.PI * 2)
        ctx.fill()

        if (!scratched) {
            handleScratch()
        }

        // Throttle percentage check
        if (scratchTimeoutRef.current) return
        scratchTimeoutRef.current = setTimeout(() => {
            scratchTimeoutRef.current = null
            checkPercentage()
        }, 150)
    }

    const checkPercentage = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
        let transparent = 0
        for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] < 128) transparent++
        }
        const percentage = (transparent / (pixels.length / 4)) * 100
        
        if (percentage > 40 && wonPrize) {
            setIsRevealed(true)
        }
    }

    const handlePointerDown = (e: React.PointerEvent) => {
        isDrawingRef.current = true
        scratch(e.clientX, e.clientY)
        // Prevent scrolling while scratching on mobile
        const canvas = canvasRef.current
        if (canvas) canvas.style.touchAction = 'none'
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDrawingRef.current) return
        scratch(e.clientX, e.clientY)
    }

    const handlePointerUp = () => {
        isDrawingRef.current = false
        const canvas = canvasRef.current
        if (canvas) canvas.style.touchAction = 'auto'
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div style={{ backgroundColor: brandTheme.primary, color: brandTheme.textOnPrimary }} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5" />
                        <h2 className="font-bold text-base">Kazı Kazan!</h2>
                    </div>
                    <button onClick={onClose} className="opacity-80 hover:opacity-100 transition-opacity">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {phase === "collect" && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-zinc-900 text-center">{title}</h2>
                            <p className="text-sm text-zinc-600 text-center">
                                {description}
                            </p>
                            {requireEmail && (
                                <Input
                                    type="email"
                                    placeholder="E-posta adresiniz"
                                    value={contactEmail}
                                    onChange={e => setContactEmail(e.target.value)}
                                    className="text-sm"
                                />
                            )}
                            <Button
                                onClick={handleStart}
                                disabled={submitting || (requireEmail && !contactEmail.includes("@"))}
                                style={{ backgroundColor: brandTheme.primary, color: brandTheme.textOnPrimary }}
                                className="w-full hover:brightness-110"
                            >
                                {buttonText}
                            </Button>
                        </div>
                    )}

                    {phase === "play" && (
                        <div className="space-y-4 text-center">
                            <h2 className="text-xl font-bold text-zinc-900">Şansını Dene!</h2>
                            <p className="text-sm text-zinc-600">
                                Aşağıdaki alanı parmağınızla veya farenizle kazıyarak sürpriz ödülünüzü görün.
                            </p>
                            
                            <div className="relative w-full h-40 bg-zinc-50 rounded-xl overflow-hidden border border-zinc-200 shadow-inner mt-4">
                                {/* Base Layer: Shown under the scratch surface */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                    {submitting ? (
                                        <div className="flex flex-col items-center gap-3 text-zinc-500">
                                            <Loader2 className="w-8 h-8 animate-spin" />
                                            <span className="text-xs font-medium">Ödülünüz hazırlanıyor...</span>
                                        </div>
                                    ) : wonPrize ? (
                                        <div className="flex flex-col items-center gap-2 animate-in zoom-in duration-500">
                                            <Sparkles className="w-8 h-8" style={{ color: brandTheme.primary }} />
                                            <span className="text-lg font-black text-zinc-900 text-center uppercase tracking-wide">
                                                {wonPrize}
                                            </span>
                                            {couponCode && (
                                                <span
                                                    className="text-xs font-mono font-bold px-2 py-1 rounded"
                                                    style={{ backgroundColor: brandTheme.primarySoft, color: brandTheme.primaryText }}
                                                >
                                                    {couponCode}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-zinc-400 text-sm">Hata oluştu.</span>
                                    )}
                                </div>

                                {/* Top Layer: The scratchable canvas */}
                                <canvas
                                    ref={canvasRef}
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onPointerLeave={handlePointerUp}
                                    className={`absolute inset-0 w-full h-full cursor-crosshair transition-opacity duration-700 ${isRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                                    style={{ touchAction: 'none' }}
                                />
                            </div>
                        </div>
                    )}

                    {phase === "result" && wonPrize && (
                        <div className="text-center space-y-4 py-2 animate-in zoom-in duration-300">
                            <div className="space-y-1">
                                <CheckCircle2 className="w-12 h-12 mx-auto" style={{ color: brandTheme.primary }} />
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
                                        id="kvkk_scratch" 
                                        className="mt-1"
                                        checked={kvkkAccepted}
                                        onChange={e => setKvkkAccepted(e.target.checked)}
                                    />
                                    <label htmlFor="kvkk_scratch" className="text-[10px] leading-tight text-zinc-500">
                                        Kişisel verilerimin işlenmesine ilişkin <span className="underline cursor-pointer">aydınlatma metnini</span> okudum ve kabul ediyorum.
                                    </label>
                                </div>
                                <Button 
                                    onClick={handleClaim}
                                    disabled={submitting || !contactName || !contactEmail || !contactPhone || !kvkkAccepted}
                                    style={{ backgroundColor: brandTheme.primary, color: brandTheme.textOnPrimary }}
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
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: brandTheme.primarySoft }}>
                                <Gift className="w-8 h-8" style={{ color: brandTheme.primaryText }} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-zinc-900">Ödülünüz Hazır!</h3>
                                <p className="text-sm text-zinc-600">Bilgileriniz kaydedildi. Kupon kodunuzu aşağıda bulabilirsiniz:</p>
                            </div>
                            
                            {couponCode ? (
                                <div className="border-2 border-dashed p-4 rounded-xl" style={{ backgroundColor: brandTheme.primarySoft, borderColor: brandTheme.primaryBorder }}>
                                    <span className="text-2xl font-mono font-bold tracking-wider" style={{ color: brandTheme.primaryText }}>
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
                                className="w-full hover:brightness-110"
                                style={{ backgroundColor: brandTheme.neutralAction, color: brandTheme.textOnNeutralAction }}
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
