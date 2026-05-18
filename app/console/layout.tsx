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
import { ThemeProvider } from "next-themes"
import { TrialExpiredOverlay } from "@/components/trial-expired-overlay"
import { recordAuthDebug } from "@/lib/auth-debug"
import { shouldShowTrialExpiredOverlay } from "@/lib/subscription-access"

import { AlertTriangle, LogOut, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"

function ConsoleLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, role, userData, productEntitlements, loading: authLoading, isTrialExpired, isPaidPlan, trialDaysLeft, planId, subscriptionStatus } = useAuth()
    const { language, t } = useLanguage() // Get t function
    const router = useRouter()
    const pathname = usePathname()
    const [userContext, setUserContext] = useState<UserContext | null>(null)
    const [isInitializing, setIsInitializing] = useState(true)
    const [isTerminated, setIsTerminated] = useState(false)
    const [hasNoEnabledProducts, setHasNoEnabledProducts] = useState(false)

    useEffect(() => {
        if (authLoading) return
        setHasNoEnabledProducts(false)
        if (role === "SUPER_ADMIN") {
            router.replace("/admin")
            return
        }
        if (role === "AGENCY_ADMIN") {
            router.replace("/agency")
            return
        }
        if (role !== "AGENT" && productEntitlements.chatbot === false) {
            setHasNoEnabledProducts(true)
            setIsInitializing(false)
            return
        }
        if (role === "AGENT") {
            const assignedTenantId = typeof userData?.agentTenantId === "string" ? userData.agentTenantId.trim() : ""
            if (assignedTenantId) {
                router.replace(`/admin/tenant/${assignedTenantId}/chatbot/chats`)
                return
            }
            const restrictedPrefixes = [
                "/console/knowledge",
                "/console/modules",
                "/console/chatbot/widget",
                "/console/chatbot/integration",
            ]
            const isRestricted = restrictedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
            if (isRestricted) {
                router.replace("/console/chatbot/chats")
            }
        }
    }, [authLoading, productEntitlements, role, router, pathname, userData])

    // Fetch user data and build context
    useEffect(() => {
        if (authLoading) return
        if (!user) {
            setIsInitializing(false)
            return
        }
        if (role === "SUPER_ADMIN" || role === "AGENCY_ADMIN" || role === "AGENT") {
            setIsInitializing(false)
            return
        }

        const initializeFromProfileData = (data: any) => {
            recordAuthDebug("console_profile_data", {
                uid: user.uid,
                status: data.status ?? null,
                isDeleted: data.isDeleted ?? null,
                isActive: data.isActive ?? null
            })

            // Check termination status
            if (data.status === 'archived' || data.status === 'deleted' || data.isDeleted === true) {
                recordAuthDebug("console_profile_terminated", {
                    uid: user.uid,
                    status: data.status ?? null,
                    isDeleted: data.isDeleted ?? null
                })
                setIsTerminated(true)
                setIsInitializing(false)
                return
            }

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
        }

        if (userData && Object.keys(userData).length > 0) {
            recordAuthDebug("console_profile_using_auth_context", { uid: user.uid })
            initializeFromProfileData(userData)
            return
        }

        const initialize = async () => {
            try {
                recordAuthDebug("console_profile_fetch_start", { uid: user.uid })
                const token = await user.getIdToken();
                const response = await fetch("/api/console/user-profile", {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                recordAuthDebug("console_profile_fetch_response", {
                    uid: user.uid,
                    status: response.status,
                    ok: response.ok
                })

                if (!response.ok) {
                    if (response.status === 404) {
                        console.warn("User document not found for:", user.uid)
                        recordAuthDebug("console_profile_missing_user_doc", { uid: user.uid })
                        setIsInitializing(false)
                        return
                    }
                    throw new Error("Failed to fetch user data")
                }

                const data = await response.json();
                initializeFromProfileData(data)
            } catch (error) {
                console.error("Error initializing console:", error)
                recordAuthDebug("console_profile_fetch_error", {
                    uid: user.uid,
                    error: error instanceof Error ? error.message : String(error)
                })
                setIsInitializing(false)
            }
        }

        initialize()
    }, [user, userData, authLoading, role, router])

    const handleLogout = async () => {
        recordAuthDebug("console_manual_logout", { pathname })
        await signOut(auth)
        router.push("/login")
    }

    // Show loading while initializing
    if (isInitializing || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f4f6f8]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (role === "SUPER_ADMIN" || role === "AGENCY_ADMIN") {
        return null
    }

    if (hasNoEnabledProducts) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8] px-6">
                <div className="max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {language === "tr" ? "Uygulama erişimi kapalı" : "Application access disabled"}
                    </h1>
                    <p className="mt-3 text-sm text-muted-foreground">
                        {language === "tr"
                            ? "Bu hesap için açık bir Vion uygulaması bulunmuyor. Erişim için yöneticinizle iletişime geçin."
                            : "No Vion application is enabled for this account. Contact your administrator for access."}
                    </p>
                    <Button onClick={handleLogout} variant="outline" className="mt-6">
                        <LogOut className="mr-2 h-4 w-4" />
                        {language === "tr" ? "Çıkış Yap" : "Sign Out"}
                    </Button>
                </div>
            </div>
        )
    }

    // Show Termination Modal
    if (isTerminated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f4f6f8] p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {language === 'tr' ? 'Hesabınız Sonlandırıldı' : 'Account Terminated'}
                        </h2>
                        <p className="text-gray-500">
                            {language === 'tr' 
                                ? 'Bu hesap arşivlenmiş veya silinmiştir. Yeniden aktifleştirmek için lütfen destek ekibimizle iletişime geçin.'
                                : 'This account has been archived or deleted. Please contact our support team to reactivate.'}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <Button 
                            variant="outline" 
                            className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => window.location.href = 'mailto:info@getvion.com'}
                        >
                            <Mail className="w-4 h-4" />
                            {language === 'tr' ? 'Destek ile İletişime Geç' : 'Contact Support'}
                        </Button>
                        
                        <Button 
                            onClick={handleLogout}
                            variant="ghost" 
                            className="w-full gap-2 text-gray-500 hover:text-gray-900"
                        >
                            <LogOut className="w-4 h-4" />
                            {language === 'tr' ? 'Çıkış Yap' : 'Sign Out'}
                        </Button>
                    </div>
                </div>
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
        <ThemeProvider forcedTheme="light" attribute="class" storageKey="console-theme" enableSystem={false} disableTransitionOnChange>
            <SidebarProvider>
                <div className="flex min-h-screen w-full bg-[#f4f6f8]">
                    {/* Sidebar - full height on left */}
                    <ConsoleSidebar 
                        sectorId={userContext?.sectorId} 
                        daysLeft={trialDaysLeft}
                        planId={planId}
                        isTrial={subscriptionStatus === 'trial'}
                    />

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
                        {/* Trial Expiration Guard */}
                        {(() => {
                            const shouldShowOverlay = shouldShowTrialExpiredOverlay({
                                isTrialExpired,
                                subscriptionStatus,
                                pathname,
                            })

                            if (!shouldShowOverlay) return null
                            return <TrialExpiredOverlay />
                        })()}
                        
                        <main className="flex-1 overflow-y-auto bg-background relative">
                            {children}
                        </main>
                    </div>
                </div>
            </SidebarProvider>
        </ThemeProvider>
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
