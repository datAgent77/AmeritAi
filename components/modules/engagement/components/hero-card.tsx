import { Sparkles } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { EngagementSettings } from "../types"
import { useLanguage } from "@/context/LanguageContext"

interface EngagementHeroCardProps {
    settings: EngagementSettings
    setSettings: React.Dispatch<React.SetStateAction<EngagementSettings>>
}

export function EngagementHeroCard({ settings, setSettings }: EngagementHeroCardProps) {
    const { t } = useLanguage()
    return (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t('engAutoPilot')}</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-md">
                        {t('engAutoPilotDesc')}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3 bg-white dark:bg-black/20 p-1.5 pl-4 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <span className={`text-sm font-medium ${settings.aiSmartBubbles.enabled ? 'text-zinc-900 dark:text-zinc-100' : 'text-muted-foreground'}`}>
                    {settings.aiSmartBubbles.enabled ? 'Aktif' : 'Pasif'}
                </span>
                <Switch
                    checked={settings.aiSmartBubbles.enabled}
                    onCheckedChange={(c) => setSettings(p => ({ ...p, aiSmartBubbles: { ...p.aiSmartBubbles, enabled: c } }))}
                    className="data-[state=checked]:bg-zinc-900 dark:data-[state=checked]:bg-zinc-100"
                />
            </div>
        </div>
    )
}
