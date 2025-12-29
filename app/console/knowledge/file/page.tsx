"use client"

import { useAuth } from "@/context/AuthContext"
import { KnowledgeFileContent } from "@/components/knowledge/content/knowledge-file-content"

export default function KnowledgeFilePage() {
    const { user } = useAuth()

    if (!user) return null

    return <KnowledgeFileContent userId={user.uid} />
}
