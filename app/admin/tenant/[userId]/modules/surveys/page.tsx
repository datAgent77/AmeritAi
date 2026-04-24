"use client"

import { SurveyManagerForm } from "@/components/modules/surveys/survey-manager-form"

export default function AdminSurveyManagerPage({ params }: { params: { userId: string } }) {
    return <SurveyManagerForm targetUserId={params.userId} isSuperAdmin={true} />
}
