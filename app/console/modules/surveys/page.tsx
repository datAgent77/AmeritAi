"use client"

import { useAuth } from "@/context/AuthContext"
import { SurveyManagerForm } from "@/components/modules/surveys/survey-manager-form"

export default function SurveyManagerPage() {
    const { user } = useAuth()

    if (!user) return null

    return <SurveyManagerForm targetUserId={user.uid} isSuperAdmin={false} />
}
