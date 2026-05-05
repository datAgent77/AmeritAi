import { ChatbotSettings } from "@/types/chatbot"
import type {
    GuidedSkillClientEvent,
    GuidedSkillMessageUi,
    GuidedSkillShortcut,
    GuidedSkillState,
} from "@/lib/guided-skills/types"
import { AI_GUIDED_SKILL_ID } from "@/lib/guided-ai"
import { Sparkles, X, Utensils, Receipt, Check } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ProductCard } from "@/components/chatbot/product-card"
import { ProductCarousel } from "@/components/chatbot/product-carousel"
import Image from "next/image"
import { RefObject, WheelEvent } from "react"
import { InlineLeadForm } from "./InlineLeadForm"
import { InlineBookingForm } from "./InlineBookingForm"
import { ThinkingIndicatorBubble } from "@/components/chatbot/thinking-indicator-bubble"
import { resolveLocalizedSuggestions, resolveLocalizedText } from "../utils/localized-copy"

interface MessageListProps {
    messages: any[]
    settings: ChatbotSettings
    isTyping: boolean
    isSessionPaused?: boolean
    pauseStateVersion?: number
    language: string
    imageMap: Record<string, any>
    scrollToBottom: (behavior?: ScrollBehavior) => void
    sendMessage: (text: string) => void | Promise<string>
    sendGuidedMessage: (event: GuidedSkillClientEvent) => void | Promise<string>
    guidedSkillState?: GuidedSkillState | null
    messagesContainerRef: RefObject<HTMLDivElement | null>
    messagesEndRef: RefObject<HTMLDivElement | null>
    t: (key: string) => string
    onLeadSubmit: (data: any, options?: { source?: "inline" | "overlay"; flow?: "lead" | "handoff" }) => Promise<void>
    chatbotId?: string
    sessionId?: string | null
    onBookingSuccess?: (appointmentId: string) => void
    mode?: "classic" | "ambient"
    showClassicEntryOnboarding?: boolean
    onCloseWidget?: () => void
}

type RgbColor = { r: number; g: number; b: number }

function parseToRgb(color: string | undefined): RgbColor | null {
    if (!color) return null
    const value = color.trim()
    if (!value) return null

    const shortHex = value.match(/^#([0-9a-f]{3})$/i)
    if (shortHex) {
        const [r, g, b] = shortHex[1].split("")
        return {
            r: parseInt(r + r, 16),
            g: parseInt(g + g, 16),
            b: parseInt(b + b, 16),
        }
    }

    const fullHex = value.match(/^#([0-9a-f]{6})$/i)
    if (fullHex) {
        return {
            r: parseInt(fullHex[1].slice(0, 2), 16),
            g: parseInt(fullHex[1].slice(2, 4), 16),
            b: parseInt(fullHex[1].slice(4, 6), 16),
        }
    }

    const rgb = value.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*[0-9.]+\s*)?\)$/i)
    if (rgb) {
        return {
            r: Math.max(0, Math.min(255, Number(rgb[1]))),
            g: Math.max(0, Math.min(255, Number(rgb[2]))),
            b: Math.max(0, Math.min(255, Number(rgb[3]))),
        }
    }

    return null
}

function getReadableTextColor(background: string | undefined, darkText = "#111827", lightText = "#ffffff"): string {
    const rgb = parseToRgb(background)
    if (!rgb) return darkText

    const srgb = [rgb.r, rgb.g, rgb.b].map((v) => {
        const n = v / 255
        return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)
    })
    const luminance = (0.2126 * srgb[0]) + (0.7152 * srgb[1]) + (0.0722 * srgb[2])

    return luminance > 0.54 ? darkText : lightText
}

function getGuidedCopy(language: string) {
    if (language === "tr") {
        return {
            flowsTitle: "Guided",
            flowsDescription: "Aşağıdaki butonlardan biriyle yönlendirmeli akış başlatabilirsin.",
            suggestedTitle: "Önerilen sorular",
        }
    }
    if (language === "de") {
        return {
            flowsTitle: "Guided",
            flowsDescription: "Starte einen gefuhrten Ablauf mit einer der folgenden Optionen.",
            suggestedTitle: "Vorgeschlagene Fragen",
        }
    }
    if (language === "es") {
        return {
            flowsTitle: "Guided",
            flowsDescription: "Inicia un flujo guiado con una de las opciones a continuacion.",
            suggestedTitle: "Preguntas sugeridas",
        }
    }
    if (language === "fr") {
        return {
            flowsTitle: "Guided",
            flowsDescription: "Demarrez un flux guide avec l'une des options ci-dessous.",
            suggestedTitle: "Questions suggerees",
        }
    }
    return {
        flowsTitle: "Guided",
        flowsDescription: "Start a guided flow with one of the options below.",
        suggestedTitle: "Suggested prompts",
    }
}

