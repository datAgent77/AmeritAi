"use client"

import { createContext, useContext, useEffect, useState, useMemo } from "react"
import { usePathname } from "next/navigation"
import { User, onAuthStateChanged, signOut } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, onSnapshot } from "firebase/firestore"
import { getPlanConfig, PlanConfig } from "@/lib/pricing-config"
import { installAuthDebugDump, recordAuthDebug } from "@/lib/auth-debug"
import { UserRole } from "@/lib/user-roles"
import { DEFAULT_PRODUCT_ENTITLEMENTS, ProductEntitlements, resolveChatbotEnabled, resolveCookieConsentEnabled, resolveOmniWorkspaceEnabled } from "@/lib/product-entitlements"
import { resolveVionTrialState } from "@/lib/subscription-access"

export type OmniPermission = string

// Extended user data interface
export interface UserData {
    planId: string
    subscriptionStatus: 'trial' | 'active' | 'cancelled' | 'expired'
    trialEndsAt: string | null
    billingCycle: 'monthly' | 'annual'
    industry?: string
    [key: string]: any
}

interface AuthContextType {
    user: User | null
    userData: UserData | null
    role: UserRole | null
    productEntitlements: ProductEntitlements
    omniPermissions: OmniPermission[]
    hasOmniPermission: (permission: OmniPermission) => boolean
    // Plan & Subscription
    planId: string
    planConfig: PlanConfig | null
    subscriptionStatus: 'trial' | 'active' | 'cancelled' | 'expired' | null
    isTrialExpired: boolean
    trialDaysLeft: number
    trialEndsAt: string | null
    isPaidPlan: boolean
    // Module flags (legacy support)
    enablePersonalShopper: boolean
    visiblePersonalShopper: boolean
    enableChatbot: boolean
    visibleChatbot: boolean
    enableCopywriter: boolean
    visibleCopywriter: boolean
    enableLeadCollection: boolean
    visibleLeadCollection: boolean
    enableOmniChannel: boolean
    visibleOmniChannel: boolean
    enableVoiceAssistant: boolean
    visibleVoiceAssistant: boolean
    enableKnowledgeBase: boolean
    visibleKnowledgeBase: boolean
    enableSalesOptimization: boolean
    visibleSalesOptimization: boolean
    enableDigitalWaiter: boolean
    visibleDigitalWaiter: boolean
    canManageModules: boolean
    loading: boolean
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userData: null,
    role: null,
    productEntitlements: DEFAULT_PRODUCT_ENTITLEMENTS,
    omniPermissions: [],
    hasOmniPermission: () => false,
    // Plan & Subscription defaults — intentionally empty to avoid flicker
    planId: '',
    planConfig: null,
    subscriptionStatus: null,
    isTrialExpired: false,
    trialDaysLeft: 0,
    trialEndsAt: null,
    isPaidPlan: false,
    // Module flags defaults
    enablePersonalShopper: false,
    visiblePersonalShopper: true,
    enableChatbot: true,
    visibleChatbot: true,
    enableCopywriter: false,
    visibleCopywriter: true,
    enableLeadCollection: false,
    visibleLeadCollection: true,
    enableOmniChannel: false,
    visibleOmniChannel: false,
    enableVoiceAssistant: false,
    visibleVoiceAssistant: true,
    enableKnowledgeBase: true,
    visibleKnowledgeBase: true,
    enableSalesOptimization: false,
    visibleSalesOptimization: true,
    enableDigitalWaiter: false,
    visibleDigitalWaiter: true,
    canManageModules: false,
    loading: true,
})

