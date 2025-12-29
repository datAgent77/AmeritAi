"use client"

import { useState, useEffect } from "react"
import { DashboardStats } from "@/components/dashboard-stats";
import { useAuth } from "@/context/AuthContext";
import { SuperAdminDashboard } from "@/components/super-admin-dashboard";
import { useLanguage } from "@/context/LanguageContext";
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getExperienceState, UserContext, OnboardingStatus } from "@/lib/experience-orchestrator"
import { getUIExperienceAction, isEmptyStateAction, isModalAction } from "@/lib/experience-ui-adapter"
import { extractEntitlementsFromDoc } from "@/lib/entitlements-normalization"
import { getTrialDaysRemaining } from "@/lib/entitlements"
import { UpgradeModal } from "@/components/upgrade-modal"
import { Loader2 } from "lucide-react"

export default function ChatbotConsolePage() {
    const { role, user } = useAuth()
    const { t, language } = useLanguage()
    const [userContext, setUserContext] = useState<UserContext | null>(null)
    const [hasData, setHasData] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
    const [upgradeModalData, setUpgradeModalData] = useState<any>(null)

    // Fetch user context and check if dashboard has data
    useEffect(() => {
        if (!user || role === 'SUPER_ADMIN') return

        const fetchData = async () => {
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid))
                const data = userDoc.data()

                if (!data) {
                    setIsLoading(false)
                    return
                }

                // Extract entitlements
                const entitlements = extractEntitlementsFromDoc(user.uid, data)
                const daysLeft = getTrialDaysRemaining(entitlements)

                // Build user context
                const context: UserContext = {
                    userId: user.uid,
                    planId: entitlements.planId,
                    sectorId: entitlements.sectorId,
                    onboardingStatus: (data.onboarding?.status || 'pending') as OnboardingStatus,
                    trialStatus: entitlements.trial.isActive ? 'active' : 'none',
                    daysLeftInTrial: daysLeft,
                    userActionCount: 0
                }

                setUserContext(context)

                // Check if dashboard has conversations/data
                // TODO: Implement actual data check (e.g., query conversations collection)
                // For now, assume has data
                setHasData(true)
                setIsLoading(false)
            } catch (error) {
                console.error("Error fetching dashboard data:", error)
                setIsLoading(false)
            }
        }

        fetchData()
    }, [user])

    // Get experience state for dashboard
    const experienceState = userContext
        ? getExperienceState(userContext, { moduleId: 'dashboard', hasData }, language === 'tr' ? 'tr' : 'en')
        : null

    const uiAction = experienceState ? getUIExperienceAction(experienceState) : null

    // Handle upgrade modal action (MUST be before any conditional returns)
    useEffect(() => {
        if (uiAction && isModalAction(uiAction)) {
            setUpgradeModalData(uiAction.prompt)
            setUpgradeModalOpen(true)
        }
    }, [uiAction])

    // Super admin dashboard
    if (role === 'SUPER_ADMIN') {
        return (
            <div className="p-8">
                <SuperAdminDashboard />
            </div>
        )
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Render empty state if action is show-empty-state
    const shouldShowEmptyState = uiAction && isEmptyStateAction(uiAction)

    if (shouldShowEmptyState) {
        return (
            <div className="p-8">
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <div className="max-w-md space-y-4">
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            {uiAction.config.title}
                        </h2>
                        <p className="text-muted-foreground">
                            {uiAction.config.description}
                        </p>
                        {uiAction.config.helperText && (
                            <p className="text-sm text-muted-foreground">
                                {uiAction.config.helperText}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Default: render dashboard normally (action type: 'none')
    return (
        <>
            <div className="p-8">
                <h2 className="text-3xl font-bold tracking-tight mb-4">{t('dashboardOverview')}</h2>
                <DashboardStats />
            </div>

            {/* Upgrade Modal */}
            {upgradeModalData && (
                <UpgradeModal
                    isOpen={upgradeModalOpen}
                    onClose={() => setUpgradeModalOpen(false)}
                    moduleName={upgradeModalData.title || 'Premium Feature'}
                    description={upgradeModalData.description || ''}
                />
            )}
        </>
    );
}
