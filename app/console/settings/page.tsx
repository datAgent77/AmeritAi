"use client"

import { redirect } from "next/navigation"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
    const router = useRouter()

    useEffect(() => {
        router.replace("/console/settings/subscription")
    }, [router])

    return null
}
