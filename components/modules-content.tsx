"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
    ShoppingBag,
    ArrowRight,
    Mic,
    MessageSquare,
    Calendar,
    Users,
    BookOpen,
    Share2,
    Mail,
    Lock,
    TrendingUp,
    Check,
    Globe,
    Zap,
    CheckCircle2,
    Shield,
    BarChart,
    Info,
    LayoutGrid,
    List
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { useState, useEffect } from "react"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { MODULES as MODULE_DEFINITIONS, ModuleId, ORDERED_MODULES } from "@/lib/module-config"
import { INDUSTRY_CONFIG, IndustryType, DEFAULT_INDUSTRY } from "@/lib/industry-config"
import { INDUSTRY_DEFAULT_MODULES, MODULES as NEW_MODULES } from "@/lib/modules-config"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog"
import { getAllModules as getAllRegistryModules } from "@/lib/modules-registry"
import { ModuleDetailsDialog } from "@/components/modules/module-details-dialog"

// Lucide Icon Mapping
export const ICON_MAP = {
    ShoppingBag,
    Check,
    Globe,
    Zap,
    TrendingUp,
    CheckCircle2,
    Shield,
    BarChart,
    Mic,
    MessageSquare,
    Calendar,
    Users,
    BookOpen,
    Share2,
    Mail
}

// Map ModuleId to Firestore Field
const MODULE_FIRESTORE_MAP: Record<ModuleId, string> = {
    generalChatbot: 'enableChatbot',
    productCatalog: 'enablePersonalShopper',
    voiceAssistant: 'enableVoiceAssistant',
    appointments: 'enableAppointments',
    leadCollection: 'enableLeadCollection',
    knowledgeBase: 'enableKnowledgeBase',

    emailMarketing: 'enableEmailMarketing',
    salesOptimization: 'enableSalesOptimization',
    reviewManagement: 'enableReviewManagement',
    loyaltyProgram: 'enableLoyaltyProgram',
    campaignManager: 'enableCampaignManager',
    autoTranslate: 'enableAutoTranslate',
    gamification: 'enableGamification',
    visualDiagnosis: 'enableVisualDiagnosis',
    agriCalendar: 'enableAgriCalendar',
    marketWatch: 'enableMarketWatch',
    digitalWaiter: 'enableDigitalWaiter'
}

interface ModulesContentProps {
    targetUserId?: string
}

