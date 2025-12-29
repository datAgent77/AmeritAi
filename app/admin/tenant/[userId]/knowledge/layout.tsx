"use client"

import { KnowledgeLayoutContent } from "@/components/knowledge/knowledge-layout-content"

export default function TenantKnowledgeLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: { userId: string }
}) {
    return (
        <KnowledgeLayoutContent basePath={`/admin/tenant/${params.userId}/knowledge`}>
            {children}
        </KnowledgeLayoutContent>
    )
}
