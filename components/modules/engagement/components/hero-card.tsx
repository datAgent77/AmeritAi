import { Sparkles } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { EngagementSettings } from "../types"

interface EngagementHeroCardProps {
    settings: EngagementSettings
    setSettings: React.Dispatch<React.SetStateAction<EngagementSettings>>
}

export function EngagementHeroCard({ settings, setSettings }: EngagementHeroCardProps) {
    return (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-900/10 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-amber-950 dark:text-amber-100">AI Oto-Pilot</h3>
                    <p className="text-amber-800/80 dark:text-amber-400 text-sm max-w-md">
                        Ziyaretçi davranışlarını analiz ederek en doğru anda, en doğru mesajı otomatik olarak gösterir.
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3 bg-white dark:bg-black/20 p-1.5 pl-4 rounded-full border border-amber-200/50 dark:border-amber-800/30 shadow-sm">
                <span className={`text-sm font-medium ${settings.aiSmartBubbles.enabled ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {settings.aiSmartBubbles.enabled ? 'Aktif' : 'Pasif'}
                </span>
                <Switch
                    checked={settings.aiSmartBubbles.enabled}
                    onCheckedChange={(c) => setSettings(p => ({ ...p, aiSmartBubbles: { ...p.aiSmartBubbles, enabled: c } }))}
                    className="data-[state=checked]:bg-amber-500"
                />
            </div>
        </div>
    )
}
