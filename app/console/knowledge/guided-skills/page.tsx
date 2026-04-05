"use client"

import { useAuth } from "@/context/AuthContext"
import { GuidedSkillsContent } from "@/components/knowledge/content/guided-skills-content"

export default function KnowledgeGuidedSkillsPage() {
    const { user } = useAuth()

    if (!user) return null

    return <GuidedSkillsContent userId={user.uid} />
}
