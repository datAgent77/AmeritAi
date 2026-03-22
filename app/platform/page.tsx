"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

export default function PlatformPage() {
    const router = useRouter()
    const { role, loading } = useAuth()

    useEffect(() => {
        if (loading) return

        const normalizedRole = typeof role === "string" ? role.toUpperCase() : ""
        if (normalizedRole === "SUPER_ADMIN") {
            router.replace("/console/chatbot")
            return
        }
        if (normalizedRole === "AGENCY_ADMIN") {
            router.replace("/agency")
            return
        }

        router.replace("/console/chatbot")
    }, [router, role, loading])

    return (
        <div className="flex h-[80vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    )
}
