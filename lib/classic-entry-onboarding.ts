type DisplayMode = "classic" | "ambient" | string | undefined

interface ClassicEntryOnboardingVisibilityInput {
    chatDisplayMode?: DisplayMode
    enableClassicEntryOnboarding?: boolean
    hasUserMessage: boolean
}

export function shouldShowClassicEntryOnboarding({
    chatDisplayMode,
    enableClassicEntryOnboarding,
    hasUserMessage,
}: ClassicEntryOnboardingVisibilityInput): boolean {
    if (chatDisplayMode === "ambient") return false
    if (enableClassicEntryOnboarding === false) return false
    return !hasUserMessage
}

export function filterSuggestedQuestions(questions: string[] | undefined, query: string): string[] {
    const normalizedQuery = query.trim().toLocaleLowerCase()

    const normalizedQuestions = (questions || [])
        .map((question) => (typeof question === "string" ? question.trim() : ""))
        .filter((question) => question.length > 0)

    if (!normalizedQuery) return normalizedQuestions

    return normalizedQuestions.filter((question) =>
        question.toLocaleLowerCase().includes(normalizedQuery),
    )
}
