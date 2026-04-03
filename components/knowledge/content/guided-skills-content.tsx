"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type {
    GuidedSkillChannel,
    GuidedSkillRecord,
    GuidedSkillStepPresentation,
    GuidedSkillSubmit,
} from "@/lib/guided-skills/types"
import type { OmniActionId } from "@/lib/omni/types"

type GuidedSkillOptionDraft = {
    id: string
    label: string
    aliasesText: string
    nextStepId: string
    selectionValue: string
    payloadPatchText: string
}

type GuidedSkillCardDraft = {
    optionId: string
    title: string
    description: string
    badge: string
    metadata: string
    imageUrl: string
}

type GuidedSkillSubmitDraft = {
    enabled: boolean
    mode: GuidedSkillSubmit["mode"]
    label: string
    actionId: string
    successMessage: string
    externalUrl: string
}

type GuidedSkillStepDraft = {
    id: string
    prompt: string
    presentation: GuidedSkillStepPresentation
    cancelLabel: string
    options: GuidedSkillOptionDraft[]
    cards: GuidedSkillCardDraft[]
    submit: GuidedSkillSubmitDraft
}

type GuidedSkillDraft = {
    id: string
    title: string
    description: string
    enabled: boolean
    channels: GuidedSkillChannel[]
    startStepId: string
    startAliasesText: string
    steps: GuidedSkillStepDraft[]
}

const CHANNELS: GuidedSkillChannel[] = ["web", "whatsapp", "instagram"]

function createOptionDraft(index = 1): GuidedSkillOptionDraft {
    return {
        id: `option-${index}`,
        label: "",
        aliasesText: "",
        nextStepId: "",
        selectionValue: "",
        payloadPatchText: "",
    }
}

function createCardDraft(): GuidedSkillCardDraft {
    return {
        optionId: "",
        title: "",
        description: "",
        badge: "",
        metadata: "",
        imageUrl: "",
    }
}

function createSubmitDraft(): GuidedSkillSubmitDraft {
    return {
        enabled: false,
        mode: "confirm_only",
        label: "",
        actionId: "",
        successMessage: "",
        externalUrl: "",
    }
}

function createStepDraft(index = 1): GuidedSkillStepDraft {
    return {
        id: `step-${index}`,
        prompt: "",
        presentation: "chips",
        cancelLabel: "",
        options: [createOptionDraft(1)],
        cards: [],
        submit: createSubmitDraft(),
    }
}

function createSkillDraft(): GuidedSkillDraft {
    return {
        id: "",
        title: "",
        description: "",
        enabled: true,
        channels: ["web"],
        startStepId: "step-1",
        startAliasesText: "",
        steps: [createStepDraft(1)],
    }
}

