type DisplayMode = "classic" | "ambient" | string | undefined

interface ClassicEntryOnboardingVisibilityInput {
    chatDisplayMode?: DisplayMode
    enableClassicEntryOnboarding?: boolean
    hasUserMessage: boolean
    hasMessages?: boolean
}

export function shouldShowClassicEntryOnboarding({
    chatDisplayMode,
    enableClassicEntryOnboarding,
    hasUserMessage,
    hasMessages,
}: ClassicEntryOnboardingVisibilityInput): boolean {
    if (chatDisplayMode === "ambient") return false
    if (enableClassicEntryOnboarding === false) return false
    return !hasUserMessage && !hasMessages
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
