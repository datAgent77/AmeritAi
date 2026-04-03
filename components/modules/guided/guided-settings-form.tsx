"use client"

import { useLanguage } from "@/context/LanguageContext"
import { GuidedSkillsContent } from "@/components/knowledge/content/guided-skills-content"

export function GuidedSettingsForm({ targetUserId }: { targetUserId: string }) {
    const { language } = useLanguage()
    const isTr = language === "tr"

    return (
        <div className="flex-1 space-y-8 p-8 pt-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
            <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Guided</h2>
                <p className="text-muted-foreground max-w-3xl">
                    {isTr
                        ? "Web widget ve mesajlaşma kanalları için adım adım yönlendirmeli akışlar oluşturun. Modül açıkken aktif skill'ler ilgili kanallarda otomatik olarak kullanılabilir."
                        : "Build step-by-step guided flows for the web widget and messaging channels. When the module is enabled, active skills become available automatically on the relevant channels."}
                </p>
            </div>

            <GuidedSkillsContent userId={targetUserId} moduleMode />
        </div>
    )
}
