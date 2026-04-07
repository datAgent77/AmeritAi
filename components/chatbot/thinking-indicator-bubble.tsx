interface ThinkingIndicatorBubbleProps {
    language: string
    className?: string
    textClassName?: string
    dotClassName?: string
}

export function ThinkingIndicatorBubble({
    language,
    className = "",
    textClassName = "",
    dotClassName = "",
}: ThinkingIndicatorBubbleProps) {
    const thinkingLabel = language === "tr" ? "Düşünüyor..." : "Thinking..."
    const resolvedDotClassName = dotClassName || "bg-gray-400"
    const resolvedTextClassName = textClassName || "text-gray-400"

    return (
        <div className={`px-5 py-4 rounded-2xl rounded-bl-md shadow-sm flex items-center gap-2 bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 ${className}`}>
            <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.3s] ${resolvedDotClassName}`}></div>
                <div className={`h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.15s] ${resolvedDotClassName}`}></div>
                <div className={`h-1.5 w-1.5 rounded-full animate-bounce ${resolvedDotClassName}`}></div>
            </div>
            <span className={`text-[13px] font-medium ${resolvedTextClassName}`}>
                {thinkingLabel}
            </span>
        </div>
    )
}
