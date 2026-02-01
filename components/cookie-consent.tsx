"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

export function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Check if user has already made a choice
        const consent = localStorage.getItem("cookie_consent")
        if (!consent) {
            // Show banner after a short delay
            const timer = setTimeout(() => setIsVisible(true), 1500)
            return () => clearTimeout(timer)
        }
    }, [])

    const handleAccept = () => {
        localStorage.setItem("cookie_consent", "accepted")
        setIsVisible(false)
    }

    const handleDecline = () => {
        localStorage.setItem("cookie_consent", "declined")
        setIsVisible(false)
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed bottom-0 sm:bottom-4 left-0 right-0 sm:left-4 sm:right-auto z-[99999] p-4 sm:max-w-md w-full"
                >
                    <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
                        <div className="text-sm text-gray-300 leading-relaxed">
                            <h3 className="text-white font-medium mb-1">Çerez Tercihleri 🍪</h3>
                            <p>
                                Size daha iyi bir deneyim sunmak ve trafiğimizi analiz etmek için çerezleri kullanıyoruz. 
                                <br />
                                <a href="/privacy" className="text-lime-400 hover:text-lime-300 transition-colors hover:underline mt-1 inline-block">
                                    Gizlilik Politikası
                                </a>&apos;nı inceleyebilirsiniz.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <Button variant="ghost" onClick={handleDecline} className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 h-10 rounded-xl transition-all">
                                Reddet
                            </Button>
                            <Button onClick={handleAccept} className="flex-1 bg-lime-400 hover:bg-lime-500 text-black font-semibold h-10 rounded-xl shadow-[0_0_15px_rgba(163,230,53,0.3)] transition-all">
                                Kabul Et
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
