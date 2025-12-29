
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Zap, TrendingUp, CheckCircle2, Info, MessageSquare, type LucideIcon } from "lucide-react"
import { ModuleDefinition, ModuleId } from "@/lib/modules-registry"
import { useLanguage } from "@/context/LanguageContext"
import { MODULES as MODULE_DEFINITIONS } from "@/lib/module-config"

interface ModuleDetailsDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    selectedModuleId: ModuleId | null
    moduleStates: Record<string, boolean>
    onManage: (moduleId: ModuleId) => void
    registryModules: ModuleDefinition[]
    firestoreMap: Record<ModuleId, string>
    iconMap: Record<string, LucideIcon>
}

export function ModuleDetailsDialog({
    isOpen,
    onOpenChange,
    selectedModuleId,
    moduleStates,
    onManage,
    registryModules,
    firestoreMap,
    iconMap
}: ModuleDetailsDialogProps) {
    const { t, language } = useLanguage()

    if (!selectedModuleId) return null

    const moduleConfig = MODULE_DEFINITIONS[selectedModuleId]
    if (!moduleConfig) return null

    // Find matching registry module for richer text
    const firestoreField = firestoreMap[selectedModuleId]
    const registryModule = registryModules.find(
        m => m.legacyFirestoreField === firestoreField
    )

    const IconComponent = iconMap[moduleConfig.icon] || MessageSquare
    const title = registryModule
        ? (language === 'tr' ? registryModule.name.tr : registryModule.name.en)
        : (t(moduleConfig.nameKey) || moduleConfig.nameKey)

    const description = registryModule?.longDescription
        ? (language === 'tr' ? registryModule.longDescription.tr : registryModule.longDescription.en)
        : (registryModule
            ? (language === 'tr' ? registryModule.description.tr : registryModule.description.en)
            : (t(moduleConfig.descriptionKey) || moduleConfig.descriptionKey))

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-start gap-5 mb-4">
                        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shrink-0">
                            <IconComponent className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
                                {moduleConfig.isPremium && (
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">
                                        Premium
                                    </Badge>
                                )}
                            </div>
                            <DialogDescription className="text-base leading-relaxed text-muted-foreground">
                                {description}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-2 space-y-6">
                    {/* Features Section */}
                    {registryModule?.features && (
                        <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2 text-foreground">
                                <Zap className="w-4 h-4 text-blue-500" />
                                {language === 'tr' ? 'Özellikler' : 'Features'}
                            </h4>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {registryModule.features.map((feature, idx) => (
                                    <div key={idx} className="p-3 rounded-xl bg-muted/50 border border-border/50">
                                        <div className="font-medium text-sm mb-1">
                                            {language === 'tr' ? feature.title.tr : feature.title.en}
                                        </div>
                                        <div className="text-xs text-muted-foreground leading-relaxed">
                                            {language === 'tr' ? feature.description.tr : feature.description.en}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Benefits Section */}
                    {registryModule?.benefits && (
                        <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2 text-foreground">
                                <TrendingUp className="w-4 h-4 text-green-500" />
                                {language === 'tr' ? 'Avantajları' : 'Benefits'}
                            </h4>
                            <ul className="space-y-2">
                                {registryModule.benefits.map((benefit, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                        <span>{language === 'tr' ? benefit.tr : benefit.en}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Fallback Info if no rich data */}
                    {!registryModule?.features && !registryModule?.benefits && (
                        <div className="bg-muted/50 p-4 rounded-lg text-sm">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                {language === 'tr' ? 'Modül Hakkında' : 'About Module'}
                            </h4>
                            <p className="text-muted-foreground">
                                {language === 'tr'
                                    ? 'Bu modülü aktif ederek işletmenize bu özelliği kazandırabilirsiniz.'
                                    : 'Enable this module to add these capabilities to your business.'}
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
                    <DialogClose asChild>
                        <Button variant="outline" className="h-10">
                            {language === 'tr' ? 'Kapat' : 'Close'}
                        </Button>
                    </DialogClose>
                    <Button
                        className="h-10 px-6 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => {
                            onOpenChange(false)
                            if (moduleStates[selectedModuleId] || moduleConfig.isCore) {
                                onManage(selectedModuleId)
                            }
                        }}
                    >
                        {language === 'tr' ? 'Yönet' : 'Manage'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
