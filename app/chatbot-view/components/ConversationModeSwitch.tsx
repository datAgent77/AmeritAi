import { MessageSquareText, Phone } from "lucide-react"

export type ConversationMode = "text" | "voice"

interface ConversationModeSwitchProps {
    value: ConversationMode
    onChange: (mode: ConversationMode) => void
    textLabel: string
    voiceLabel: string
    compact?: boolean
    className?: string
}

export function ConversationModeSwitch({
    value,
    onChange,
    textLabel,
    voiceLabel,
    compact = false,
    className = "",
}: ConversationModeSwitchProps) {
    const rootPadding = compact ? "p-1" : "p-1.5"
    const buttonHeight = compact ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm"
    const iconSize = compact ? "h-3.5 w-3.5" : "h-4 w-4"

    const buttonClass = (mode: ConversationMode) =>
        [
            "inline-flex items-center gap-2 rounded-full font-medium transition-all duration-200",
            buttonHeight,
            value === mode
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-800",
        ].join(" ")

    return (
        <div className={`inline-flex items-center rounded-full border border-gray-200 bg-gray-100/90 backdrop-blur-sm ${rootPadding} ${className}`}>
            <button
                type="button"
                onClick={() => onChange("text")}
                aria-pressed={value === "text"}
                className={buttonClass("text")}
            >
                <MessageSquareText className={iconSize} />
                <span>{textLabel}</span>
            </button>
            <button
                type="button"
                onClick={() => onChange("voice")}
                aria-pressed={value === "voice"}
                className={buttonClass("voice")}
            >
                <Phone className={iconSize} />
                <span>{voiceLabel}</span>
            </button>
        </div>
    )
}
