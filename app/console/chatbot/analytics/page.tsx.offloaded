"use client"

import { useState, useEffect } from "react"
import { AnalyticsContent } from "@/components/analytics-content"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getExperienceState, UserContext, OnboardingStatus } from "@/lib/experience-orchestrator"
import { getUIExperienceAction, isEmptyStateAction, isModalAction } from "@/lib/experience-ui-adapter"
import { extractEntitlementsFromDoc } from "@/lib/entitlements-normalization"
import { getTrialDaysRemaining } from "@/lib/entitlements"
import { PricingModal } from "@/components/pricing-modal"
import { PageAccessGuard } from "@/components/page-access-guard"
import { Loader2 } from "lucide-react"

export default function AnalyticsPage() {
    const { user } = useAuth()
    const { language } = useLanguage()
    const [userContext, setUserContext] = useState<UserContext | null>(null)
    const [hasData, setHasData] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
    const [upgradeModalData, setUpgradeModalData] = useState<any>(null)

    // Fetch user context
    useEffect(() => {
        if (!user) return

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

                const entitlements = extractEntitlementsFromDoc(user.uid, data)
                const daysLeft = getTrialDaysRemaining(entitlements)

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

                // Check if analytics has underlying conversation data
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
                    console.error("Error checking analytics conversation data:", error)
                    setHasData(true)
                }

                setIsLoading(false)
            } catch (error) {
                console.error("Error fetching analytics data:", error)
                setIsLoading(false)
            }
        }

        fetchData()
    }, [user])

    // Get experience state
    const experienceState = userContext
        ? getExperienceState(userContext, { moduleId: 'analytics', hasData }, language === 'tr' ? 'tr' : 'en')
        : null

    const uiAction = experienceState ? getUIExperienceAction(experienceState) : null

    // Handle upgrade modal (MUST be before conditional returns)
    useEffect(() => {
        if (uiAction && isModalAction(uiAction)) {
            setUpgradeModalData(uiAction.prompt)
            setIsPricingModalOpen(true)
        }
    }, [uiAction])

    if (!user) return null

    // Loading state
    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Empty state
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

    return (
        <PageAccessGuard pageId="analytics">
            <>
                <AnalyticsContent />

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
        </PageAccessGuard>
    )
}
