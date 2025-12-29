"use client"

import { KnowledgeFileContent } from "@/components/knowledge/content/knowledge-file-content"

export default function TenantKnowledgeFilePage({ params }: { params: { userId: string } }) {
    return <KnowledgeFileContent userId={params.userId} />
}
