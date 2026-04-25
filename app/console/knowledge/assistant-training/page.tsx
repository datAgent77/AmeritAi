"use client"

import { useAuth } from "@/context/AuthContext"
import { AssistantTrainingContent } from "@/components/knowledge/content/assistant-training-content"

export default function AssistantTrainingPage() {
    const { user } = useAuth()

    if (!user) return null

    return <AssistantTrainingContent userId={user.uid} />
}