function resolveProductEntitlements(data: any, userRole: UserRole): ProductEntitlements {
    if (userRole === 'SUPER_ADMIN') {
        return {
            chatbot: true,
            omniChannel: false,
            cookieConsent: false,
            copywriter: false,
            leadFinder: false,
        }
    }

    const explicitEntitlements = data.productEntitlements || {}

    return {
        chatbot: resolveChatbotEnabled(data),
        omniChannel: resolveOmniWorkspaceEnabled(data, userRole),
        cookieConsent: resolveCookieConsentEnabled(data, userRole),
        copywriter: explicitEntitlements.copywriter === true,
        leadFinder: explicitEntitlements.leadFinder === true,
    }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [userData, setUserData] = useState<UserData | null>(null)
    const [role, setRole] = useState<UserRole | null>(null)
    const [productEntitlements, setProductEntitlements] = useState<ProductEntitlements>(DEFAULT_PRODUCT_ENTITLEMENTS)
    const [omniPermissions, setOmniPermissions] = useState<OmniPermission[]>([])
    // Plan states
    const [planId, setPlanId] = useState<string>('')
    const [subscriptionStatus, setSubscriptionStatus] = useState<'trial' | 'active' | 'cancelled' | 'expired' | null>(null)
    const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
    // Module flags
    const [enablePersonalShopper, setEnablePersonalShopper] = useState(false)
    const [visiblePersonalShopper, setVisiblePersonalShopper] = useState(true)
    const [enableChatbot, setEnableChatbot] = useState(true)
    const [visibleChatbot, setVisibleChatbot] = useState(true)
    const [enableCopywriter, setEnableCopywriter] = useState(false)
    const [visibleCopywriter, setVisibleCopywriter] = useState(true)
    const [enableLeadCollection, setEnableLeadCollection] = useState(false)
    const [visibleLeadCollection, setVisibleLeadCollection] = useState(true)
    const [enableOmniChannel, setEnableOmniChannel] = useState(false)
    const [visibleOmniChannel, setVisibleOmniChannel] = useState(false)
    const [enableVoiceAssistant, setEnableVoiceAssistant] = useState(false)
    const [visibleVoiceAssistant, setVisibleVoiceAssistant] = useState(true)
    const [enableKnowledgeBase, setEnableKnowledgeBase] = useState(true)
    const [visibleKnowledgeBase, setVisibleKnowledgeBase] = useState(true)
    const [enableSalesOptimization, setEnableSalesOptimization] = useState(false)
    const [visibleSalesOptimization, setVisibleSalesOptimization] = useState(true)
    const [enableDigitalWaiter, setEnableDigitalWaiter] = useState(false)
    const [visibleDigitalWaiter, setVisibleDigitalWaiter] = useState(true)
    const [canManageModules, setCanManageModules] = useState(false)
    const [loading, setLoading] = useState(true)
    const pathname = usePathname()

    // Computed values
    const planConfig = useMemo(() => getPlanConfig(planId) || null, [planId])
    
    const { isPaidPlan, isTrialExpired, trialDaysLeft } = useMemo(() => resolveVionTrialState({
        planId,
        subscriptionStatus,
        trialEndsAt,
    }), [planId, subscriptionStatus, trialEndsAt])

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        installAuthDebugDump()
        recordAuthDebug("auth_effect_start", { pathname })

        // For public widget/test routes, do NOT set up a Firestore snapshot
        // (no console data needed). Widget routes handle their own rendering.
        const isPublicWidgetRoute = pathname?.startsWith('/chatbot-view') || pathname?.startsWith('/widget-test')

        console.log("AuthProvider: Setting up auth listener")
        let unsubscribeSnapshot: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            console.log("AuthProvider: Auth State Changed. User:", currentUser?.uid)
            recordAuthDebug("auth_state_changed", {
                uid: currentUser?.uid || null,
                email: currentUser?.email || null
            })

            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (currentUser) {
                const userDocRef = doc(db, "users", currentUser.uid)

                // For public widget routes, skip Firestore subscription (no console data needed)
                if (isPublicWidgetRoute) {
                    setLoading(false)
                    return
                }

                unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
                    let userRole: UserRole = 'USER'
                    let data: any = {}

                    if (docSnap.exists()) {
                        data = docSnap.data()
                        const roleFromData = typeof data.role === "string" ? data.role.toUpperCase() : "USER"
                        userRole = (roleFromData === "SUPER_ADMIN" || roleFromData === "AGENCY_ADMIN" || roleFromData === "TENANT_ADMIN" || roleFromData === "AGENT")
                            ? roleFromData
                            : "USER"
                    }

                    // Super admin override (client-side convenience). Configure via
                    // NEXT_PUBLIC_SUPER_ADMIN_EMAILS (comma-separated). The authoritative
                    // role still comes from the Firestore user doc (honored server-side).
                    const superAdminEmails = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || '')
                        .split(',')
                        .map((e) => e.trim().toLowerCase())
                        .filter(Boolean)
                    if (currentUser.email && superAdminEmails.includes(currentUser.email.toLowerCase())) {
                        userRole = 'SUPER_ADMIN'
                    }

                    console.log(`AuthProvider: User Data Updated. ID: ${currentUser.uid}, Role: ${userRole}, Plan: ${data.planId || 'starter'}`)

                    // Merge Firestore data into user object
                    const mergedUser: any = { ...currentUser, ...data }
                    Object.setPrototypeOf(mergedUser, Object.getPrototypeOf(currentUser))

                    if (data.industry) {
                        mergedUser.industry = data.industry
                    }

                    console.log("AuthContext Update - PlanID from Firestore:", data.planId)
                    recordAuthDebug("auth_user_snapshot_data", {
                        uid: currentUser.uid,
                        role: userRole,
                        planId: data.planId || null,
                        isActive: data.isActive ?? null,
                        status: data.status ?? null,
                        isDeleted: data.isDeleted ?? null
                    })

                    setUser(mergedUser as User)
                    setUserData(data as UserData)
                    setRole(userRole)

                    const resolvedProductEntitlements = resolveProductEntitlements(data, userRole)
                    setProductEntitlements(resolvedProductEntitlements)
                    setOmniPermissions([])

                    // Set plan & subscription data
                    setPlanId(data.planId || 'starter')
                    setSubscriptionStatus(data.subscriptionStatus || 'trial')
                    setTrialEndsAt(data.trialEndsAt || null)

                    // Set module flags (legacy support)
                    setEnableChatbot(resolvedProductEntitlements.chatbot)
                    setVisibleChatbot(data.visibleChatbot ?? resolvedProductEntitlements.chatbot)
                    setEnablePersonalShopper(data.enablePersonalShopper === true)
                    setVisiblePersonalShopper(data.visiblePersonalShopper !== false)
                    setEnableCopywriter(resolvedProductEntitlements.copywriter)
                    setVisibleCopywriter(data.visibleCopywriter !== false)
                    setEnableLeadCollection(resolvedProductEntitlements.leadFinder)
                    setVisibleLeadCollection(data.visibleLeadCollection !== false)
                    setEnableOmniChannel(resolvedProductEntitlements.omniChannel)
                    setVisibleOmniChannel(data.visibleOmniChannel ?? resolvedProductEntitlements.omniChannel)
                    setEnableVoiceAssistant(data.enableVoiceAssistant === true)
                    setVisibleVoiceAssistant(data.visibleVoiceAssistant !== false)
                    setEnableKnowledgeBase(data.enableKnowledgeBase !== false)
                    setVisibleKnowledgeBase(data.visibleKnowledgeBase !== false)
                    setEnableSalesOptimization(data.enableSalesOptimization === true)
                    setVisibleSalesOptimization(data.visibleSalesOptimization !== false)
                    setEnableDigitalWaiter(data.enableDigitalWaiter === true)
                    setVisibleDigitalWaiter(data.visibleDigitalWaiter !== false)
                    setCanManageModules(data.canManageModules === true || userRole === 'SUPER_ADMIN')

                    setLoading(false)
                }, (error) => {
                    console.error("AuthProvider: Firestore listener error", error)
                    recordAuthDebug("auth_user_snapshot_error", {
                        uid: currentUser.uid,
                        error: error instanceof Error ? error.message : String(error)
                    })
                    setUser(currentUser)
                    setLoading(false)
                })

            } else {
                // No user signed in
                recordAuthDebug("auth_state_no_user")
                setUser(null)
                setUserData(null)
                setRole(null)
                setPlanId('')
                setSubscriptionStatus('trial')
                setTrialEndsAt(null)
                setProductEntitlements(DEFAULT_PRODUCT_ENTITLEMENTS)
                setOmniPermissions([])
                setEnableOmniChannel(false)
                setVisibleOmniChannel(false)
                setLoading(false)
            }
        })

        return () => {
            console.log("AuthProvider: Cleanup")
            recordAuthDebug("auth_effect_cleanup", { pathname })
            unsubscribeAuth()
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
            }
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // === EMAIL VERIFICATION GATE ===
    // Block console/admin access for accounts whose email is not verified. This
    // runs on every navigation + auth/userData change so it cannot be bypassed by
    // signup auto-login, the partner login form, or an existing session (the
    // previous gap). "Verified" stays consistent with the login page's own logic:
    // Firebase emailVerified, OR a Firestore mirror/bypass marker, OR the global
    // signup-bypass env flag. emailVerified is read from auth.currentUser (the
    // authoritative source) because the merged context user can lose the getter.
    useEffect(() => {
        if (loading || !user) return

        const isProtectedAppRoute =
            !!pathname && (pathname.startsWith("/console") || pathname.startsWith("/admin"))
        if (!isProtectedAppRoute) return

        const bypassEnv =
            process.env.NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_BYPASS_NEW_SIGNUPS === "true"
        const fbUser = auth.currentUser
        const isEmailVerified =
            fbUser?.emailVerified === true ||
            (userData as any)?.emailVerified === true ||
            (userData as any)?.emailVerificationBypass?.enabled === true ||
            bypassEnv

        if (!isEmailVerified) {
            recordAuthDebug("auth_block_unverified_email", { uid: fbUser?.uid || null })
            void signOut(auth).finally(() => {
                if (typeof window !== "undefined") {
                    window.location.replace("/login?verify=required")
                }
            })
        }
    }, [user, userData, pathname, loading])

    return (
        <AuthContext.Provider value={{
            user,
            userData,
            role,
            productEntitlements,
            omniPermissions,
            hasOmniPermission: (permission: OmniPermission) => omniPermissions.includes(permission),
            // Plan & Subscription
            planId,
            planConfig,
            subscriptionStatus,
            isTrialExpired,
            trialDaysLeft,
            trialEndsAt,
            isPaidPlan,
            // Module flags
            loading,
            enablePersonalShopper,
            visiblePersonalShopper,
            enableChatbot,
            visibleChatbot,
            enableCopywriter,
            visibleCopywriter,
            enableLeadCollection,
            visibleLeadCollection,
            enableOmniChannel,
            visibleOmniChannel,
            enableVoiceAssistant,
            visibleVoiceAssistant,
            enableKnowledgeBase,
            visibleKnowledgeBase,
            enableSalesOptimization,
            visibleSalesOptimization,
            enableDigitalWaiter,
            visibleDigitalWaiter,
            canManageModules
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