function createTestSkillDraft(isTr: boolean): GuidedSkillDraft {
    return {
        id: "",
        title: isTr ? "Test Guided" : "Guided Test Flow",
        description: isTr
            ? "Chip, kart ve submit davranışlarını hızlıca denemek için hazırlanmış örnek akış."
            : "Sample flow prepared to quickly test chips, cards, and submit behavior.",
        enabled: false,
        channels: ["web", "whatsapp", "instagram"],
        startStepId: "step-entry",
        startAliasesText: isTr ? "test guided, test akışı" : "guided test, test flow",
        steps: [
            {
                id: "step-entry",
                prompt: isTr
                    ? "Bu test akışında hangi alanı denemek istersin?"
                    : "Which part of the test flow do you want to try?",
                presentation: "chips",
                cancelLabel: isTr ? "Vazgeç" : "Cancel",
                options: [
                    {
                        id: "test-chip-flow",
                        label: isTr ? "Chip akışını test et" : "Test chip flow",
                        aliasesText: isTr ? "chip test, chip akışı" : "chip test, chips",
                        nextStepId: "step-chip-test",
                        selectionValue: "chip-flow",
                        payloadPatchText: JSON.stringify({ scenario: "chip-flow" }, null, 2),
                    },
                    {
                        id: "test-card-flow",
                        label: isTr ? "Kart akışını test et" : "Test card flow",
                        aliasesText: isTr ? "kart test, kart akışı" : "card test, cards",
                        nextStepId: "step-card-test",
                        selectionValue: "card-flow",
                        payloadPatchText: JSON.stringify({ scenario: "card-flow" }, null, 2),
                    },
                    {
                        id: "test-submit-flow",
                        label: isTr ? "Submit akışını test et" : "Test submit flow",
                        aliasesText: isTr ? "submit test, buton test" : "submit test, button test",
                        nextStepId: "step-submit-test",
                        selectionValue: "submit-flow",
                        payloadPatchText: JSON.stringify({ scenario: "submit-flow" }, null, 2),
                    },
                ],
                cards: [],
                submit: createSubmitDraft(),
            },
            {
                id: "step-chip-test",
                prompt: isTr
                    ? "Aşağıdaki test seçeneklerinden birini seç ve chip görünümünü kontrol et."
                    : "Select one of the test options below and inspect the chip presentation.",
                presentation: "chips",
                cancelLabel: isTr ? "Başa dön" : "Back to start",
                options: [
                    {
                        id: "test-option-1",
                        label: isTr ? "Test seçenek 1" : "Test option 1",
                        aliasesText: isTr ? "test 1" : "test 1",
                        nextStepId: "step-final",
                        selectionValue: "test-option-1",
                        payloadPatchText: JSON.stringify({ optionGroup: "chips", selected: 1 }, null, 2),
                    },
                    {
                        id: "test-option-2",
                        label: isTr ? "Test seçenek 2" : "Test option 2",
                        aliasesText: isTr ? "test 2" : "test 2",
                        nextStepId: "step-final",
                        selectionValue: "test-option-2",
                        payloadPatchText: JSON.stringify({ optionGroup: "chips", selected: 2 }, null, 2),
                    },
                    {
                        id: "test-option-3",
                        label: isTr ? "Test seçenek 3" : "Test option 3",
                        aliasesText: isTr ? "test 3" : "test 3",
                        nextStepId: "step-final",
                        selectionValue: "test-option-3",
                        payloadPatchText: JSON.stringify({ optionGroup: "chips", selected: 3 }, null, 2),
                    },
                ],
                cards: [],
                submit: {
                    enabled: true,
                    mode: "confirm_only",
                    label: isTr ? "Chip testini tamamla" : "Complete chip test",
                    actionId: "",
                    successMessage: isTr ? "Chip testi başarıyla tamamlandı." : "Chip test completed successfully.",
                    externalUrl: "",
                },
            },
            {
                id: "step-card-test",
                prompt: isTr
                    ? "Kart görünümünü test etmek için aşağıdaki kartlardan birini seç."
                    : "Choose one of the cards below to test the card presentation.",
                presentation: "cards",
                cancelLabel: isTr ? "Başa dön" : "Back to start",
                options: [
                    {
                        id: "test-card-1",
                        label: isTr ? "Test kart 1" : "Test card 1",
                        aliasesText: isTr ? "kart 1" : "card 1",
                        nextStepId: "step-final",
                        selectionValue: "test-card-1",
                        payloadPatchText: JSON.stringify({ optionGroup: "cards", selected: 1 }, null, 2),
                    },
                    {
                        id: "test-card-2",
                        label: isTr ? "Test kart 2" : "Test card 2",
                        aliasesText: isTr ? "kart 2" : "card 2",
                        nextStepId: "step-final",
                        selectionValue: "test-card-2",
                        payloadPatchText: JSON.stringify({ optionGroup: "cards", selected: 2 }, null, 2),
                    },
                ],
                cards: [
                    {
                        optionId: "test-card-1",
                        title: isTr ? "Test kart 1" : "Test card 1",
                        description: isTr ? "Kart bileşeninin başlık, açıklama ve badge alanını test eder." : "Tests the title, description, and badge fields of the card component.",
                        badge: isTr ? "Test" : "Test",
                        metadata: isTr ? "Web · Örnek veri" : "Web · Sample data",
                        imageUrl: "",
                    },
                    {
                        optionId: "test-card-2",
                        title: isTr ? "Test kart 2" : "Test card 2",
                        description: isTr ? "İkinci kart ile seçili durum ve aksiyon akışını kontrol edin." : "Use the second card to verify selected state and action flow.",
                        badge: isTr ? "Demo" : "Demo",
                        metadata: isTr ? "WhatsApp · Örnek veri" : "WhatsApp · Sample data",
                        imageUrl: "",
                    },
                ],
                submit: {
                    enabled: true,
                    mode: "confirm_only",
                    label: isTr ? "Kart testini tamamla" : "Complete card test",
                    actionId: "",
                    successMessage: isTr ? "Kart testi başarıyla tamamlandı." : "Card test completed successfully.",
                    externalUrl: "",
                },
            },
            {
                id: "step-submit-test",
                prompt: isTr
                    ? "Submit davranışını test etmek için önce bir test seçeneği işaretle."
                    : "Select a test option first to try the submit behavior.",
                presentation: "chips",
                cancelLabel: isTr ? "Başa dön" : "Back to start",
                options: [
                    {
                        id: "submit-test-1",
                        label: isTr ? "Hızlı test" : "Quick test",
                        aliasesText: isTr ? "hızlı test" : "quick test",
                        nextStepId: "",
                        selectionValue: "quick-test",
                        payloadPatchText: JSON.stringify({ optionGroup: "submit", selected: "quick-test" }, null, 2),
                    },
                    {
                        id: "submit-test-2",
                        label: isTr ? "Detaylı test" : "Detailed test",
                        aliasesText: isTr ? "detaylı test" : "detailed test",
                        nextStepId: "",
                        selectionValue: "detailed-test",
                        payloadPatchText: JSON.stringify({ optionGroup: "submit", selected: "detailed-test" }, null, 2),
                    },
                ],
                cards: [],
                submit: {
                    enabled: true,
                    mode: "confirm_only",
                    label: isTr ? "Submit testini tamamla" : "Complete submit test",
                    actionId: "",
                    successMessage: isTr ? "Submit testi başarıyla tamamlandı." : "Submit test completed successfully.",
                    externalUrl: "",
                },
            },
            {
                id: "step-final",
                prompt: isTr
                    ? "Final adımına ulaştın. İstersen bu adımı da submit ile kapatabilirsin."
                    : "You reached the final step. You can also finish this step with submit.",
                presentation: "chips",
                cancelLabel: isTr ? "Akışı kapat" : "Close flow",
                options: [
                    {
                        id: "finish-test",
                        label: isTr ? "Testi kapat" : "Close test",
                        aliasesText: isTr ? "bitir, kapat" : "finish, close",
                        nextStepId: "",
                        selectionValue: "finish-test",
                        payloadPatchText: JSON.stringify({ status: "completed" }, null, 2),
                    },
                ],
                cards: [],
                submit: {
                    enabled: true,
                    mode: "confirm_only",
                    label: isTr ? "Akışı tamamla" : "Complete flow",
                    actionId: "",
                    successMessage: isTr ? "Test akışı başarıyla tamamlandı." : "Test flow completed successfully.",
                    externalUrl: "",
                },
            },
        ],
    }
}

function parseCommaSeparated(value: string) {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
}

function stringifyPayloadPatch(value: Record<string, unknown> | undefined) {
    return value ? JSON.stringify(value, null, 2) : ""
}

