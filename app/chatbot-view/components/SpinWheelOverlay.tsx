"use client"

import { useState, useEffect, useRef } from "react"
import { X, Gift, Loader2, CheckCircle2 } from "lucide-react"
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
    onClose: () => void
    onPrize?: (prize: string, couponCode?: string) => void
}

const DEFAULT_COLORS = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
]

export function SpinWheelOverlay({ chatbotId, sessionId, prizes, onClose, onPrize }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [spinning, setSpinning] = useState(false)
    const [landed, setLanded] = useState(false)
    const [wonPrize, setWonPrize] = useState<string | null>(null)
    const [couponCode, setCouponCode] = useState<string | null>(null)
    const [rotation, setRotation] = useState(0)
    const [contactEmail, setContactEmail] = useState("")
    const [phase, setPhase] = useState<"collect" | "spin" | "result">("collect")
    const [submitting, setSubmitting] = useState(false)
    const animRef = useRef<number | null>(null)

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

    async function handleSpin() {
        if (spinning || !prizes.length) return
        setSubmitting(true)

        try {
            const res = await fetch("/api/gamification/spin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatbotId,
                    sessionId,
                    visitorId: typeof window !== "undefined"
                        ? localStorage.getItem(`vid_${chatbotId}`) || undefined
                        : undefined,
                    contactEmail: contactEmail || undefined,
                }),
            })
            const data = await res.json()
            setSubmitting(false)

            if (data.alreadySpun) {
                setWonPrize(data.prize)
                setCouponCode(data.couponCode || null)
                setPhase("result")
                return
            }

            const targetIndex = data.prizeIndex ?? 0
            const arc = 360 / prizes.length
            const targetDeg = 360 - targetIndex * arc - arc / 2
            const spins = 5 * 360 + targetDeg
            const startRot = rotation
            const endRot = startRot + spins
            const duration = 4000
            const startTime = performance.now()

            setSpinning(true)
            setPhase("spin")

            function animate(now: number) {
                const elapsed = now - startTime
                const t = Math.min(elapsed / duration, 1)
                const ease = 1 - Math.pow(1 - t, 4)
                setRotation(startRot + (endRot - startRot) * ease)
                if (t < 1) {
                    animRef.current = requestAnimationFrame(animate)
                } else {
                    setRotation(endRot % 360)
                    setSpinning(false)
                    setLanded(true)
                    setWonPrize(data.prize)
                    setCouponCode(data.couponCode || null)
                    setPhase("result")
                    onPrize?.(data.prize, data.couponCode)
                }
            }
            animRef.current = requestAnimationFrame(animate)
        } catch {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-white" />
                        <h2 className="text-white font-bold text-base">Çarkı Çevir, Kazan!</h2>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {phase !== "result" && (
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

                    {phase === "collect" && (
                        <div className="space-y-3">
                            <p className="text-sm text-zinc-600 text-center">
                                E-posta adresinizi girin ve çarkı çevirerek şansınızı deneyin!
                            </p>
                            <Input
                                type="email"
                                placeholder="E-posta adresiniz"
                                value={contactEmail}
                                onChange={e => setContactEmail(e.target.value)}
                                className="text-sm"
                            />
                            <Button
                                onClick={handleSpin}
                                disabled={submitting || !contactEmail.includes("@")}
                                className="w-full bg-violet-600 hover:bg-violet-700"
                            >
                                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Çarkı Çevir!
                            </Button>
                            <button
                                onClick={handleSpin}
                                disabled={submitting}
                                className="w-full text-xs text-zinc-400 hover:text-zinc-600"
                            >
                                E-posta vermeden devam et
                            </button>
                        </div>
                    )}

                    {phase === "spin" && (
                        <p className="text-center text-sm font-medium text-violet-700 animate-pulse">
                            Çevriliyor...
                        </p>
                    )}

                    {phase === "result" && wonPrize && (
                        <div className="text-center space-y-3 py-2">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                            <div>
                                <p className="text-lg font-bold text-zinc-800">Tebrikler!</p>
                                <p className="text-2xl font-extrabold text-violet-700 mt-1">{wonPrize}</p>
                            </div>
                            {couponCode && (
                                <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-2">
                                    <p className="text-xs text-zinc-500 mb-1">Kupon Kodunuz</p>
                                    <p className="font-mono font-bold text-violet-800 text-lg tracking-widest">
                                        {couponCode}
                                    </p>
                                </div>
                            )}
                            <Button onClick={onClose} className="w-full">
                                Alışverişe Devam Et
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