export function ModulesContent({ targetUserId }: ModulesContentProps) {
    const { t, language } = useLanguage()
    const router = useRouter()
    const {
        user,
        role,
        enablePersonalShopper,
        enableChatbot,
        enableVoiceAssistant,
        enableKnowledgeBase,
        enableLeadFinder
    } = useAuth()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState<ModuleId | null>(null)
    const [isPageLoading, setIsPageLoading] = useState(true)
    const [moduleStates, setModuleStates] = useState<Record<string, boolean>>({})
    const [selectedModuleId, setSelectedModuleId] = useState<ModuleId | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    // ... useEffects and handlers remain the same ...

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('modules') || "Modüller"}</h2>
                    <p className="text-muted-foreground">
                        {t('modulesDescription') || "Yapay zeka asistanlarını ve araçlarını yönetin."}
                    </p>
                    {!isSuperAdminViewingTenant && (
                        <div className="mt-2 inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                            {t('industry')}: {(industryConfig as any).names?.[language] || industryConfig.label}
                        </div>
                    )}
                </div>
                <div className="flex items-center space-x-2 bg-secondary/50 p-1 rounded-lg border">
                    <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewMode('grid')}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewMode('list')}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
                    {ORDERED_MODULES.map((module) => {
                        const isIncluded = isModuleIncluded(module.id)
                        const isActive = module.isCore ? true : (moduleStates[module.id] || false)
                        const isSuperAdmin = role === 'SUPER_ADMIN'
                        const isCoreModule = module.isCore
                        const isAccessGranted = isSuperAdmin || isIncluded || isActive
                        const IconComponent = ICON_MAP[module.icon as keyof typeof ICON_MAP] || MessageSquare

                        return (
                            <Card key={module.id} className={`flex flex-col border transition-all hover:shadow-md ${!isAccessGranted ? 'opacity-90 bg-gray-50/50 dark:bg-zinc-900/50' : ''}`}>
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-0">
                                    <div className={`p-2 rounded-lg ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                                        <IconComponent className="w-6 h-6" />
                                    </div>
                                    {isCoreModule ? (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                                        <span className="w-2 h-2 rounded-full bg-green-500" />
                                                        {t('coreModule') || 'Temel'}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{t('coreModuleTooltip') || 'Bu temel bir modüldür ve kapatılamaz.'}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ) : isAccessGranted ? (
                                        <Switch
                                            checked={isActive}
                                            onCheckedChange={(checked) => handleToggle(module.id, checked)}
                                            disabled={isLoading === module.id}
                                        />
                                    ) : (
                                        <Lock className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </CardHeader>
                                <CardContent className="pt-0 flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <CardTitle className="text-lg font-semibold">{t(module.nameKey) || module.nameKey}</CardTitle>
                                        {isCoreModule ? null : isIncluded ? (
                                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent bg-green-100 text-green-800">
                                                {t('included') || 'Dahil'}
                                            </span>
                                        ) : (
                                            <Badge variant="outline" className="gap-1 text-violet-600 border-violet-200 bg-violet-50">
                                                Premium
                                            </Badge>
                                        )}
                                    </div>
                                    <CardDescription className="line-clamp-2">
                                        {t(module.descriptionKey) || module.descriptionKey}
                                    </CardDescription>

                                    <div className="mt-4 flex items-center gap-2 text-sm font-medium">
                                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                                        <span className={isActive ? 'text-green-600' : 'text-gray-500'}>
                                            {isActive ? t('active') : t('inactive')}
                                        </span>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-0 mt-auto">
                                    {isAccessGranted ? (
                                        <Button
                                            onClick={() => handleManage(module.id)}
                                            className="flex-1 h-9 text-xs font-medium bg-black text-white hover:bg-zinc-800 rounded-full shadow-sm"
                                            disabled={!isActive}
                                        >
                                            {language === 'tr' ? 'Yönet' : 'Manage'}
                                            <ArrowRight className="w-3 h-3 ml-1.5" />
                                        </Button>
                                    ) : (
                                        <Button
                                            className="w-full gap-2"
                                            variant="secondary"
                                            onClick={() => handleRequest(module.id)}
                                            disabled={isLoading === module.id}
                                        >
                                            {isLoading === module.id ? "..." : (t('requestAccess') || "Talep Oluştur")}
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => {
                                            setSelectedModuleId(module.id)
                                            setIsDetailsOpen(true)
                                        }}
                                    >
                                        {language === 'tr' ? 'Detaylar' : 'Details'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                <div className="flex flex-col gap-4 pt-4">
                    {ORDERED_MODULES.map((module) => {
                        const isIncluded = isModuleIncluded(module.id)
                        const isActive = module.isCore ? true : (moduleStates[module.id] || false)
                        const isSuperAdmin = role === 'SUPER_ADMIN'
                        const isCoreModule = module.isCore
                        const isAccessGranted = isSuperAdmin || isIncluded || isActive
                        const IconComponent = ICON_MAP[module.icon as keyof typeof ICON_MAP] || MessageSquare

                        return (
                            <div key={module.id} className={`flex items-center p-4 border rounded-xl gap-4 bg-white dark:bg-zinc-950 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900 ${!isAccessGranted ? 'opacity-90' : ''}`}>
                                <div className={`p-3 rounded-lg flex-shrink-0 ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                                    <IconComponent className="w-6 h-6" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-semibold text-base">{t(module.nameKey) || module.nameKey}</h3>
                                        {isCoreModule ? (
                                            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                                                {t('coreModule') || 'Temel'}
                                            </Badge>
                                        ) : isIncluded ? (
                                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                                                {t('included') || 'Dahil'}
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-violet-600 border-violet-200 bg-violet-50">
                                                Premium
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                        {t(module.descriptionKey) || module.descriptionKey}
                                    </p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-sm font-medium mr-4 hidden md:flex">
                                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                                        <span className={isActive ? 'text-green-600' : 'text-gray-500'}>
                                            {isActive ? t('active') : t('inactive')}
                                        </span>
                                    </div>

                                    {/* Switch or Lock */}
                                    <div className="flex items-center">
                                        {isCoreModule ? (
                                            <div className="w-10 h-6 flex items-center justify-center">
                                                <Lock className="w-4 h-4 text-gray-400 opacity-50" />
                                            </div>
                                        ) : isAccessGranted ? (
                                            <Switch
                                                checked={isActive}
                                                onCheckedChange={(checked) => handleToggle(module.id, checked)}
                                                disabled={isLoading === module.id}
                                            />
                                        ) : (
                                            <Lock className="w-5 h-5 text-muted-foreground" />
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 pl-4 border-l">
                                        {isAccessGranted ? (
                                            <Button
                                                onClick={() => handleManage(module.id)}
                                                size="sm"
                                                className="h-9 bg-black text-white hover:bg-zinc-800 rounded-full px-4"
                                                disabled={!isActive}
                                            >
                                                {language === 'tr' ? 'Yönet' : 'Manage'}
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleRequest(module.id)}
                                                disabled={isLoading === module.id}
                                            >
                                                {isLoading === module.id ? "..." : (t('requestAccess') || "Talep Oluştur")}
                                            </Button>
                                        )}

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9"
                                            onClick={() => {
                                                setSelectedModuleId(module.id)
                                                setIsDetailsOpen(true)
                                            }}
                                        >
                                            <Info className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <ModuleDetailsDialog
                isOpen={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
                selectedModuleId={selectedModuleId}
                moduleStates={moduleStates}
                onManage={handleManage}
                registryModules={getAllRegistryModules()}
                firestoreMap={MODULE_FIRESTORE_MAP}
                iconMap={ICON_MAP}
            />
        </div>
    )
}
