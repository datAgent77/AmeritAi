"use client"

import { GuidedSkillsContent } from "@/components/knowledge/content/guided-skills-content"

export default function TenantGuidedSkillsPage({ params }: { params: { userId: string } }) {
    return <GuidedSkillsContent userId={params.userId} />
}
