"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { ConsoleSidebar } from "@/components/console-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AuthGuard } from "@/components/auth-guard"
import { LanguageProvider, useLanguage } from "@/context/LanguageContext"
import { AnnouncementBanner } from "@/components/announcement-banner"
import { OnboardingBanner } from "@/components/onboarding-banner"
import { UpgradeBanner } from "@/components/upgrade-banner"
import { useAuth } from "@/context/AuthContext"
import { Loader2 } from "lucide-react"
import { getExperienceState, needsOnboardingRedirect, UserContext, OnboardingStatus } from "@/lib/experience-orchestrator"
import { getUIExperienceAction } from "@/lib/experience-ui-adapter"
import { extractEntitlementsFromDoc } from "@/lib/entitlements-normalization"
import { getTrialDaysRemaining } from "@/lib/entitlements"

function ConsoleLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth()
    const { language } = useLanguage()
    const router = useRouter()
    const pathname = usePathname()
    const [userContext, setUserContext] = useState<UserContext | null>(null)
    const [isInitializing, setIsInitializing] = useState(true)

    // Fetch user data and build context
    useEffect(() => {
        if (authLoading) return
        if (!user) {
            setIsInitializing(false)
            return
        }

        const initialize = async () => {
            try {
                const token = await user.getIdToken();
                const response = await fetch("/api/console/user-profile", {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        console.warn("User document not found for:", user.uid)
                        setIsInitializing(false)
                        return
                    }
                    throw new Error("Failed to fetch user data")
                }

                const data = await response.json();

                // Extract entitlements
                const entitlements = extractEntitlementsFromDoc(user.uid, data)

                // Calculate trial days remaining
                const daysLeft = getTrialDaysRemaining(entitlements)

                // Build user context for orchestrator
                const context: UserContext = {
                    userId: user.uid,
                    planId: entitlements.planId,
                    sectorId: entitlements.sectorId,
                    onboardingStatus: (data.onboarding?.status || 'pending') as OnboardingStatus,
                    trialStatus: entitlements.trial.isActive ? 'active' : 'none',
                    daysLeftInTrial: daysLeft,
                    userActionCount: 0 // TODO: Track actual action count
                }

                // Check if needs onboarding redirect
                if (needsOnboardingRedirect(context)) {
                    router.replace("/onboarding")
                    return
                }

                setUserContext(context)
                setIsInitializing(false)
            } catch (error) {
                console.error("Error initializing console:", error)
                setIsInitializing(false)
            }
        }

        initialize()
    }, [user, authLoading, router])

    // Show loading while initializing
    if (isInitializing || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f4f6f8]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    // Get experience state
    const experienceState = userContext
        ? getExperienceState(userContext, {}, language === 'tr' ? 'tr' : 'en')
        : null

    const uiAction = experienceState ? getUIExperienceAction(experienceState) : null

    // Determine which banners to show
    const showOnboardingSoftBanner = userContext?.onboardingStatus === 'completed_soft'
    const showUpgradeBanner = uiAction?.type === 'show-upgrade-banner'

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-[#f4f6f8]">
                {/* Sidebar - full height on left */}
                <ConsoleSidebar sectorId={userContext?.sectorId} />

                {/* Right side: Banners + Header + Content */}
                <div className="flex flex-col flex-1 min-w-0">
                    {/* Onboarding soft reminder */}
                    {showOnboardingSoftBanner && (
                        <OnboardingBanner />
                    )}

                    {/* Upgrade banner (trial expiring, etc) */}
                    {showUpgradeBanner && uiAction.type === 'show-upgrade-banner' && (
                        <UpgradeBanner prompt={uiAction.prompt} />
                    )}

                    {/* Announcement banner */}
                    <AnnouncementBanner />

                    {/* Header */}
                    <SiteHeader />

                    {/* Main content */}
                    <main className="flex-1 overflow-y-auto bg-[#f4f6f8] relative">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}

export default function ConsoleLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthGuard>
            <LanguageProvider>
                <ConsoleLayoutContent>
                    {children}
                </ConsoleLayoutContent>
            </LanguageProvider>
        </AuthGuard>
    )
}
