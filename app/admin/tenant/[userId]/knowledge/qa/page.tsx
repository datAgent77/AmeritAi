"use client"

import { KnowledgeQaContent } from "@/components/knowledge/content/knowledge-qa-content"

export default function TenantKnowledgeQaPage({ params }: { params: { userId: string } }) {
    return <KnowledgeQaContent userId={params.userId} />
}
