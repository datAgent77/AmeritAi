
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
import { ModuleDefinition, ModuleId, MODULES_REGISTRY as MODULE_DEFINITIONS } from "@/lib/modules-registry"
import { getPublicPlansSorted } from "@/lib/pricing-config"
import { useLanguage } from "@/context/LanguageContext"

interface ModuleDetailsDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    selectedModuleId: ModuleId | null
    moduleStates: Record<string, boolean>
    onManage: (moduleId: ModuleId) => void
    registryModules: ModuleDefinition[]
    firestoreMap: Record<ModuleId, string>
    iconMap: Record<string, LucideIcon>
    canAccess: boolean
    onRequest: (moduleId: ModuleId) => void
}

export function ModuleDetailsDialog({
    isOpen,
    onOpenChange,
    selectedModuleId,
    moduleStates,
    onManage,
    registryModules,
    firestoreMap,
    iconMap,
    canAccess,
    onRequest
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
        : (language === 'tr' ? moduleConfig.name.tr : moduleConfig.name.en)

    const description = registryModule?.longDescription
        ? (language === 'tr' ? registryModule.longDescription.tr : registryModule.longDescription.en)
        : (registryModule
            ? (language === 'tr' ? registryModule.description.tr : registryModule.description.en)
            : (language === 'tr' ? moduleConfig.description.tr : moduleConfig.description.en))

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 flex flex-col overflow-hidden">
                <DialogHeader className="px-8 pt-8 pb-4 shrink-0 border-b">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
                        </div>
                        <DialogDescription className="text-base leading-relaxed text-muted-foreground">
                            {description}
                        </DialogDescription>
                        {/* Plan Inclusion Display */}
                        {(() => {
                            // Dynamic Plan Check
                            const allPlans = getPublicPlansSorted();
                            const minPlan = allPlans.find((plan: any) => 
                                plan.modules.included.includes(selectedModuleId) || plan.modules.included.includes('all')
                            );

                            if (minPlan) {
                                return (
                                    <div className="mt-2 flex flex-col gap-1">
                                        <div className="text-sm font-medium text-muted-foreground">
                                            {language === 'tr' ? 'Dahil olduğu paket:' : 'Included in:'}
                                        </div>
                                        <div className="text-lg font-bold text-violet-600 dark:text-violet-400">
                                            {minPlan.displayName}
                                            {/* Optional: Show plan price info if needed, but just plan name is cleaner for now */}
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-8 space-y-6">
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

                <DialogFooter className="px-8 py-6 shrink-0 border-t bg-muted/20">
                    <Button variant="outline" className="h-10" onClick={() => onOpenChange(false)}>
                        {language === 'tr' ? 'Kapat' : 'Close'}
                    </Button>
                    <Button
                        className="h-10 px-6 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => {
                            onOpenChange(false)
                            if (canAccess) {
                                onManage(selectedModuleId)
                            } else {
                                onRequest(selectedModuleId)
                            }
                        }}
                    >
                        {canAccess
                            ? (language === 'tr' ? 'Yönet' : 'Manage')
                            : (language === 'tr' ? 'Talep Et' : 'Request Access')
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
