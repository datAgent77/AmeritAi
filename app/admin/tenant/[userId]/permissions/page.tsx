"use client"

import { TenantPermissions } from "@/components/tenant-permissions"
import { useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2 } from "lucide-react"

interface TenantData {
    email: string
    role: string
    enablePersonalShopper?: boolean
    visiblePersonalShopper?: boolean
    enableChatbot?: boolean
    visibleChatbot?: boolean
    enableCopywriter?: boolean
    visibleCopywriter?: boolean
    enableLeadFinder?: boolean
    visibleLeadFinder?: boolean
    enableVoiceAssistant?: boolean
    visibleVoiceAssistant?: boolean
}

export default function TenantPermissionsPage({ params }: { params: { userId: string } }) {
    const [tenant, setTenant] = useState<TenantData | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadTenant = async () => {
            try {
                const userDoc = await getDoc(doc(db, "users", params.userId))
                if (userDoc.exists()) {
                    setTenant(userDoc.data() as TenantData)
                }
            } catch (error) {
                console.error("Error loading tenant:", error)
            } finally {
                setIsLoading(false)
            }
        }
        loadTenant()
    }, [params.userId])

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!tenant) {
        return <div className="p-8">Tenant not found</div>
    }

    return (
        <div className="p-8 space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Uygulama Erişimleri</h2>
                <p className="text-muted-foreground">
                    Tenant&apos;ın kullanabileceği modülleri ve araçları yönetin.
                </p>
            </div>

            <TenantPermissions
                tenant={tenant}
                userId={params.userId}
                onUpdate={(updated) => setTenant(prev => prev ? { ...prev, ...updated } : null)}
            />
        </div>
    )
}
