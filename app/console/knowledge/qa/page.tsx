"use client"

import { useAuth } from "@/context/AuthContext"
import { KnowledgeQaContent } from "@/components/knowledge/content/knowledge-qa-content"

export default function KnowledgeQAPage() {
    const { user } = useAuth()

    if (!user) return null

    return <KnowledgeQaContent userId={user.uid} />
}
