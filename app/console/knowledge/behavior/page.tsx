"use client"

import { useAuth } from "@/context/AuthContext"
import { KnowledgeBehaviorContent } from "@/components/knowledge/content/knowledge-behavior-content"

// Force rebuild
export default function KnowledgeBehaviorPage() {
    const { user } = useAuth()

    if (!user) return null

    return <KnowledgeBehaviorContent userId={user.uid} />
}
