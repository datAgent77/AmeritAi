"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { motion, AnimatePresence } from "framer-motion"
import { useCookieConsent, CookieConsent as ConsentType } from "@/context/CookieConsentContext"
import { Shield, BarChart3, Megaphone, Settings2, Check, X, ChevronRight } from "lucide-react"

export function CookieConsent() {
    const { consent, acceptAll, declineAll, saveConsent } = useCookieConsent()
    const [isVisible, setIsVisible] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    
    // Local state for settings modal
    const [preferences, setPreferences] = useState<ConsentType>({
        necessary: true,
        analytics: false,
        marketing: false,
        preferences: false
    })

    useEffect(() => {
        // Only show if no consent has been given yet
        if (consent === null) {
            const timer = setTimeout(() => setIsVisible(true), 1500)
            return () => clearTimeout(timer)
        } else {
            setIsVisible(false)
        }
    }, [consent])

    const handleSavePreferences = () => {
        saveConsent(preferences)
        setShowSettings(false)
    }

    // Toggle logic for the modal
    const togglePreference = (key: keyof ConsentType) => {
        if (key === 'necessary') return
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }))
    }

    return (
        <AnimatePresence>
            {/* 1. Main Banner */}
            {isVisible && !showSettings && (
                <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed bottom-0 sm:bottom-4 left-0 right-0 sm:left-4 sm:right-auto z-[99999] p-4 sm:max-w-md w-full"
                >
                    <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
                        <div className="text-sm text-gray-300 leading-relaxed">
                            <h3 className="text-white font-medium mb-1 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-white" />
                                Çerez Tercihleri
                            </h3>
                            <p>
                                Deneyiminizi iyileştirmek için çerezleri kullanıyoruz. 
                                <br />
                                Kendi tercihlerinize göre özelleştirebilirsiniz.
                            </p>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <Button variant="ghost" onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-white text-xs h-10 px-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all">
                                <Settings2 className="w-4 h-4" />
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={declineAll} className="bg-white/5 hover:bg-white/10 text-white border border-white/5 h-10 px-4 rounded-xl transition-all text-xs">
                                    Reddet
                                </Button>
                                <Button onClick={acceptAll} className="bg-white hover:bg-gray-200 text-black font-bold h-10 px-6 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all text-xs">
                                    Tümünü Kabul Et
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* 2. Settings Modal */}
            {showSettings && (
                 <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowSettings(false)}
                    />
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative bg-[#0A0A0A] border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-white">Çerez Ayarları</h2>
                                <p className="text-sm text-gray-400 mt-1">Hangi çerezlere izin vereceğinizi seçin.</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white rounded-full">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                            
                            {/* Necessary */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                        <Shield className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-medium">Zorunlu Çerezler</h4>
                                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                            Sitenin çalışması için gereklidir (Güvenlik, dil ayarları vb.). Kapatılamaz.
                                        </p>
                                    </div>
                                </div>
                                <Switch checked={true} disabled className="opacity-50" />
                            </div>

                            {/* Analytics */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                        <BarChart3 className="w-5 h-5 text-gray-300" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-medium">Analitik</h4>
                                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                            Sitemizi nasıl kullandığınızı analiz etmemize yardımcı olur (Google Analytics, Hotjar).
                                        </p>
                                    </div>
                                </div>
                                <Switch 
                                    checked={preferences.analytics} 
                                    onCheckedChange={() => togglePreference('analytics')} 
                                    className="data-[state=checked]:bg-white data-[state=checked]:text-black"
                                />
                            </div>

                            {/* Marketing */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                        <Megaphone className="w-5 h-5 text-gray-300" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-medium">Pazarlama</h4>
                                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                            Size özel kampanyalar sunmamızı ve reklamları yönetmemizi sağlar.
                                        </p>
                                    </div>
                                </div>
                                <Switch 
                                    checked={preferences.marketing} 
                                    onCheckedChange={() => togglePreference('marketing')}
                                    className="data-[state=checked]:bg-white data-[state=checked]:text-black" 
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end gap-3">
                            <Button variant="ghost" onClick={declineAll} className="text-white hover:bg-white/10">
                                Tümünü Reddet
                            </Button>
                            <Button onClick={handleSavePreferences} className="bg-white hover:bg-gray-200 text-black font-bold px-8">
                                Seçimleri Kaydet
                            </Button>
                        </div>
                    </motion.div>
                 </div>
            )}
        </AnimatePresence>
    )
}