function skillToDraft(skill: GuidedSkillRecord): GuidedSkillDraft {
    return {
        id: skill.id,
        title: skill.title,
        description: skill.description || "",
        enabled: skill.enabled !== false,
        channels: skill.channels,
        startStepId: skill.startStepId,
        startAliasesText: skill.startAliases.join(", "),
        steps: skill.steps.map((step, stepIndex) => ({
            id: step.id || `step-${stepIndex + 1}`,
            prompt: step.prompt,
            presentation: step.presentation,
            cancelLabel: step.cancelLabel || "",
            options: step.options.map((option, optionIndex) => ({
                id: option.id || `option-${optionIndex + 1}`,
                label: option.label,
                aliasesText: option.aliases.join(", "),
                nextStepId: option.nextStepId || "",
                selectionValue: option.selectionValue || "",
                payloadPatchText: stringifyPayloadPatch(option.payloadPatch),
            })),
            cards: (step.cards || []).map((card) => ({
                optionId: card.optionId,
                title: card.title,
                description: card.description || "",
                badge: card.badge || "",
                metadata: card.metadata || "",
                imageUrl: card.imageUrl || "",
            })),
            submit: step.submit
                ? {
                    enabled: true,
                    mode: step.submit.mode,
                    label: step.submit.label,
                    actionId: step.submit.mode === "omni_action" ? step.submit.actionId : "",
                    successMessage: step.submit.successMessage,
                    externalUrl: step.submit.externalUrl || "",
                }
                : createSubmitDraft(),
        })),
    }
}

function parsePayloadPatch(value: string) {
    if (!value.trim()) return undefined
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Payload patch must be a JSON object.")
    }
    return parsed as Record<string, unknown>
}

function draftToSkill(draft: GuidedSkillDraft, chatbotId: string): GuidedSkillRecord {
    const steps = draft.steps.map((step, stepIndex) => ({
        id: step.id.trim() || `step-${stepIndex + 1}`,
        prompt: step.prompt.trim(),
        presentation: step.presentation,
        cancelLabel: step.cancelLabel.trim() || null,
        options: step.options
            .map((option, optionIndex) => ({
                id: option.id.trim() || `option-${optionIndex + 1}`,
                label: option.label.trim(),
                aliases: parseCommaSeparated(option.aliasesText),
                nextStepId: option.nextStepId.trim() || null,
                selectionValue: option.selectionValue.trim() || null,
                payloadPatch: parsePayloadPatch(option.payloadPatchText),
            }))
            .filter((option) => option.label),
        cards:
            step.presentation === "cards"
                ? step.cards
                    .map((card) => ({
                        optionId: card.optionId.trim(),
                        title: card.title.trim(),
                        description: card.description.trim() || null,
                        badge: card.badge.trim() || null,
                        metadata: card.metadata.trim() || null,
                        imageUrl: card.imageUrl.trim() || null,
                    }))
                    .filter((card) => card.optionId && card.title)
                : [],
        submit: step.submit.enabled
            ? step.submit.mode === "omni_action"
                ? {
                    mode: "omni_action" as const,
                    label: step.submit.label.trim(),
                    actionId: step.submit.actionId.trim() as OmniActionId,
                    successMessage: step.submit.successMessage.trim(),
                    externalUrl: step.submit.externalUrl.trim() || null,
                }
                : {
                    mode: "confirm_only" as const,
                    label: step.submit.label.trim(),
                    successMessage: step.submit.successMessage.trim(),
                    externalUrl: step.submit.externalUrl.trim() || null,
                }
            : null,
    }))

    const resolvedStartStepId = draft.startStepId.trim() || steps[0]?.id || "step-1"

    return {
        id: draft.id || crypto.randomUUID(),
        chatbotId,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        enabled: draft.enabled,
        channels: draft.channels.length > 0 ? draft.channels : ["web"],
        startStepId: resolvedStartStepId,
        startAliases: parseCommaSeparated(draft.startAliasesText),
        steps,
        updatedAt: new Date().toISOString(),
    }
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= items.length) return items
    const copy = [...items]
    const [item] = copy.splice(index, 1)
    copy.splice(nextIndex, 0, item)
    return copy
}

function truncateText(value: string, maxLength = 96) {
    const trimmed = value.trim()
    if (!trimmed) return ""
    if (trimmed.length <= maxLength) return trimmed
    return `${trimmed.slice(0, maxLength - 1)}…`
}

