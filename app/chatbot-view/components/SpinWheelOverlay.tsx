"use client"

import { useState, useEffect, useRef } from "react"
import { X, Gift, Loader2, CheckCircle2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Prize {
    name: string
    probability: number
    color?: string
}

interface Props {
    chatbotId: string
    sessionId?: string
    prizes: Prize[]
    requireEmail?: boolean
    themeColor?: string
    onClose: () => void
    onPrize?: (prize: string, couponCode?: string) => void
    onComplete?: () => void
    title?: string
    description?: string
    buttonText?: string
}

const DEFAULT_COLORS = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
]
const SPIN_REQUEST_TIMEOUT_MS = 12000

export function SpinWheelOverlay({ 
    chatbotId, 
    sessionId, 
    prizes, 
    requireEmail = true, 
    themeColor = "#8b5cf6", 
    onClose, 
    onPrize,
    onComplete,
    title = "Şansını Dene!",
    description = "Hemen oyna ve sürpriz ödüllerden birini kazanma şansı yakala.",
    buttonText = "Hemen Oyna"
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [spinning, setSpinning] = useState(false)
    const [landed, setLanded] = useState(false)
    const [wonPrize, setWonPrize] = useState<string | null>(null)
    const [couponCode, setCouponCode] = useState<string | null>(null)
    const [rotation, setRotation] = useState(0)
    const [contactEmail, setContactEmail] = useState("")
    const [contactName, setContactName] = useState("")
    const [contactPhone, setContactPhone] = useState("")
    const [kvkkAccepted, setKvkkAccepted] = useState(false)
    const [rewardEmailSent, setRewardEmailSent] = useState<boolean | null>(null)
    const [phase, setPhase] = useState<"start" | "spin" | "result" | "lost" | "claim" | "final">("start")
    const [submitting, setSubmitting] = useState(false)
    const animRef = useRef<number | null>(null)
    const rotationRef = useRef(0)

    // Draw wheel
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || !prizes.length) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const cx = canvas.width / 2
        const cy = canvas.height / 2
        const r = cx - 10
        const arc = (2 * Math.PI) / prizes.length

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate((rotation * Math.PI) / 180)

        prizes.forEach((prize, i) => {
            const startAngle = i * arc - Math.PI / 2
            const endAngle = startAngle + arc

            ctx.beginPath()
            ctx.moveTo(0, 0)
            ctx.arc(0, 0, r, startAngle, endAngle)
            ctx.fillStyle = prize.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]
            ctx.fill()
            ctx.strokeStyle = "#fff"
            ctx.lineWidth = 2
            ctx.stroke()

            ctx.save()
            ctx.rotate(startAngle + arc / 2)
            ctx.textAlign = "right"
            ctx.fillStyle = "#fff"
            ctx.font = "bold 12px sans-serif"
            ctx.shadowColor = "rgba(0,0,0,0.4)"
            ctx.shadowBlur = 3
            ctx.fillText(prize.name.slice(0, 18), r - 8, 4)
            ctx.restore()
        })
        ctx.restore()

        // Center circle
        ctx.beginPath()
        ctx.arc(cx, cy, 14, 0, 2 * Math.PI)
        ctx.fillStyle = "#1e293b"
        ctx.fill()
    }, [prizes, rotation])

    useEffect(() => {
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current)
        }
    }, [])

    const setWheelRotation = (value: number) => {
        rotationRef.current = value
        setRotation(value)
    }

    const finishSpin = (data: any, startRot: number) => {
        const targetIndex = data.prizeIndex ?? 0
        const arc = 360 / prizes.length
        const normalizedStart = ((startRot % 360) + 360) % 360
        const targetDeg = 360 - targetIndex * arc - arc / 2
        const deltaToTarget = ((targetDeg - normalizedStart) % 360 + 360) % 360
        const endRot = startRot + (3 * 360) + deltaToTarget
        const duration = 2800
        let startTime: number | null = null

        function animate(now: number) {
            if (startTime === null) startTime = now
            const elapsed = now - startTime
            const t = Math.min(elapsed / duration, 1)
            const ease = 1 - Math.pow(1 - t, 4)
            setWheelRotation(startRot + (endRot - startRot) * ease)
            if (t < 1) {
                animRef.current = requestAnimationFrame(animate)
            } else {
                setWheelRotation(endRot % 360)
                setSpinning(false)
                setLanded(true)
                setWonPrize(data.prize)
                setCouponCode(data.couponCode || null)
                setPhase(data.isWinner === false ? "lost" : "result")
                onComplete?.()
                if (data.isWinner !== false) {
                    onPrize?.(data.prize, data.couponCode)
                }
            }
        }

        animRef.current = requestAnimationFrame(animate)
    }

    async function handleSpin() {
        if (spinning || !prizes.length) return
        setSubmitting(false)
        setSpinning(true)
        setPhase("spin")

        if (animRef.current) cancelAnimationFrame(animRef.current)

        const spinStartedAt = performance.now()
        const initialRot = rotationRef.current
        const holdingSpeed = 720 // deg/sec while the API result is pending

        function animatePending(now: number) {
            const elapsedSeconds = (now - spinStartedAt) / 1000
            setWheelRotation(initialRot + elapsedSeconds * holdingSpeed)
            animRef.current = requestAnimationFrame(animatePending)
        }

        animRef.current = requestAnimationFrame(animatePending)

        const controller = new AbortController()
        const timeoutId = window.setTimeout(() => controller.abort(), SPIN_REQUEST_TIMEOUT_MS)

        try {
            const res = await fetch("/api/gamification/spin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    chatbotId,
                    sessionId,
                    visitorId: typeof window !== "undefined"
                        ? localStorage.getItem(`vid_${chatbotId}`) || undefined
                        : undefined,
                }),
            })
            const data = await res.json().catch(() => ({}))

            if (!res.ok || data.error) {
                if (animRef.current) cancelAnimationFrame(animRef.current)
                setSpinning(false)
                setWonPrize(data.error || "Bir hata oluştu")
                setPhase("lost")
                return
            }

            if (data.alreadySpun) {
                if (animRef.current) cancelAnimationFrame(animRef.current)
                finishSpin(data, rotationRef.current)
                return
            }

            if (animRef.current) cancelAnimationFrame(animRef.current)
            finishSpin(data, rotationRef.current)
        } catch (error: any) {
            if (animRef.current) cancelAnimationFrame(animRef.current)
            setSpinning(false)
            setWonPrize(error?.name === "AbortError" ? "İstek zaman aşımına uğradı" : "Bağlantı hatası")
            setPhase("lost")
        } finally {
            window.clearTimeout(timeoutId)
        }
    }

    const handleClaim = async () => {
        if (!contactName || !contactEmail || !contactPhone || !kvkkAccepted) return
        setSubmitting(true)
        try {
            const res = await fetch("/api/gamification/claim", {
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
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(data?.error || "Claim failed")
            }
            setRewardEmailSent(data.emailSent === true)
            setPhase("final")
        } catch (error) {
            console.error("Claim failed", error)
            setWonPrize("Ödül tanımlanamadı")
            setPhase("lost")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div style={{ backgroundColor: themeColor }} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-white" />
                        <h2 className="text-white font-bold text-base">Çarkı Çevir, Kazan!</h2>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {phase !== "result" && phase !== "lost" && phase !== "final" && (
                        <div className="relative flex justify-center">
                            {/* Arrow pointer */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                                <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-zinc-800" />
                            </div>
                            <canvas
                                ref={canvasRef}
                                width={260}
                                height={260}
                                className="rounded-full shadow-lg"
                            />
                        </div>
                    )}

                    {phase === "start" && (
                        <div className="space-y-3">
                            <h2 className="text-xl font-bold text-zinc-900 text-center">{title}</h2>
                            <p className="text-sm text-zinc-600 text-center">
                                {description}
                            </p>
                            <Button
                                onClick={handleSpin}
                                disabled={submitting}
                                style={{ backgroundColor: themeColor }}
                                className="w-full hover:brightness-110"
                            >
                                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {buttonText}
                            </Button>
                        </div>
                    )}

                    {phase === "spin" && (
                        <p className="text-center text-sm font-medium text-violet-700 animate-pulse">
                            Çevriliyor...
                        </p>
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
                                        id="kvkk" 
                                        className="mt-1"
                                        checked={kvkkAccepted}
                                        onChange={e => setKvkkAccepted(e.target.checked)}
                                    />
                                    <label htmlFor="kvkk" className="text-[10px] leading-tight text-zinc-500">
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

                    {phase === "lost" && wonPrize && (
                        <div className="text-center space-y-4 py-4 animate-in zoom-in duration-300">
                            <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center mx-auto">
                                <RotateCcw className="w-7 h-7 text-zinc-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-zinc-900">Bu kez olmadı</h3>
                                <p className="text-sm text-zinc-600">
                                    Sonuç: <span className="font-semibold text-zinc-900">{wonPrize}</span>. Bir sonraki denemede şansınız açık olsun.
                                </p>
                            </div>
                            <Button
                                onClick={onClose}
                                className="w-full bg-zinc-900 text-white hover:bg-zinc-800"
                            >
                                Kapat
                            </Button>
                        </div>
                    )}

                    {phase === "final" && (
                        <div className="text-center space-y-5 py-4 animate-in fade-in zoom-in duration-500">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                <Gift className="w-8 h-8 text-emerald-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-zinc-900">Ödülünüz Hazır!</h3>
                                <p className="text-sm text-zinc-600">
                                    {rewardEmailSent === false
                                        ? "Bilgileriniz kaydedildi ancak e-posta gönderimi şu anda tamamlanamadı. Ekibimiz ödülünüzü kayıtlı e-posta adresinizden takip edebilir."
                                        : couponCode
                                            ? "Bilgileriniz kaydedildi. Kupon kodunuz aşağıdaki e-posta adresine gönderildi."
                                            : "Bilgileriniz kaydedildi. Ödül bilginiz aşağıdaki e-posta adresine gönderildi."}
                                </p>
                            </div>

                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-1">
                                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                                    {rewardEmailSent === false ? "E-posta kuyruğa alınamadı" : "Gönderilen e-posta"}
                                </p>
                                <div className="font-semibold text-emerald-900 break-all">
                                    {contactEmail}
                                </div>
                            </div>

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
