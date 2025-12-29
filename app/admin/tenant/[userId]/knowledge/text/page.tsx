"use client"

import { KnowledgeTextContent } from "@/components/knowledge/content/knowledge-text-content"

export default function TenantKnowledgeTextPage({ params }: { params: { userId: string } }) {
    return <KnowledgeTextContent userId={params.userId} />
}
