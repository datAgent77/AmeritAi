"use client"

import { useAuth } from "@/context/AuthContext"
import { KnowledgeUrlContent } from "@/components/knowledge/content/knowledge-url-content"

export default function KnowledgeUrlPage() {
    const { user } = useAuth()

    if (!user) return null

    return <KnowledgeUrlContent userId={user.uid} />
}
