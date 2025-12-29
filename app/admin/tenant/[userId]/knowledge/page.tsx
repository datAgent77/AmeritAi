"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function TenantKnowledgePage({ params }: { params: { userId: string } }) {
    const router = useRouter()

    useEffect(() => {
        router.push(`/admin/tenant/${params.userId}/knowledge/text`)
    }, [router, params.userId])

    return null
}
