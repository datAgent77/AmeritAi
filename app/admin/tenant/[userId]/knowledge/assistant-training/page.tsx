"use client"

import { AssistantTrainingContent } from "@/components/knowledge/content/assistant-training-content"

export default function TenantAssistantTrainingPage({ params }: { params: { userId: string } }) {
    return <AssistantTrainingContent userId={params.userId} />
}
