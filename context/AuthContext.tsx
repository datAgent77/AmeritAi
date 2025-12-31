"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { User, onAuthStateChanged } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, onSnapshot } from "firebase/firestore"

interface AuthContextType {
    user: User | null
    role: string | null
    enablePersonalShopper: boolean
    visiblePersonalShopper: boolean
    enableChatbot: boolean
    visibleChatbot: boolean
    enableCopywriter: boolean
    visibleCopywriter: boolean
    enableLeadCollection: boolean
    visibleLeadCollection: boolean
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
    enableLeadCollection: true,
    visibleLeadCollection: true,
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
    const [enableLeadCollection, setEnableLeadCollection] = useState(true)
    const [visibleLeadCollection, setVisibleLeadCollection] = useState(true)
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

        // Local variable to track the current snapshot unsubscribe function
        let unsubscribeSnapshot: (() => void) | null = null;

        // Subscribe to Firebase auth state changes
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            console.log("AuthProvider: Auth State Changed. User:", currentUser?.uid)

            // Clean up previous snapshot listener if it exists (e.g. user switching accounts)
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (currentUser) {
                // User is signed in - subscribe to Firestore document for real-time updates
                const userDocRef = doc(db, "users", currentUser.uid)

                unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
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

                    console.log(`AuthProvider: User Data Updated. ID: ${currentUser.uid}, Role: ${userRole}`)

                    // Merge Firestore data into user object to ensure 'industry' is available
                    // Merge Firestore data into user object to ensure 'industry' is available
                    // This is CRITICAL for the Modules page sector logic
                    // We must preserve the prototype to keep methods like getIdToken() working
                    const mergedUser: any = { ...currentUser, ...userData }
                    Object.setPrototypeOf(mergedUser, Object.getPrototypeOf(currentUser))

                    // Specific fix for industry: ensure it's on the top level of the user object if needed by consumers
                    if (userData.industry) {
                        mergedUser.industry = userData.industry
                    }

                    setUser(mergedUser as User)
                    setRole(userRole)

                    // Set flags based on userData (with defaults)
                    setEnableChatbot(userData.enableChatbot !== false)
                    setVisibleChatbot(userData.visibleChatbot !== false)
                    setEnablePersonalShopper(userData.enablePersonalShopper === true)
                    setVisiblePersonalShopper(userData.visiblePersonalShopper !== false)
                    setEnableCopywriter(userData.enableCopywriter !== false)
                    setVisibleCopywriter(userData.visibleCopywriter !== false)
                    setEnableLeadCollection(userData.enableLeadCollection !== false)
                    setVisibleLeadCollection(userData.visibleLeadCollection !== false)
                    setEnableVoiceAssistant(userData.enableVoiceAssistant === true)
                    setVisibleVoiceAssistant(userData.visibleVoiceAssistant !== false)
                    setEnableKnowledgeBase(userData.enableKnowledgeBase !== false)
                    setVisibleKnowledgeBase(userData.visibleKnowledgeBase !== false)
                    setEnableSalesOptimization(userData.enableSalesOptimization === true)
                    setVisibleSalesOptimization(userData.visibleSalesOptimization !== false)
                    setCanManageModules(userData.canManageModules === true || userRole === 'SUPER_ADMIN')

                    setLoading(false)
                }, (error) => {
                    console.error("AuthProvider: Firestore listener error", error)
                    // Fallback to basic auth user if Firestore fails (e.g. permission denied)
                    setUser(currentUser)
                    setLoading(false)
                })

            } else {
                // No user signed in
                setUser(null)
                setRole(null)
                setLoading(false)
            }
        })

        return () => {
            console.log("AuthProvider: Cleanup")
            unsubscribeAuth() // Changed from unsubscribe() to unsubscribeAuth() for correctness
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
            }
        }
    }, [pathname]) // Added pathname to dependency array to re-run effect if pathname changes

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
            enableLeadCollection,
            visibleLeadCollection,
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
