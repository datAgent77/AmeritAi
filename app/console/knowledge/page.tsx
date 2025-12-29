"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function KnowledgePage() {
    const router = useRouter()

    useEffect(() => {
        router.push("/console/knowledge/text")
    }, [router])

    return null
}
