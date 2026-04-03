"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import type { OmniDirectoryAccountRecord } from "@/lib/omni/types"
import type { PartnerCapabilities } from "@/lib/management/types"

interface OmniAccountContextValue {
    accounts: OmniDirectoryAccountRecord[]
    activeAccountId: string | null
    activeAccount: OmniDirectoryAccountRecord | null
    canSwitchAccounts: boolean
    viewerCapabilities: PartnerCapabilities | null
    isLoading: boolean
    refreshAccounts: () => Promise<OmniDirectoryAccountRecord[]>
    selectAccount: (accountId: string) => boolean
}

const OmniAccountContext = createContext<OmniAccountContextValue | undefined>(undefined)

function getStorageKey(uid: string) {
    return `omni:selected-account:${uid}`
}

export function OmniAccountProvider({ children }: { children: React.ReactNode }) {
    const { user, role, hasOmniPermission } = useAuth()
    const [accounts, setAccounts] = useState<OmniDirectoryAccountRecord[]>([])
    const [activeAccountId, setActiveAccountId] = useState<string | null>(null)
    const [backendCanSwitchAccounts, setBackendCanSwitchAccounts] = useState(false)
    const [viewerCapabilities, setViewerCapabilities] = useState<PartnerCapabilities | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const canSwitchAccounts = hasOmniPermission("account.switch") && backendCanSwitchAccounts

    const refreshAccounts = async (): Promise<OmniDirectoryAccountRecord[]> => {
        if (!user) {
            setAccounts([])
            setActiveAccountId(null)
            setBackendCanSwitchAccounts(false)
            setViewerCapabilities(null)
            setIsLoading(false)
            return []
        }

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/directory/accounts", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load accounts")
            }

            const data = await response.json()
            const nextAccounts = Array.isArray(data.accounts) ? data.accounts : []
            const nextCanSwitchAccounts = data?.meta?.canSwitchAccounts === true
            setAccounts(nextAccounts)
            setBackendCanSwitchAccounts(nextCanSwitchAccounts)
            setViewerCapabilities(data?.meta?.viewerCapabilities || null)

            const storageKey = getStorageKey(user.uid)
            const storedAccountId = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null
            const storedAccount = nextAccounts.find((account: OmniDirectoryAccountRecord) => account.id === storedAccountId && account.omniEnabled)
            const firstOmniEnabled = nextAccounts.find((account: OmniDirectoryAccountRecord) => account.omniEnabled) || null
            const ownAccount = nextAccounts.find((account: OmniDirectoryAccountRecord) => account.id === user.uid) || null

            const resolvedActiveId = nextCanSwitchAccounts
                ? storedAccount?.id || firstOmniEnabled?.id || null
                : ownAccount?.id || user.uid

            setActiveAccountId(resolvedActiveId)
            if (typeof window !== "undefined" && resolvedActiveId) {
                localStorage.setItem(storageKey, resolvedActiveId)
            }
            return nextAccounts
        } catch (error) {
            console.error("Failed to load Omni accounts", error)
            setAccounts([])
            setBackendCanSwitchAccounts(false)
            setViewerCapabilities(null)
            setActiveAccountId(user.uid)
            return []
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        refreshAccounts()
    }, [user?.uid, role, canSwitchAccounts])

    const selectAccount = (accountId: string) => {
        if (!user) return false
        const account = accounts.find((item) => item.id === accountId)
        if (account && canSwitchAccounts && !account.omniEnabled) return false

        setActiveAccountId(account?.id || accountId)
        if (typeof window !== "undefined") {
            localStorage.setItem(getStorageKey(user.uid), account?.id || accountId)
        }
        return true
    }

    const activeAccount = useMemo(
        () => accounts.find((account) => account.id === activeAccountId) || null,
        [accounts, activeAccountId]
    )

    return (
        <OmniAccountContext.Provider
            value={{
                accounts,
                activeAccountId,
            activeAccount,
            canSwitchAccounts,
            viewerCapabilities,
            isLoading,
            refreshAccounts,
            selectAccount,
            }}
        >
            {children}
        </OmniAccountContext.Provider>
    )
}

export function useOmniAccount() {
    const context = useContext(OmniAccountContext)
    if (!context) {
        throw new Error("useOmniAccount must be used within OmniAccountProvider")
    }
    return context
}
