"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { User, onAuthStateChanged } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

interface AuthContextType {
    user: User | null
    role: string | null
    enablePersonalShopper: boolean
    visiblePersonalShopper: boolean
    enableChatbot: boolean
    visibleChatbot: boolean
    enableCopywriter: boolean
    visibleCopywriter: boolean
    enableLeadFinder: boolean
    visibleLeadFinder: boolean
    enableVoiceAssistant: boolean
    visibleVoiceAssistant: boolean
    enableKnowledgeBase: boolean
    visibleKnowledgeBase: boolean
    enableSalesOptimization: boolean
    visibleSalesOptimization: boolean
    canManageModules: boolean
    loading: boolean
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    enablePersonalShopper: false,
    visiblePersonalShopper: true,
    enableChatbot: true,
    visibleChatbot: true,
    enableCopywriter: true,
    visibleCopywriter: true,
    enableLeadFinder: true,
    visibleLeadFinder: true,
    enableVoiceAssistant: false,
    visibleVoiceAssistant: true,
    enableKnowledgeBase: true,
    visibleKnowledgeBase: true,
    enableSalesOptimization: false,
    visibleSalesOptimization: true,
    canManageModules: false,
    loading: true,
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [role, setRole] = useState<string | null>(null)
    const [enablePersonalShopper, setEnablePersonalShopper] = useState(false)
    const [visiblePersonalShopper, setVisiblePersonalShopper] = useState(true)
    const [enableChatbot, setEnableChatbot] = useState(true)
    const [visibleChatbot, setVisibleChatbot] = useState(true)
    const [enableCopywriter, setEnableCopywriter] = useState(true)
    const [visibleCopywriter, setVisibleCopywriter] = useState(true)
    const [enableLeadFinder, setEnableLeadFinder] = useState(true)
    const [visibleLeadFinder, setVisibleLeadFinder] = useState(true)
    const [enableVoiceAssistant, setEnableVoiceAssistant] = useState(false)
    const [visibleVoiceAssistant, setVisibleVoiceAssistant] = useState(true)
    const [enableKnowledgeBase, setEnableKnowledgeBase] = useState(true)
    const [visibleKnowledgeBase, setVisibleKnowledgeBase] = useState(true)
    const [enableSalesOptimization, setEnableSalesOptimization] = useState(false)
    const [visibleSalesOptimization, setVisibleSalesOptimization] = useState(true)
    const [canManageModules, setCanManageModules] = useState(false)
    const [loading, setLoading] = useState(true)
    const pathname = usePathname()

    useEffect(() => {
        // Skip auth for public widget routes - they don't need user context
        if (pathname?.startsWith('/chatbot-view') || pathname?.startsWith('/widget-test')) {
            console.log("AuthProvider: Skipping auth for widget view")
            setLoading(false)
            return
        }

        console.log("AuthProvider: Setting up auth listener")

        // Subscribe to Firebase auth state changes
        // NO setPersistence here - Firebase uses browserLocalPersistence by default
        // setPersistence should ONLY be called in login page before signIn
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            console.log("AuthProvider: Auth State Changed. User:", currentUser?.uid)

            try {
                if (currentUser) {
                    // User is signed in - fetch additional data from Firestore
                    const userDocRef = doc(db, "users", currentUser.uid)

                    try {
                        const docSnap = await getDoc(userDocRef)
                        let userRole = 'USER'
                        let userData: any = {}

                        if (docSnap.exists()) {
                            userData = docSnap.data()
                            userRole = userData.role || 'USER'
                        }

                        // Super admin override (Case-insensitive)
                        if (currentUser.email?.toLowerCase() === 'yasincelenkk@gmail.com') {
                            userRole = 'SUPER_ADMIN'
                        }

                        console.log(`AuthProvider: User ID: ${currentUser.uid}, Email: ${currentUser.email}, Assigned Role: ${userRole}`)

                        setUser(currentUser)
                        setRole(userRole)

                        // Set flags based on userData (with defaults)
                        setEnableChatbot(userData.enableChatbot !== false)
                        setVisibleChatbot(userData.visibleChatbot !== false)
                        setEnablePersonalShopper(userData.enablePersonalShopper === true)
                        setVisiblePersonalShopper(userData.visiblePersonalShopper !== false)
                        setEnableCopywriter(userData.enableCopywriter !== false)
                        setVisibleCopywriter(userData.visibleCopywriter !== false)
                        setEnableLeadFinder(userData.enableLeadFinder !== false)
                        setVisibleLeadFinder(userData.visibleLeadFinder !== false)
                        setEnableVoiceAssistant(userData.enableVoiceAssistant === true)
                        setVisibleVoiceAssistant(userData.visibleVoiceAssistant !== false)
                        setEnableKnowledgeBase(userData.enableKnowledgeBase !== false)
                        setVisibleKnowledgeBase(userData.visibleKnowledgeBase !== false)
                        setEnableSalesOptimization(userData.enableSalesOptimization === true)
                        setVisibleSalesOptimization(userData.visibleSalesOptimization !== false)
                        setCanManageModules(userData.canManageModules === true || userRole === 'SUPER_ADMIN')
                    } catch (docErr) {
                        // Permission error is expected if Firestore rules don't allow user doc read
                        // Fallback role assignment handles this gracefully

                        // Fallback role assignment
                        let fallbackRole = 'USER'
                        if (currentUser.email?.toLowerCase() === 'yasincelenkk@gmail.com') {
                            fallbackRole = 'SUPER_ADMIN'
                        }

                        setUser(currentUser)
                        setRole(fallbackRole)
                        setCanManageModules(fallbackRole === 'SUPER_ADMIN')
                    }
                } else {
                    // No user signed in
                    setUser(null)
                    setRole(null)
                }
            } catch (err) {
                console.error("AuthProvider: Critical error", err)
                setUser(null)
                setRole(null)
            } finally {
                setLoading(false)
            }
        })

        // Cleanup on unmount
        return () => {
            console.log("AuthProvider: Cleanup")
            unsubscribe()
        }
    }, []) // Empty dependency - run once on mount

    return (
        <AuthContext.Provider value={{
            user,
            role,
            loading,
            enablePersonalShopper,
            visiblePersonalShopper,
            enableChatbot,
            visibleChatbot,
            enableCopywriter,
            visibleCopywriter,
            enableLeadFinder,
            visibleLeadFinder,
            enableVoiceAssistant,

            visibleVoiceAssistant,
            enableKnowledgeBase,
            visibleKnowledgeBase,
            enableSalesOptimization,
            visibleSalesOptimization,
            canManageModules
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
