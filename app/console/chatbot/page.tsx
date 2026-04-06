"use client"

import { useState, useEffect } from "react"
import { DashboardStats } from "@/components/dashboard-stats";
import { useAuth } from "@/context/AuthContext";
import { SuperAdminDashboard } from "@/components/super-admin-dashboard";
import { useLanguage } from "@/context/LanguageContext";
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getExperienceState, UserContext, OnboardingStatus } from "@/lib/experience-orchestrator"
import { getUIExperienceAction, isModalAction } from "@/lib/experience-ui-adapter"
import { extractEntitlementsFromDoc } from "@/lib/entitlements-normalization"
import { getTrialDaysRemaining } from "@/lib/entitlements"
import { PricingModal } from "@/components/pricing-modal"
import { Loader2 } from "lucide-react"

export default function ChatbotConsolePage() {
    const { role, user } = useAuth()
    const { t, language } = useLanguage()
    const [userContext, setUserContext] = useState<UserContext | null>(null)
    const [hasData, setHasData] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
    const [upgradeModalData, setUpgradeModalData] = useState<any>(null)

    // Fetch user context and check if dashboard has data
    useEffect(() => {
        if (!user || role === 'SUPER_ADMIN') return

        const fetchData = async () => {
            try {
                const [userDoc, idToken] = await Promise.all([
                    getDoc(doc(db, "users", user.uid)),
                    user.getIdToken()
                ])
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

                // Check if dashboard has conversation data
                try {
                    const response = await fetch(`/api/chat-sessions?chatbotId=${encodeURIComponent(user.uid)}&limit=1`, {
                        headers: {
                            Authorization: `Bearer ${idToken}`
                        }
                    })

                    if (response.ok) {
                        const payload = await response.json()
                        const sessions = Array.isArray(payload?.sessions) ? payload.sessions : []
                        setHasData(sessions.length > 0)
                    } else {
                        // Avoid false empty-state when API is temporarily unavailable
                        setHasData(true)
                    }
                } catch (error) {
                    console.error("Error checking dashboard conversation data:", error)
                    setHasData(true)
                }

                setIsLoading(false)
            } catch (error) {
                console.error("Error fetching dashboard data:", error)
                setIsLoading(false)
            }
        }

        fetchData()
    }, [user, role])

    // Get experience state for dashboard
    const experienceState = userContext
        ? getExperienceState(userContext, { moduleId: 'dashboard', hasData }, language === 'tr' ? 'tr' : 'en')
        : null

    const uiAction = experienceState ? getUIExperienceAction(experienceState) : null

    const uiActionStr = uiAction ? JSON.stringify(uiAction) : null;
    
    // Handle upgrade modal action (MUST be before any conditional returns)
    useEffect(() => {
        if (!uiActionStr) return;
        const action = JSON.parse(uiActionStr);
        if (action && isModalAction(action)) {
            setUpgradeModalData((prev: any) => JSON.stringify(prev) === JSON.stringify(action.prompt) ? prev : action.prompt)
            setIsPricingModalOpen(true)
        }
    }, [uiActionStr])

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

    // Always render dashboard widgets, even when there is no conversation data.
    // Widgets already handle empty/zero states internally.
    return (
        <>
            <div className="p-8">
                <h2 className="text-3xl font-bold tracking-tight mb-4">{t('dashboardOverview')}</h2>
                <DashboardStats />
            </div>

            {/* Pricing Modal */}
            <PricingModal
                isOpen={isPricingModalOpen}
                onClose={() => {
                    setIsPricingModalOpen(false)
                    setUpgradeModalData(null)
                }}
                currentPlanId={userContext?.planId || 'starter'}
            />
        </>
    );
}
