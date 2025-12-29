"use client"

import { useAuth } from "@/context/AuthContext"
import { KnowledgeTextContent } from "@/components/knowledge/content/knowledge-text-content"

export default function KnowledgeTextPage() {
    const { user } = useAuth()

    if (!user) return null

    return <KnowledgeTextContent userId={user.uid} />
}