function isGuidedUiInteractive(guidedUi: GuidedSkillMessageUi | undefined, guidedSkillState?: GuidedSkillState | null) {
    if (!guidedUi) return false
    if (guidedUi.skillId === AI_GUIDED_SKILL_ID) return true
    if (!guidedSkillState) return false
    return (
        guidedSkillState.status === "active"
        && guidedSkillState.skillId === guidedUi.skillId
        && guidedSkillState.stepId === guidedUi.stepId
    )
}

function GuidedShortcutButtons({
    shortcuts,
    onSelect,
    language,
}: {
    shortcuts: GuidedSkillShortcut[]
    onSelect: (shortcut: GuidedSkillShortcut) => void
    language: string
}) {
    if (shortcuts.length === 0) return null

    const copy = getGuidedCopy(language)

    return (
        <div className="space-y-3">
            <div className="space-y-1">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-100">{copy.flowsTitle}</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">{copy.flowsDescription}</p>
            </div>
            <div className="-mx-5 px-5 pb-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex gap-2 w-max min-w-full snap-x snap-mandatory">
                    {shortcuts.map((shortcut) => (
                        <button
                            key={shortcut.id}
                            onClick={() => onSelect(shortcut)}
                            className="w-[240px] shrink-0 snap-start rounded-xl border border-emerald-200/80 bg-white px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-emerald-900/70 dark:bg-zinc-900/80 dark:hover:bg-zinc-800"
                        >
                            <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{shortcut.title}</div>
                            {shortcut.description ? (
                                <div className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-zinc-400">{shortcut.description}</div>
                            ) : null}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

function GuidedStepActions({
    guidedUi,
    isInteractive,
    isBusy,
    onSelect,
}: {
    guidedUi: GuidedSkillMessageUi
    isInteractive: boolean
    isBusy: boolean
    onSelect: (event: GuidedSkillClientEvent) => void
}) {
    const isDisabled = !isInteractive || isBusy

    return (
        <div className="mt-4 space-y-3">
            {guidedUi.presentation === "cards" && guidedUi.cards.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                    {guidedUi.cards.map((card) => (
                        <button
                            key={card.optionId}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => onSelect({
                                skillId: guidedUi.skillId,
                                stepId: guidedUi.stepId,
                                optionId: card.optionId,
                                label: card.title,
                                source: "guided_ui",
                            })}
                            className={`rounded-2xl border p-4 text-left transition ${
                                card.selected
                                    ? "border-emerald-400 bg-emerald-50/80 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/30"
                                    : "border-gray-200 bg-white/80 hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:border-emerald-700"
                            } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                            {card.badge ? (
                                <div className="mb-2 inline-flex rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                                    {card.badge}
                                </div>
                            ) : null}
                            <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{card.title}</div>
                            {card.description ? (
                                <div className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-zinc-400">{card.description}</div>
                            ) : null}
                            {card.metadata ? (
                                <div className="mt-3 text-[11px] font-medium text-gray-600 dark:text-zinc-300">{card.metadata}</div>
                            ) : null}
                        </button>
                    ))}
                </div>
            ) : null}

            {guidedUi.options.length > 0 && (guidedUi.presentation !== "cards" || guidedUi.cards.length === 0) ? (
                <div className="flex flex-wrap gap-2">
                    {guidedUi.options.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => onSelect({
                                skillId: guidedUi.skillId,
                                stepId: guidedUi.stepId,
                                optionId: option.id,
                                label: option.label,
                                source: "guided_ui",
                            })}
                            className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                                option.selected
                                    ? "border-emerald-500 bg-emerald-500 text-white"
                                    : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-emerald-700"
                            } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            ) : null}

            {(guidedUi.submit || guidedUi.cancelLabel) ? (
                <div className="flex flex-wrap gap-2">
                    {guidedUi.submit ? (
                        <button
                            type="button"
                            disabled={isDisabled}
                            onClick={() => onSelect({
                                skillId: guidedUi.skillId,
                                stepId: guidedUi.stepId,
                                optionId: "__submit",
                                label: guidedUi.submit?.label,
                                source: "guided_ui",
                            })}
                            className={`rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                            {guidedUi.submit.label}
                        </button>
                    ) : null}
                    {guidedUi.cancelLabel ? (
                        <button
                            type="button"
                            disabled={isDisabled}
                            onClick={() => onSelect({
                                skillId: guidedUi.skillId,
                                stepId: guidedUi.stepId,
                                optionId: "__cancel",
                                label: guidedUi.cancelLabel,
                                source: "guided_ui",
                            })}
                            className={`rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                            {guidedUi.cancelLabel}
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
    )
}

export function MessageList({
    messages,
    settings,
    isTyping,
    language,
    imageMap,
    scrollToBottom,
    sendMessage,
    sendGuidedMessage,
    guidedSkillState,
    messagesContainerRef,
    messagesEndRef,
    t,
    onLeadSubmit,
    chatbotId,
    sessionId,
    onBookingSuccess,
    mode = "classic",
    showClassicEntryOnboarding = false,
    onCloseWidget,
}: MessageListProps) {
    const isAmbientMode = mode === "ambient"
    const isTransparentEmbed = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("embed") === "1"
    const localizedWelcomeTitle = resolveLocalizedText(
        settings.welcomeTitle,
        settings.welcomeTitleLocalized,
        language,
        `${t("welcomeTo")} ${settings.companyName}`
    )
    const localizedWelcomeMessage = resolveLocalizedText(
        settings.welcomeMessage,
        settings.welcomeMessageLocalized,
        language
    )
    const suggestedQuestions = resolveLocalizedSuggestions(
        settings.suggestedQuestions,
        settings.suggestedQuestionsLocalized,
        language
    )
        .filter((question) => question.trim() !== "")
    const guidedShortcuts = settings.guidedSkills || []
    const guidedCopy = getGuidedCopy(language)
    const handleGuidedShortcut = (shortcut: GuidedSkillShortcut) => {
        sendGuidedMessage({
            skillId: shortcut.id,
            label: shortcut.title,
            source: "shortcut",
        })
    }
    const handleWheelContain = (event: WheelEvent<HTMLDivElement>) => {
        if (!isAmbientMode) return

        const container = event.currentTarget
        const { scrollTop, scrollHeight, clientHeight } = container
        const canScroll = scrollHeight > clientHeight + 1
        const isAtTop = scrollTop <= 0
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1

        // Prevent wheel momentum from escaping to the host page when the feed
        // is already at the top/bottom (scroll chaining bug in embedded widget).
        if (!canScroll || (isAtTop && event.deltaY < 0) || (isAtBottom && event.deltaY > 0)) {
            event.preventDefault()
        }

        event.stopPropagation()
    }

    return (
        <div
            className={isAmbientMode && !showClassicEntryOnboarding
                ? "flex flex-col h-full overflow-hidden"
                : (showClassicEntryOnboarding
                    ? `flex flex-col h-full overflow-hidden ${isAmbientMode ? 'bg-transparent' : 'bg-white dark:bg-zinc-900'}`
                    : (isTransparentEmbed ? "flex flex-col h-full overflow-hidden bg-transparent" : "flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-zinc-900"))}
        >
            {showClassicEntryOnboarding ? (
                <div className="flex h-full w-full flex-col">
                    <div
                        className="sticky top-0 z-10 px-6 pb-8 pt-5 shrink-0 rounded-none md:rounded-t-[20px]"
                        style={{
                            backgroundColor: settings.headerBackgroundColor || settings.brandColor || "#111827",
                            color: settings.headerTextColor || "#FFFFFF"
                        }}
                    >
                        {onCloseWidget ? (
                            <button
                                type="button"
                                onClick={onCloseWidget}
                                className="absolute right-2 top-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-white/90 transition-colors hover:bg-white/18 hover:text-white"
                                aria-label={t("closeWidget")}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        ) : null}
                        <div className="flex items-start gap-3 pr-12">
                            <div className="flex items-center gap-3 min-w-0">
                                <div
                                    className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-white/20"
                                    style={{ width: settings.headerLogoWidth || 40, height: settings.headerLogoHeight || 40 }}
                                >
                                    {settings.headerLogo || settings.brandLogo ? (
                                        <Image
                                            src={settings.headerLogo || settings.brandLogo}
                                            alt={`${settings.companyName} logo`}
                                            fill
                                            className="object-contain p-1"
                                            unoptimized
                                        />
                                    ) : (
                                        <Sparkles className="h-5 w-5 text-white" />
                                    )}
                                </div>
                                <p className="text-sm font-semibold truncate" style={{ color: settings.headerTextColor || "#FFFFFF" }}>{settings.companyName}</p>
                            </div>
                        </div>
                        <div className="mt-7 space-y-2">
                            <h2 className="text-4xl font-bold leading-tight tracking-tight">
                                {localizedWelcomeTitle}
                            </h2>
                            <p className="text-base leading-relaxed opacity-90">
                                {localizedWelcomeMessage}
                            </p>
                        </div>
                    </div>

                    <div 
                        ref={messagesContainerRef}
                        onWheel={isAmbientMode && !showClassicEntryOnboarding ? handleWheelContain : undefined}
                        className={`flex-1 px-5 py-4 overflow-y-auto overflow-x-hidden scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200/80 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 dark:hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600 ${isAmbientMode ? 'bg-transparent' : 'bg-white dark:bg-zinc-900'}`}
                    >
                        <div className="space-y-5">
                            <GuidedShortcutButtons
                                shortcuts={guidedShortcuts}
                                onSelect={handleGuidedShortcut}
                                language={language}
                            />
                            <div className="space-y-2">
                                {suggestedQuestions.length > 0 ? (
                                    <>
                                        {guidedShortcuts.length > 0 ? (
                                            <p className="px-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-400">
                                                {guidedCopy.suggestedTitle}
                                            </p>
                                        ) : null}
                                        {suggestedQuestions.map((question, index) => (
                                        <button
                                            key={`${question}-${index}`}
                                            onClick={() => sendMessage(question)}
                                            className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-zinc-200 transition hover:border-gray-300 dark:hover:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700"
                                        >
                                            {question}
                                        </button>
                                        ))}
                                    </>
                                ) : guidedShortcuts.length === 0 ? (
                                    <p className="px-1 py-2 text-xs text-gray-500">
                                        {language === "tr"
                                            ? "Öneri bulunamadı. Doğrudan mesaj yazabilirsin."
                                            : "No suggestion found. You can type a direct message below."}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            ) : messages.length === 0 ? (
                isAmbientMode ? (
                    <div className="flex-1 min-h-0" />
                ) : (
                    <div 
                        ref={messagesContainerRef}
                        className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center justify-center text-center space-y-6 p-8 animate-in fade-in duration-700 slide-in-from-bottom-4 fill-mode-forwards"
                    >
                        <div
                            className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mb-2 overflow-hidden shrink-0"
                            style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor }}
                        >
                            <Sparkles className="w-8 h-8" />
                        </div>
                        <div className="space-y-2 max-w-xs">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-zinc-100">{localizedWelcomeTitle}</h2>
                            <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed">
                                {localizedWelcomeMessage}
                            </p>
                        </div>
                        <div className="w-full max-w-xs space-y-4">
                            <GuidedShortcutButtons
                                shortcuts={guidedShortcuts}
                                onSelect={handleGuidedShortcut}
                                language={language}
                            />
                            <div className="grid grid-cols-1 gap-2 w-full">
                                {guidedShortcuts.length > 0 && suggestedQuestions.length > 0 ? (
                                    <p className="px-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-400">
                                        {guidedCopy.suggestedTitle}
                                    </p>
                                ) : null}
                                {suggestedQuestions.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            sendMessage(q)
                                        }}
                                        className="text-xs text-left px-4 py-3 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 border border-gray-100 dark:border-zinc-700 rounded-xl transition-all hover:shadow-sm shadow-sm text-gray-700 dark:text-zinc-200"
                                        style={{ borderColor: `${settings.headerBackgroundColor || settings.brandColor}40` }}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            ) : (
                <div 
                    ref={messagesContainerRef}
                    onWheel={isAmbientMode && !showClassicEntryOnboarding ? handleWheelContain : undefined}
                    className={`flex-1 overflow-y-auto overflow-x-hidden scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200/80 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 dark:hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600 ${isAmbientMode ? "flex flex-col h-full overscroll-contain px-2 py-2 sm:px-3 sm:py-3" : "p-4"}`}
                    style={isAmbientMode && !showClassicEntryOnboarding
                        ? {
                            WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1) 94%, rgba(0,0,0,0.45) 98%, rgba(0,0,0,0) 100%)",
                            maskImage: "linear-gradient(to top, rgba(0,0,0,1) 94%, rgba(0,0,0,0.45) 98%, rgba(0,0,0,0) 100%)",
                            overscrollBehaviorY: "contain",
                        }
                        : undefined}
                >
                    <div className={isAmbientMode ? "mt-auto flex flex-col gap-3 w-full pb-1" : "w-full space-y-6"}>
                        {messages.map((m: any) => {
                        // Render-time image recovery
                        const cached = imageMap[m.id] || (m.role === 'user' && !m.image && m.content ? Object.values(imageMap).find((x: any) => x.content === m.content) : null)
                        const displayImage = m.image || cached?.image
                        const displayMime = m.imageMimeType || cached?.mimeType
                        const messageContent = typeof m.content === 'string' ? m.content : ''
                        const hasProductCarousel = typeof m.content === 'string' && m.content.includes('"product-carousel"')
                        const ambientUserBg = typeof settings.headerBackgroundColor === "string" && settings.headerBackgroundColor.trim()
                            ? settings.headerBackgroundColor.trim()
                            : typeof settings.brandColor === "string" && settings.brandColor.trim()
                                ? settings.brandColor.trim()
                            : undefined

                        // Hide empty messages (prevent empty bubble while loading or if failed)
                        if (!m.content?.trim() && !displayImage && !m.guidedUi) return null;

                        // Remove slide-in animation to prevent replay on display toggle (widget open/close)
                        const animationClasses = '';
                        const ambientUserTextColor = ambientUserBg ? getReadableTextColor(ambientUserBg, "#111827", "#ffffff") : "#ffffff"
                        const ambientAssistantTextColor = "#111827"
                        const userTextIsLight = ambientUserTextColor === "#ffffff"
                        const assistantTextIsLight = false
                        const bubbleClassName = m.role === 'user'
                                ? 'text-white rounded-tr-sm'
                                : 'bg-white dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800 text-gray-800 dark:text-zinc-100 rounded-tl-sm';
                        const ambientWidthClass = hasProductCarousel && m.role !== 'user' ? 'w-[calc(100%-2.75rem)] max-w-[calc(100%-2.75rem)]' : 'max-w-[85%]';
                        const messageContentClassName = `text-sm leading-relaxed px-5 py-4 text-left relative transition-all rounded-2xl hover:shadow-md shadow-sm ${hasProductCarousel && m.role !== 'user' ? 'block w-full max-w-full overflow-hidden' : 'inline-block'} ${bubbleClassName}`
                        const messageContentStyle = m.role === 'user'
                            ? { backgroundColor: ambientUserBg || settings.headerBackgroundColor || settings.brandColor }
                            : undefined
                        const inlineCodeClassName = m.role === 'user'
                            ? (userTextIsLight ? 'bg-white/20 text-white' : 'bg-black/10 text-gray-900')
                            : (assistantTextIsLight ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-red-500 dark:text-red-400')
                        const anchorClassName = m.role === 'user'
                            ? (userTextIsLight ? 'underline font-medium text-white' : 'underline font-medium text-gray-900')
                            : (assistantTextIsLight ? 'underline font-medium text-white' : 'underline font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800')
                        const tableBaseClassName = isAmbientMode
                            ? (m.role === 'user' ? (userTextIsLight ? 'bg-white/10' : 'bg-black/5') : (assistantTextIsLight ? 'bg-white/10' : 'bg-white dark:bg-zinc-900/50'))
                            : 'bg-white/5 dark:bg-zinc-900/20'
                        const tableBorderClassName = m.role === 'user'
                            ? (userTextIsLight ? 'border-white/20' : 'border-black/20')
                            : (assistantTextIsLight ? 'border-white/20' : 'border-gray-200 dark:border-zinc-800')
                        const isGuidedStep = m.role === 'assistant' && m.guidedUi?.type === 'guided-step'
                        const isGuidedInteractive = isGuidedUiInteractive(m.guidedUi, guidedSkillState)

                        return (
                            <div key={m.id} className={`flex w-full ${isAmbientMode ? 'gap-2' : 'gap-3'} ${isAmbientMode ? 'max-w-[1080px]' : 'max-w-3xl'} mx-auto ${m.role === 'user' ? 'justify-end' : 'justify-start'} ${isAmbientMode ? 'px-1.5' : ''} ${animationClasses} group/msg`}>
                                {m.role !== 'user' && !isAmbientMode && (
                                    <div
                                        className="relative w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs mt-auto mb-1 shadow-sm overflow-hidden text-white"
                                        style={{ backgroundColor: settings.brandColor || '#000000' }}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                )}
                                <div className={`space-y-1 ${ambientWidthClass} ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                                    <div className={`flex items-center gap-2 justify-between px-1 transition-opacity duration-300 ${isAmbientMode ? 'hidden' : 'opacity-0 group-hover/msg:opacity-100'}`}>
                                        {m.role === 'assistant' && (
                                            <span className={`text-[10px] font-medium ${isAmbientMode ? 'text-white/60' : 'text-gray-400'}`}>{settings.companyName}</span>
                                        )}
                                    </div>
                                    <div
                                        className={messageContentClassName}
                                        style={messageContentStyle}
                                    >
                                        {/* Show image if present */}
                                        {displayImage && (
                                            <div className="mb-2">
                                                <Image
                                                    src={`data:${displayMime || 'image/jpeg'};base64,${displayImage}`}
                                                    alt="Uploaded"
                                                    width={500}
                                                    height={300}
                                                    className="max-w-full max-h-48 rounded-lg object-contain w-auto h-auto"
                                                    unoptimized
                                                    onLoad={() => scrollToBottom("smooth")}
                                                />
                                            </div>
                                        )}
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                code: ({ node, inline, className, children, ...props }: any) => {
                                                    const content = String(children).replace(/\n$/, '').trim()

                                                    if (content === '[CALL_STAFF]' || content === '[REQUEST_BILL]') {
                                                        return (
                                                            <div className="mt-2 p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                                                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                                                    {content === '[CALL_STAFF]' ? (
                                                                        <Utensils className="w-5 h-5 text-primary" />
                                                                    ) : (
                                                                        <Receipt className="w-5 h-5 text-primary" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="text-xs font-bold text-primary uppercase tracking-wider">
                                                                        {content === '[CALL_STAFF]' ? 'Garson Çağrıldı' : 'Hesap İstendi'}
                                                                    </div>
                                                                    <div className="text-[11px] text-muted-foreground leading-tight">
                                                                        {content === '[CALL_STAFF]' 
                                                                            ? 'Personelimiz en kısa sürede masanıza gelecek.' 
                                                                            : 'Hesabınız hazırlanıyor, birazdan masanıza getirilecek.'}
                                                                    </div>
                                                                </div>
                                                                <Check className="w-5 h-5 text-green-500" />
                                                            </div>
                                                        )
                                                    }

                                                    const match = /language-(\w+)/.exec(className || '')

                                                    if (content.trim().startsWith('[') && content.includes('"price"')) {
                                                        try {
                                                            const products = JSON.parse(content)
                                                            if (Array.isArray(products) && products.length > 0) {
                                                                const validProducts = products.filter((p: any) => p?.name && (p?.price !== undefined && p?.price !== null))
                                                                if (validProducts.length > 0) {
                                                                    return <ProductCarousel products={validProducts} brandColor={settings.brandColor} language={language} />
                                                                }
                                                            }
                                                        } catch (e) {
                                                        }
                                                    }

                                                    if (content.trim().startsWith('{') && content.includes('"product-carousel"')) {
                                                        try {
                                                            const payload = JSON.parse(content)
                                                            if (payload?.type === 'product-carousel' && Array.isArray(payload?.items)) {
                                                                const validProducts = payload.items.filter((p: any) => p?.name && (p?.price !== undefined && p?.price !== null))
                                                                if (validProducts.length > 0) {
                                                                    return <ProductCarousel products={validProducts} brandColor={settings.brandColor} language={language} />
                                                                }
                                                            }
                                                        } catch (e) {
                                                        }
                                                    }

                                                    if (content.trim().startsWith('{') && content.includes('"price"')) {
                                                        try {
                                                            const product = JSON.parse(content)
                                                            if (product.name && (product.price !== undefined && product.price !== null)) {
                                                                return <ProductCard product={product} brandColor={settings.brandColor} language={language} />
                                                            }
                                                        } catch (e) {
                                                        }
                                                    }

                                                    return !inline && match ? (
                                                        <div className="bg-gray-800 text-white p-2 rounded-md text-xs overflow-x-auto my-2">
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        </div>
                                                    ) : (
                                                        <code className={`${inlineCodeClassName} px-1 py-0.5 rounded text-xs font-mono`} {...props}>
                                                            {children}
                                                        </code>
                                                    )
                                                },
                                                a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className={anchorClassName} />,
                                                pre: ({ node, ...props }) => (
                                                    <div className="max-w-full overflow-hidden my-0">
                                                        {props.children}
                                                    </div>
                                                ),
                                                table: ({ node, ...props }) => <table className={`border-collapse table-auto w-full text-xs my-2 rounded overflow-hidden ${tableBaseClassName}`} {...props} />,
                                                th: ({ node, ...props }) => <th className={`border px-2 py-1 font-semibold ${tableBorderClassName} ${m.role === 'user' ? '' : 'bg-gray-50 text-gray-900'}`} {...props} />,
                                                td: ({ node, ...props }) => <td className={`border px-2 py-1 ${tableBorderClassName}`} {...props} />,
                                                p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-1" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-1" {...props} />,
                                            }}
                                        >
                                            {messageContent
                                                .replace('[SHOW_LEAD_FORM]', '')
                                                .replace('[SHOW_BOOKING_FORM]', '')
                                                .replace('[SHOW_HANDOFF_FORM]', '')
                                                .replace('[CALL_STAFF]', '')
                                                .replace('[REQUEST_BILL]', '')
                                            }
                                        </ReactMarkdown>

                                        {/* Inline Lead Form */}
                                        {messageContent.includes('[SHOW_LEAD_FORM]') && (
                                            <InlineLeadForm
                                                onSubmit={(data, opts) => onLeadSubmit(data, { ...opts, source: "inline", flow: "lead" })}
                                                settings={settings}
                                                t={t}
                                                variant="lead"
                                            />
                                        )}

                                        {/* Inline Handoff Form */}
                                        {messageContent.includes('[SHOW_HANDOFF_FORM]') && (
                                            <InlineLeadForm
                                                onSubmit={(data, opts) => onLeadSubmit(data, { ...opts, source: "inline", flow: "handoff" })}
                                                settings={settings}
                                                t={t}
                                                variant="handoff"
                                            />
                                        )}

                                        {/* Inline Booking Form */}
                                        {messageContent.includes('[SHOW_BOOKING_FORM]') && chatbotId && (
                                            <InlineBookingForm
                                                chatbotId={chatbotId}
                                                sessionId={sessionId}
                                                settings={settings}
                                                t={t}
                                                onSuccess={onBookingSuccess}
                                            />
                                        )}
                                        {isGuidedStep ? (
                                            <GuidedStepActions
                                                guidedUi={m.guidedUi}
                                                isInteractive={isGuidedInteractive}
                                                isBusy={isTyping}
                                                onSelect={sendGuidedMessage}
                                            />
                                        ) : null}
                                        {!isAmbientMode && (
                                            <div className={`text-[10px] mt-1 opacity-70 flex justify-end ${m.role === 'user' || isAmbientMode ? 'text-white/70' : 'text-gray-400'}`}>
                                                {m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {/* Typing Indicator */}
                    {isTyping && (
                        <div className={`flex w-full gap-3 ${isAmbientMode ? 'max-w-[1080px] mr-auto' : 'max-w-3xl mx-auto'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            {!isAmbientMode && (
                                <div
                                    className="relative w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white mt-auto mb-1 shadow-sm overflow-hidden order-first"
                                    style={{ backgroundColor: settings.brandColor || '#000000' }}
                                >
                                    <Sparkles className="w-4 h-4" />
                                </div>
                            )}
                            <ThinkingIndicatorBubble
                                language={language}
                                className={isAmbientMode ? "rounded-[24px] rounded-bl-[4px] text-gray-500 dark:text-zinc-400" : ""}
                                textClassName={isAmbientMode ? "text-gray-500 dark:text-zinc-400" : ""}
                            />
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                </div>
            )}
        </div>
    )
}