export function GuidedSkillsContent({
    userId,
    moduleMode = false,
}: {
    userId: string
    moduleMode?: boolean
}) {
    const { language } = useLanguage()
    const { user } = useAuth()
    const { toast } = useToast()
    const [skills, setSkills] = useState<GuidedSkillRecord[]>([])
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
    const [draft, setDraft] = useState<GuidedSkillDraft>(createSkillDraft())
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const isTr = language === "tr"
    const copy = {
        guided: isTr ? "Guided" : "Guided",
        moduleDescription: isTr
            ? "Web widget ve mesajlaşma kanalları için buton ve kart tabanlı yönlendirmeli akışlar oluşturun."
            : "Build button and card based guided flows for the web widget and messaging channels.",
        newGuided: isTr ? "Yeni Guided" : "New Guided",
        loadTestFlow: isTr ? "Test akışı yükle" : "Load test flow",
        loading: isTr ? "Yükleniyor..." : "Loading...",
        empty: isTr ? "Henüz tanımlı bir Guided akışı yok." : "No Guided flow has been created yet.",
        noDescription: isTr ? "Açıklama yok" : "No description",
        published: isTr ? "Yayında" : "Published",
        draft: isTr ? "Taslak" : "Draft",
        editGuided: isTr ? "Guided düzenle" : "Edit Guided",
        createGuided: isTr ? "Guided oluştur" : "Create Guided",
        editorDescription: isTr
            ? "Başlangıç alias'larını, desteklenen kanalları, adımları, seçenekleri, kartları ve submit davranışını tanımlayın."
            : "Define start aliases, supported channels, steps, options, cards, and submit behavior.",
        structureTitle: isTr ? "Genel yapı" : "Structure",
        structureDescription: isTr
            ? "Akış başlığını, açıklamasını ve başlangıç noktasını tanımlayın."
            : "Define the flow title, description, and entry point.",
        availabilityTitle: isTr ? "Yayın ve erişim" : "Availability",
        availabilityDescription: isTr
            ? "Guided akışının hangi kanallarda ve hangi durumda çalışacağını belirleyin."
            : "Choose where the Guided flow is available and whether it is active.",
        builderTitle: isTr ? "Akış kurgusu" : "Flow builder",
        builderDescription: isTr
            ? "Adımları ayrı panellerde düzenleyin. Gerekmediğinde kapatıp daha rahat çalışabilirsiniz."
            : "Edit steps in separate panels and collapse sections when you do not need them.",
        title: isTr ? "Başlık" : "Title",
        startStepId: isTr ? "Başlangıç step id" : "Start step id",
        description: isTr ? "Açıklama" : "Description",
        startAliases: isTr ? "Başlangıç alias'ları" : "Start aliases",
        channels: isTr ? "Kanallar" : "Channels",
        publishedLabel: isTr ? "Yayında" : "Published",
        publishedDescription: isTr ? "Sadece aktif skill'ler widget ve omni menülerinde görünür." : "Only enabled skills appear in widget and omni menus.",
        steps: isTr ? "Adımlar" : "Steps",
        stepsDescription: isTr ? "Akışı adım adım kurgulayın. Her adım chip veya kart gösterebilir." : "Build the flow step by step. Each step can show chips or cards.",
        addStep: isTr ? "Adım ekle" : "Add step",
        step: isTr ? "Adım" : "Step",
        stepDetailsTitle: isTr ? "Adım detayları" : "Step details",
        stepDetailsDescription: isTr
            ? "Bu adımın id, sunum tipi ve prompt bilgisini yönetin."
            : "Manage this step's id, presentation type, and prompt.",
        up: isTr ? "Yukarı" : "Up",
        down: isTr ? "Aşağı" : "Down",
        remove: isTr ? "Kaldır" : "Remove",
        stepId: isTr ? "Step id" : "Step id",
        presentation: isTr ? "Sunum tipi" : "Presentation",
        cancelLabel: isTr ? "İptal etiketi" : "Cancel label",
        prompt: isTr ? "Prompt" : "Prompt",
        options: isTr ? "Seçenekler" : "Options",
        optionsDescription: isTr
            ? "Her seçenek için etiket, alias ve sonraki adım eşlemesini tanımlayın."
            : "Define the label, aliases, and next-step mapping for each option.",
        addOption: isTr ? "Seçenek ekle" : "Add option",
        option: isTr ? "Seçenek" : "Option",
        optionId: isTr ? "Seçenek id" : "Option id",
        label: isTr ? "Etiket" : "Label",
        aliases: isTr ? "Alias'lar" : "Aliases",
        nextStepId: isTr ? "Sonraki step id" : "Next step id",
        selectionValue: isTr ? "Seçim değeri" : "Selection value",
        payloadPatchJson: isTr ? "Payload patch JSON" : "Payload patch JSON",
        cards: isTr ? "Kartlar" : "Cards",
        addCard: isTr ? "Kart ekle" : "Add card",
        cardsDescription: isTr
            ? "Kart sunumunda her seçenek için görsel ve meta bilgileri özelleştirin."
            : "Customize the visuals and metadata for each option in card presentation.",
        cardsOptional: isTr ? "Kartlar opsiyoneldir. Boş bırakılırsa seçenek etiketlerinden jenerik kart üretilir." : "Cards are optional. If omitted, generic cards will be rendered from option labels.",
        card: isTr ? "Kart" : "Card",
        cardTitle: isTr ? "Kart başlığı" : "Card title",
        imageUrl: isTr ? "Görsel URL" : "Image URL",
        metadata: isTr ? "Meta bilgi" : "Metadata",
        badge: isTr ? "Rozet" : "Badge",
        submitTitle: isTr ? "Submit davranışı" : "Submit behavior",
        submitDescription: isTr
            ? "Bu adım için final CTA ekleyip onay veya aksiyon çalıştırabilirsiniz."
            : "Add a final CTA for this step and choose between confirmation or action mode.",
        enableSubmit: isTr ? "Submit'i etkinleştir" : "Enable submit",
        enableSubmitDesc: isTr ? "Bu adım için final bir CTA ekler." : "Adds a final CTA for this step.",
        submitMode: isTr ? "Submit modu" : "Submit mode",
        submitLabel: isTr ? "Submit etiketi" : "Submit label",
        actionId: isTr ? "Aksiyon id" : "Action id",
        successMessage: isTr ? "Başarı mesajı" : "Success message",
        externalUrl: isTr ? "Harici URL" : "External URL",
        delete: isTr ? "Sil" : "Delete",
        deleting: isTr ? "Siliniyor..." : "Deleting...",
        saving: isTr ? "Kaydediliyor..." : "Saving...",
        save: isTr ? "Guided kaydet" : "Save Guided",
        flows: isTr ? "Akışlar" : "Flows",
        flowsDescription: isTr
            ? "Guided akışlarını listeleyin, düzenleyin ve yayınlayın."
            : "List, edit, and publish Guided flows.",
        savedTitle: isTr ? "Kaydedildi" : "Saved",
        savedDescription: isTr ? "Guided akışı kaydedildi." : "Guided flow saved successfully.",
        testLoadedTitle: isTr ? "Test akışı hazır" : "Test flow ready",
        testLoadedDescription: isTr
            ? "Örnek test akışı editöre yüklendi. İstersen düzenleyip kaydedebilirsin."
            : "The sample test flow has been loaded into the editor. You can adjust it and save it.",
        deletedTitle: isTr ? "Silindi" : "Deleted",
        deletedDescription: isTr ? "Guided akışı kaldırıldı." : "Guided flow removed.",
        loadError: isTr ? "Guided akışları yüklenemedi." : "Failed to load Guided flows.",
        saveError: isTr ? "Guided akışı kaydedilemedi." : "Failed to save Guided flow.",
        deleteError: isTr ? "Guided akışı silinemedi." : "Failed to delete Guided flow.",
        chipsLabel: isTr ? "Chip" : "Chip",
        noPromptYet: isTr ? "Prompt henüz girilmedi." : "Prompt not set yet.",
        noLabelYet: isTr ? "Etiket henüz girilmedi." : "Label not set yet.",
        staysOnCurrentStep: isTr ? "aynı adım" : "same step",
        hasPayloadPatch: isTr ? "payload patch var" : "payload patch set",
        submitEnabledSummary: isTr ? "submit açık" : "submit enabled",
        submitDisabledSummary: isTr ? "submit kapalı" : "submit disabled",
        untitledCard: isTr ? "İsimsiz kart" : "Untitled card",
    }

    const loadSkills = async (preferredSkillId?: string | null) => {
        if (!user) return
        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/guided-skills?chatbotId=${encodeURIComponent(userId)}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            if (!response.ok) {
                throw new Error(copy.loadError)
            }
            const payload = await response.json()
            const nextSkills = Array.isArray(payload?.skills) ? payload.skills : []
            setSkills(nextSkills)

            const nextSelectedId =
                preferredSkillId && nextSkills.some((skill: GuidedSkillRecord) => skill.id === preferredSkillId)
                    ? preferredSkillId
                    : nextSkills[0]?.id || null

            setSelectedSkillId(nextSelectedId)
            setDraft(nextSelectedId ? skillToDraft(nextSkills.find((skill: GuidedSkillRecord) => skill.id === nextSelectedId)!) : createSkillDraft())
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : copy.loadError,
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadSkills()
    }, [userId, user])

    const updateDraft = (updater: (current: GuidedSkillDraft) => GuidedSkillDraft) => {
        setDraft((current) => updater(current))
    }

    const updateStep = (stepIndex: number, updater: (step: GuidedSkillStepDraft) => GuidedSkillStepDraft) => {
        updateDraft((current) => ({
            ...current,
            steps: current.steps.map((step, index) => (index === stepIndex ? updater(step) : step)),
        }))
    }

    const updateOption = (stepIndex: number, optionIndex: number, updater: (option: GuidedSkillOptionDraft) => GuidedSkillOptionDraft) => {
        updateStep(stepIndex, (step) => ({
            ...step,
            options: step.options.map((option, index) => (index === optionIndex ? updater(option) : option)),
        }))
    }

    const updateCard = (stepIndex: number, cardIndex: number, updater: (card: GuidedSkillCardDraft) => GuidedSkillCardDraft) => {
        updateStep(stepIndex, (step) => ({
            ...step,
            cards: step.cards.map((card, index) => (index === cardIndex ? updater(card) : card)),
        }))
    }

    const getStepSummary = (step: GuidedSkillStepDraft, stepIndex: number) => {
        const heading = truncateText(step.prompt, 110) || copy.noPromptYet
        const presentationLabel = step.presentation === "cards" ? copy.cards : copy.chipsLabel
        const meta = [
            step.id || `step-${stepIndex + 1}`,
            presentationLabel,
            `${step.options.length} ${copy.options.toLowerCase()}`,
            step.presentation === "cards" ? `${step.cards.length} ${copy.cards.toLowerCase()}` : null,
            step.submit.enabled ? copy.submitEnabledSummary : copy.submitDisabledSummary,
        ].filter(Boolean)

        return {
            heading,
            meta: meta.join(" • "),
        }
    }

    const getOptionSummary = (option: GuidedSkillOptionDraft) => {
        const heading = truncateText(option.label, 84) || copy.noLabelYet
        const aliasCount = parseCommaSeparated(option.aliasesText).length
        const meta = [
            option.id || copy.option,
            option.nextStepId.trim() || copy.staysOnCurrentStep,
            option.selectionValue.trim() || null,
            aliasCount > 0 ? `${aliasCount} ${copy.aliases.toLowerCase()}` : null,
            option.payloadPatchText.trim() ? copy.hasPayloadPatch : null,
        ].filter(Boolean)

        return {
            heading,
            meta: meta.join(" • "),
        }
    }

    const loadTestFlowTemplate = () => {
        setSelectedSkillId(null)
        setDraft(createTestSkillDraft(isTr))
        toast({
            title: copy.testLoadedTitle,
            description: copy.testLoadedDescription,
        })
    }

    const handleSave = async () => {
        if (!user) return
        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const skill = draftToSkill(draft, userId)
            const response = await fetch("/api/guided-skills", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chatbotId: userId,
                    skill,
                }),
            })
            if (!response.ok) {
                const payload = await response.json().catch(() => null)
                throw new Error(payload?.error || "Failed to save guided skill.")
            }

            const payload = await response.json()
            const savedSkillId = payload?.skill?.id || skill.id
            toast({ title: copy.savedTitle, description: copy.savedDescription })
            await loadSkills(savedSkillId)
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : copy.saveError,
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!user || !selectedSkillId) return
        setIsDeleting(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/guided-skills", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chatbotId: userId,
                    id: selectedSkillId,
                }),
            })
            if (!response.ok) {
                throw new Error(copy.deleteError)
            }
            toast({ title: copy.deletedTitle, description: copy.deletedDescription })
            setSelectedSkillId(null)
            setDraft(createSkillDraft())
            await loadSkills(null)
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : copy.deleteError,
                variant: "destructive",
            })
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="grid items-start gap-6 lg:grid-cols-[280px,minmax(0,1fr)]">
            <Card className="h-fit">
                <CardHeader>
                    <CardTitle>{moduleMode ? copy.flows : copy.guided}</CardTitle>
                    <CardDescription>{moduleMode ? copy.flowsDescription : copy.moduleDescription}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => {
                            setSelectedSkillId(null)
                            setDraft(createSkillDraft())
                        }}
                    >
                        {copy.newGuided}
                    </Button>
                    <Button className="w-full" variant="secondary" onClick={loadTestFlowTemplate}>
                        {copy.loadTestFlow}
                    </Button>
                    <div className="space-y-2">
                        {isLoading ? (
                            <p className="text-sm text-muted-foreground">{copy.loading}</p>
                        ) : skills.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{copy.empty}</p>
                        ) : (
                            skills.map((skill) => (
                                <button
                                    key={skill.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedSkillId(skill.id)
                                        setDraft(skillToDraft(skill))
                                    }}
                                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                                        selectedSkillId === skill.id
                                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                                            : "border-border hover:border-emerald-300 hover:bg-accent"
                                    }`}
                                >
                                    <div className="text-sm font-semibold">{skill.title}</div>
                                    <div className="mt-1 text-xs text-muted-foreground">{skill.description || copy.noDescription}</div>
                                    <div className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                                        {skill.enabled ? copy.published : copy.draft} · {skill.channels.join(", ")}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{selectedSkillId ? copy.editGuided : copy.createGuided}</CardTitle>
                        <CardDescription>{copy.editorDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="rounded-2xl border border-border/70 bg-muted/20 p-5">
                            <div className="space-y-1">
                                <h3 className="text-base font-semibold">{copy.structureTitle}</h3>
                                <p className="text-sm text-muted-foreground">{copy.structureDescription}</p>
                            </div>

                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="guided-title">{copy.title}</Label>
                                    <Input id="guided-title" value={draft.title} onChange={(event) => updateDraft((current) => ({ ...current, title: event.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="guided-start-step">{copy.startStepId}</Label>
                                    <Input id="guided-start-step" value={draft.startStepId} onChange={(event) => updateDraft((current) => ({ ...current, startStepId: event.target.value }))} />
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                <Label htmlFor="guided-description">{copy.description}</Label>
                                <Textarea id="guided-description" value={draft.description} onChange={(event) => updateDraft((current) => ({ ...current, description: event.target.value }))} />
                            </div>

                            <div className="mt-4 space-y-2">
                                <Label htmlFor="guided-start-aliases">{copy.startAliases}</Label>
                                <Input
                                    id="guided-start-aliases"
                                    placeholder="check-in, flight help"
                                    value={draft.startAliasesText}
                                    onChange={(event) => updateDraft((current) => ({ ...current, startAliasesText: event.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/70 bg-muted/20 p-5">
                            <div className="space-y-1">
                                <h3 className="text-base font-semibold">{copy.availabilityTitle}</h3>
                                <p className="text-sm text-muted-foreground">{copy.availabilityDescription}</p>
                            </div>

                            <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr),280px]">
                                <div className="space-y-2">
                                    <Label>{copy.channels}</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {CHANNELS.map((channel) => {
                                            const selected = draft.channels.includes(channel)
                                            return (
                                                <button
                                                    key={channel}
                                                    type="button"
                                                    onClick={() => updateDraft((current) => ({
                                                        ...current,
                                                        channels: selected
                                                            ? current.channels.filter((item) => item !== channel)
                                                            : [...current.channels, channel],
                                                    }))}
                                                    className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                                                        selected
                                                            ? "border-emerald-500 bg-emerald-500 text-white"
                                                            : "border-border bg-background text-muted-foreground hover:border-emerald-300"
                                                    }`}
                                                >
                                                    {channel}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={draft.enabled}
                                        onChange={(event) => updateDraft((current) => ({ ...current, enabled: event.target.checked }))}
                                    />
                                    <div>
                                        <div className="text-sm font-medium">{copy.publishedLabel}</div>
                                        <div className="text-xs text-muted-foreground">{copy.publishedDescription}</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <h3 className="text-base font-semibold">{copy.builderTitle}</h3>
                                    <p className="text-sm text-muted-foreground">{copy.builderDescription}</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => updateDraft((current) => ({
                                        ...current,
                                        steps: [...current.steps, createStepDraft(current.steps.length + 1)],
                                    }))}
                                >
                                    {copy.addStep}
                                </Button>
                            </div>

                            <Accordion
                                type="multiple"
                                defaultValue={draft.steps.map((_, index) => `step-${index}`)}
                                key={`${selectedSkillId ?? "new"}-${draft.steps.length}`}
                                className="space-y-3"
                            >
                                {draft.steps.map((step, stepIndex) => {
                                    const stepSummary = getStepSummary(step, stepIndex)
                                    return (
                                        <AccordionItem
                                            key={`${step.id}-${stepIndex}`}
                                            value={`step-${stepIndex}`}
                                            className="overflow-hidden rounded-2xl border border-border bg-background px-5"
                                        >
                                            <AccordionTrigger className="py-5 hover:no-underline">
                                                <div className="flex flex-1 flex-col items-start gap-2 pr-4 text-left">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                                            {copy.step} {stepIndex + 1}
                                                        </span>
                                                        <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                            {step.presentation === "cards" ? copy.cards : copy.chipsLabel}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm font-semibold text-foreground">{stepSummary.heading}</div>
                                                    <div className="text-xs text-muted-foreground">{stepSummary.meta}</div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-6 pt-1">
                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        <Button type="button" variant="outline" size="sm" onClick={() => updateDraft((current) => ({ ...current, steps: moveItem(current.steps, stepIndex, -1) }))}>
                                                            {copy.up}
                                                        </Button>
                                                        <Button type="button" variant="outline" size="sm" onClick={() => updateDraft((current) => ({ ...current, steps: moveItem(current.steps, stepIndex, 1) }))}>
                                                            {copy.down}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => updateDraft((current) => ({
                                                                ...current,
                                                                steps: current.steps.filter((_, index) => index !== stepIndex),
                                                            }))}
                                                            disabled={draft.steps.length === 1}
                                                        >
                                                            {copy.remove}
                                                        </Button>
                                                    </div>

                                                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                                                        <div className="space-y-1">
                                                            <h4 className="text-sm font-semibold">{copy.stepDetailsTitle}</h4>
                                                            <p className="text-xs text-muted-foreground">{copy.stepDetailsDescription}</p>
                                                        </div>

                                                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                                                            <div className="space-y-2">
                                                                <Label>{copy.stepId}</Label>
                                                                <Input value={step.id} onChange={(event) => updateStep(stepIndex, (current) => ({ ...current, id: event.target.value }))} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>{copy.presentation}</Label>
                                                                <select
                                                                    value={step.presentation}
                                                                    onChange={(event) => updateStep(stepIndex, (current) => ({ ...current, presentation: event.target.value as GuidedSkillStepPresentation }))}
                                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                                >
                                                                    <option value="chips">chips</option>
                                                                    <option value="cards">cards</option>
                                                                </select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>{copy.cancelLabel}</Label>
                                                                <Input value={step.cancelLabel} onChange={(event) => updateStep(stepIndex, (current) => ({ ...current, cancelLabel: event.target.value }))} />
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 space-y-2">
                                                            <Label>{copy.prompt}</Label>
                                                            <Textarea value={step.prompt} onChange={(event) => updateStep(stepIndex, (current) => ({ ...current, prompt: event.target.value }))} />
                                                        </div>
                                                    </div>

                                                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                                            <div className="space-y-1">
                                                                <h4 className="text-sm font-semibold">{copy.options}</h4>
                                                                <p className="text-xs text-muted-foreground">{copy.optionsDescription}</p>
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => updateStep(stepIndex, (current) => ({
                                                                    ...current,
                                                                    options: [...current.options, createOptionDraft(current.options.length + 1)],
                                                                }))}
                                                            >
                                                                {copy.addOption}
                                                            </Button>
                                                        </div>

                                                        <Accordion
                                                            type="multiple"
                                                            defaultValue={step.options.map((_, optionIndex) => `step-${stepIndex}-option-${optionIndex}`)}
                                                            key={`${selectedSkillId ?? "new"}-${stepIndex}-${step.options.length}`}
                                                            className="mt-4 space-y-3"
                                                        >
                                                            {step.options.map((option, optionIndex) => {
                                                                const optionSummary = getOptionSummary(option)
                                                                return (
                                                                    <AccordionItem
                                                                        key={`${option.id}-${optionIndex}`}
                                                                        value={`step-${stepIndex}-option-${optionIndex}`}
                                                                        className="overflow-hidden rounded-xl border border-border bg-background px-4"
                                                                    >
                                                                        <AccordionTrigger className="py-4 hover:no-underline">
                                                                            <div className="flex flex-1 flex-col items-start gap-1.5 pr-4 text-left">
                                                                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                                                                    {copy.option} {optionIndex + 1}
                                                                                </div>
                                                                                <div className="text-sm font-medium text-foreground">{optionSummary.heading}</div>
                                                                                <div className="text-xs text-muted-foreground">{optionSummary.meta}</div>
                                                                            </div>
                                                                        </AccordionTrigger>
                                                                        <AccordionContent>
                                                                            <div className="space-y-4 pt-1">
                                                                                <div className="flex justify-end">
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        onClick={() => updateStep(stepIndex, (current) => ({
                                                                                            ...current,
                                                                                            options: current.options.filter((_, index) => index !== optionIndex),
                                                                                        }))}
                                                                                        disabled={step.options.length === 1}
                                                                                    >
                                                                                        {copy.remove}
                                                                                    </Button>
                                                                                </div>

                                                                                <div className="grid gap-4 md:grid-cols-2">
                                                                                    <div className="space-y-2">
                                                                                        <Label>{copy.optionId}</Label>
                                                                                        <Input value={option.id} onChange={(event) => updateOption(stepIndex, optionIndex, (current) => ({ ...current, id: event.target.value }))} />
                                                                                    </div>
                                                                                    <div className="space-y-2">
                                                                                        <Label>{copy.label}</Label>
                                                                                        <Input value={option.label} onChange={(event) => updateOption(stepIndex, optionIndex, (current) => ({ ...current, label: event.target.value }))} />
                                                                                    </div>
                                                                                    <div className="space-y-2">
                                                                                        <Label>{copy.aliases}</Label>
                                                                                        <Input value={option.aliasesText} onChange={(event) => updateOption(stepIndex, optionIndex, (current) => ({ ...current, aliasesText: event.target.value }))} />
                                                                                    </div>
                                                                                    <div className="space-y-2">
                                                                                        <Label>{copy.nextStepId}</Label>
                                                                                        <Input value={option.nextStepId} onChange={(event) => updateOption(stepIndex, optionIndex, (current) => ({ ...current, nextStepId: event.target.value }))} />
                                                                                    </div>
                                                                                    <div className="space-y-2 md:col-span-2">
                                                                                        <Label>{copy.selectionValue}</Label>
                                                                                        <Input value={option.selectionValue} onChange={(event) => updateOption(stepIndex, optionIndex, (current) => ({ ...current, selectionValue: event.target.value }))} />
                                                                                    </div>
                                                                                </div>

                                                                                <div className="space-y-2">
                                                                                    <Label>{copy.payloadPatchJson}</Label>
                                                                                    <Textarea value={option.payloadPatchText} onChange={(event) => updateOption(stepIndex, optionIndex, (current) => ({ ...current, payloadPatchText: event.target.value }))} />
                                                                                </div>
                                                                            </div>
                                                                        </AccordionContent>
                                                                    </AccordionItem>
                                                                )
                                                            })}
                                                        </Accordion>
                                                    </div>

                                                    {step.presentation === "cards" ? (
                                                        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                                <div className="space-y-1">
                                                                    <h4 className="text-sm font-semibold">{copy.cards}</h4>
                                                                    <p className="text-xs text-muted-foreground">{copy.cardsDescription}</p>
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => updateStep(stepIndex, (current) => ({
                                                                        ...current,
                                                                        cards: [...current.cards, createCardDraft()],
                                                                    }))}
                                                                >
                                                                    {copy.addCard}
                                                                </Button>
                                                            </div>

                                                            {step.cards.length === 0 ? (
                                                                <p className="mt-4 text-sm text-muted-foreground">{copy.cardsOptional}</p>
                                                            ) : (
                                                                <div className="mt-4 space-y-3">
                                                                    {step.cards.map((card, cardIndex) => (
                                                                        <div key={`${card.optionId}-${cardIndex}`} className="space-y-4 rounded-xl border border-border bg-background p-4">
                                                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                                                <div>
                                                                                    <p className="text-sm font-semibold">
                                                                                        {copy.card} {cardIndex + 1}
                                                                                    </p>
                                                                                    <p className="text-xs text-muted-foreground">
                                                                                        {truncateText(card.title, 72) || copy.untitledCard}
                                                                                    </p>
                                                                                </div>
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    onClick={() => updateStep(stepIndex, (current) => ({
                                                                                        ...current,
                                                                                        cards: current.cards.filter((_, index) => index !== cardIndex),
                                                                                    }))}
                                                                                >
                                                                                    {copy.remove}
                                                                                </Button>
                                                                            </div>

                                                                            <div className="grid gap-4 md:grid-cols-2">
                                                                                <div className="space-y-2">
                                                                                    <Label>{copy.optionId}</Label>
                                                                                    <Input value={card.optionId} onChange={(event) => updateCard(stepIndex, cardIndex, (current) => ({ ...current, optionId: event.target.value }))} />
                                                                                </div>
                                                                                <div className="space-y-2">
                                                                                    <Label>{copy.cardTitle}</Label>
                                                                                    <Input value={card.title} onChange={(event) => updateCard(stepIndex, cardIndex, (current) => ({ ...current, title: event.target.value }))} />
                                                                                </div>
                                                                                <div className="space-y-2">
                                                                                    <Label>{copy.description}</Label>
                                                                                    <Input value={card.description} onChange={(event) => updateCard(stepIndex, cardIndex, (current) => ({ ...current, description: event.target.value }))} />
                                                                                </div>
                                                                                <div className="space-y-2">
                                                                                    <Label>{copy.badge}</Label>
                                                                                    <Input value={card.badge} onChange={(event) => updateCard(stepIndex, cardIndex, (current) => ({ ...current, badge: event.target.value }))} />
                                                                                </div>
                                                                                <div className="space-y-2">
                                                                                    <Label>{copy.metadata}</Label>
                                                                                    <Input value={card.metadata} onChange={(event) => updateCard(stepIndex, cardIndex, (current) => ({ ...current, metadata: event.target.value }))} />
                                                                                </div>
                                                                                <div className="space-y-2">
                                                                                    <Label>{copy.imageUrl}</Label>
                                                                                    <Input value={card.imageUrl} onChange={(event) => updateCard(stepIndex, cardIndex, (current) => ({ ...current, imageUrl: event.target.value }))} />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : null}

                                                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                                                        <div className="space-y-1">
                                                            <h4 className="text-sm font-semibold">{copy.submitTitle}</h4>
                                                            <p className="text-xs text-muted-foreground">{copy.submitDescription}</p>
                                                        </div>

                                                        <label className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={step.submit.enabled}
                                                                onChange={(event) => updateStep(stepIndex, (current) => ({
                                                                    ...current,
                                                                    submit: { ...current.submit, enabled: event.target.checked },
                                                                }))}
                                                            />
                                                            <div>
                                                                <div className="text-sm font-medium">{copy.enableSubmit}</div>
                                                                <div className="text-xs text-muted-foreground">{copy.enableSubmitDesc}</div>
                                                            </div>
                                                        </label>

                                                        {step.submit.enabled ? (
                                                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                                                <div className="space-y-2">
                                                                    <Label>{copy.submitMode}</Label>
                                                                    <select
                                                                        value={step.submit.mode}
                                                                        onChange={(event) => updateStep(stepIndex, (current) => ({
                                                                            ...current,
                                                                            submit: { ...current.submit, mode: event.target.value as GuidedSkillSubmit["mode"] },
                                                                        }))}
                                                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                                    >
                                                                        <option value="confirm_only">confirm_only</option>
                                                                        <option value="omni_action">omni_action</option>
                                                                    </select>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>{copy.submitLabel}</Label>
                                                                    <Input value={step.submit.label} onChange={(event) => updateStep(stepIndex, (current) => ({ ...current, submit: { ...current.submit, label: event.target.value } }))} />
                                                                </div>
                                                                {step.submit.mode === "omni_action" ? (
                                                                    <div className="space-y-2">
                                                                        <Label>{copy.actionId}</Label>
                                                                        <Input value={step.submit.actionId} onChange={(event) => updateStep(stepIndex, (current) => ({ ...current, submit: { ...current.submit, actionId: event.target.value } }))} />
                                                                    </div>
                                                                ) : null}
                                                                <div className="space-y-2 md:col-span-2">
                                                                    <Label>{copy.successMessage}</Label>
                                                                    <Textarea value={step.submit.successMessage} onChange={(event) => updateStep(stepIndex, (current) => ({ ...current, submit: { ...current.submit, successMessage: event.target.value } }))} />
                                                                </div>
                                                                <div className="space-y-2 md:col-span-2">
                                                                    <Label>{copy.externalUrl}</Label>
                                                                    <Input value={step.submit.externalUrl} onChange={(event) => updateStep(stepIndex, (current) => ({ ...current, submit: { ...current.submit, externalUrl: event.target.value } }))} />
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    )
                                })}
                            </Accordion>
                        </div>

                        <div className="flex flex-wrap justify-end gap-3">
                            {selectedSkillId ? (
                                <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting || isSaving}>
                                    {isDeleting ? copy.deleting : copy.delete}
                                </Button>
                            ) : null}
                            <Button type="button" onClick={handleSave} disabled={isSaving || isDeleting}>
                                {isSaving ? copy.saving : copy.save}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
