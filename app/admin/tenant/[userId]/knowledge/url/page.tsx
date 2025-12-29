"use client"

import { KnowledgeUrlContent } from "@/components/knowledge/content/knowledge-url-content"

export default function TenantKnowledgeUrlPage({ params }: { params: { userId: string } }) {
    return <KnowledgeUrlContent userId={params.userId} />
}
