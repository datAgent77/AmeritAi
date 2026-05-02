"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { SURVEY_OTHER_CHOICE_VALUE } from "@/lib/surveys/types"
import type { PublicSurveyDefinition, SurveyQuestion } from "@/lib/surveys/types"

type SurveyLocale = "tr" | "en" | "es" | "fr" | "de"

type DraftAnswer = {
    value: string | string[] | number | null
    otherText: string
}

type SurveyResponseFormProps = {
    survey: PublicSurveyDefinition
    brandColor?: string
    mode?: "page" | "widget"
    language?: string
    submitLabel?: string
    showSurveyHeader?: boolean
    completeInternally?: boolean
    onSubmit: (payload: {
        consentAccepted: boolean
        answers: Record<string, { value: string | string[] | number | null; otherText?: string }>
        contact: {
            name?: string
            email?: string
            phone?: string
        }
    }) => Promise<void>
    onSubmitted?: () => void
}

const SURVEY_COPY: Record<SurveyLocale, {
    step: (current: number, total: number) => string
    requiredQuestion: string
    otherRequired: string
    chooseAtLeastOne: string
    invalidNumber: string
    consentRequired: string
    nameRequired: string
    emailRequired: string
    phoneRequired: string
    submitFailed: string
    contactTitle: string
    other: string
    otherPlaceholder: string
    shortTextPlaceholder: string
    longTextPlaceholder: string
    numberPlaceholder: string
    fullName: string
    email: string
    phone: string
    previous: string
    next: string
    submitting: string
    completeSurvey: string
    requiredSuffix: string
}> = {
    tr: {
        step: (current, total) => `Adım ${current} / ${total}`,
        requiredQuestion: "Bu soru zorunlu.",
        otherRequired: "Diğer seçeneği için açıklama girin.",
        chooseAtLeastOne: "En az bir seçenek seçin.",
        invalidNumber: "Geçerli bir sayı girin.",
        consentRequired: "Devam etmeden önce aydınlatma onayını vermeniz gerekiyor.",
        nameRequired: "Ad soyad zorunlu.",
        emailRequired: "E-posta zorunlu.",
        phoneRequired: "Telefon zorunlu.",
        submitFailed: "Anket gönderilemedi.",
        contactTitle: "İletişim Bilgileri",
        other: "Diğer",
        otherPlaceholder: "Diğer seçeneği yazın",
        shortTextPlaceholder: "Cevabınızı yazın",
        longTextPlaceholder: "Cevabınızı detaylandırın",
        numberPlaceholder: "Sayısal değer girin",
        fullName: "Ad Soyad",
        email: "E-posta",
        phone: "Telefon",
        previous: "Geri",
        next: "Devam",
        submitting: "Gönderiliyor...",
        completeSurvey: "Anketi Tamamla",
        requiredSuffix: "zorunlu",
    },
    en: {
        step: (current, total) => `Step ${current} / ${total}`,
        requiredQuestion: "This question is required.",
        otherRequired: "Please explain the other option.",
        chooseAtLeastOne: "Select at least one option.",
        invalidNumber: "Enter a valid number.",
        consentRequired: "Please accept the consent notice before continuing.",
        nameRequired: "Full name is required.",
        emailRequired: "Email is required.",
        phoneRequired: "Phone is required.",
        submitFailed: "Survey could not be submitted.",
        contactTitle: "Contact Information",
        other: "Other",
        otherPlaceholder: "Write the other option",
        shortTextPlaceholder: "Write your answer",
        longTextPlaceholder: "Add more detail",
        numberPlaceholder: "Enter a numeric value",
        fullName: "Full Name",
        email: "Email",
        phone: "Phone",
        previous: "Back",
        next: "Continue",
        submitting: "Submitting...",
        completeSurvey: "Complete Survey",
        requiredSuffix: "required",
    },
    es: {
        step: (current, total) => `Paso ${current} / ${total}`,
        requiredQuestion: "Esta pregunta es obligatoria.",
        otherRequired: "Explica la opción Otro.",
        chooseAtLeastOne: "Selecciona al menos una opción.",
        invalidNumber: "Introduce un número válido.",
        consentRequired: "Acepta el aviso de consentimiento antes de continuar.",
        nameRequired: "El nombre completo es obligatorio.",
        emailRequired: "El correo electrónico es obligatorio.",
        phoneRequired: "El teléfono es obligatorio.",
        submitFailed: "No se pudo enviar la encuesta.",
        contactTitle: "Información de contacto",
        other: "Otro",
        otherPlaceholder: "Escribe la otra opción",
        shortTextPlaceholder: "Escribe tu respuesta",
        longTextPlaceholder: "Añade más detalles",
        numberPlaceholder: "Introduce un valor numérico",
        fullName: "Nombre completo",
        email: "Correo electrónico",
        phone: "Teléfono",
        previous: "Atrás",
        next: "Continuar",
        submitting: "Enviando...",
        completeSurvey: "Completar encuesta",
        requiredSuffix: "obligatorio",
    },
    fr: {
        step: (current, total) => `Étape ${current} / ${total}`,
        requiredQuestion: "Cette question est obligatoire.",
        otherRequired: "Veuillez préciser l'option Autre.",
        chooseAtLeastOne: "Sélectionnez au moins une option.",
        invalidNumber: "Saisissez un nombre valide.",
        consentRequired: "Veuillez accepter l'avis de consentement avant de continuer.",
        nameRequired: "Le nom complet est obligatoire.",
        emailRequired: "L'e-mail est obligatoire.",
        phoneRequired: "Le téléphone est obligatoire.",
        submitFailed: "Impossible d'envoyer le questionnaire.",
        contactTitle: "Coordonnées",
        other: "Autre",
        otherPlaceholder: "Écrivez l'autre option",
        shortTextPlaceholder: "Écrivez votre réponse",
        longTextPlaceholder: "Ajoutez plus de détails",
        numberPlaceholder: "Saisissez une valeur numérique",
        fullName: "Nom complet",
        email: "E-mail",
        phone: "Téléphone",
        previous: "Retour",
        next: "Continuer",
        submitting: "Envoi...",
        completeSurvey: "Terminer le questionnaire",
        requiredSuffix: "obligatoire",
    },
    de: {
        step: (current, total) => `Schritt ${current} / ${total}`,
        requiredQuestion: "Diese Frage ist erforderlich.",
        otherRequired: "Bitte erläutern Sie die Option Sonstiges.",
        chooseAtLeastOne: "Wählen Sie mindestens eine Option aus.",
        invalidNumber: "Geben Sie eine gültige Zahl ein.",
        consentRequired: "Bitte akzeptieren Sie den Hinweis, bevor Sie fortfahren.",
        nameRequired: "Vollständiger Name ist erforderlich.",
        emailRequired: "E-Mail ist erforderlich.",
        phoneRequired: "Telefon ist erforderlich.",
        submitFailed: "Umfrage konnte nicht gesendet werden.",
        contactTitle: "Kontaktinformationen",
        other: "Sonstiges",
        otherPlaceholder: "Andere Option eingeben",
        shortTextPlaceholder: "Antwort eingeben",
        longTextPlaceholder: "Weitere Details hinzufügen",
        numberPlaceholder: "Numerischen Wert eingeben",
        fullName: "Vollständiger Name",
        email: "E-Mail",
        phone: "Telefon",
        previous: "Zurück",
        next: "Weiter",
        submitting: "Wird gesendet...",
        completeSurvey: "Umfrage abschließen",
        requiredSuffix: "erforderlich",
    },
}

function resolveSurveyLocale(language?: string | null): SurveyLocale {
    const locale = String(language || "").toLowerCase().split(/[-_]/)[0]
    return locale === "tr" || locale === "es" || locale === "fr" || locale === "de" ? locale : "en"
}

function hasVisibleContactFields(survey: PublicSurveyDefinition) {
    const config = survey.contactCapture
    return config.enabled && (config.nameEnabled || config.emailEnabled || config.phoneEnabled)
}

function isEmptyValue(value: DraftAnswer["value"]) {
    return value === null || value === "" || (Array.isArray(value) && value.length === 0)
}

function getQuestionError(question: SurveyQuestion, answer: DraftAnswer, copy: (typeof SURVEY_COPY)[SurveyLocale]) {
    if (!question.required && isEmptyValue(answer.value)) {
        return null
    }

    if (question.type === "singleChoice") {
        if (question.required && typeof answer.value !== "string") {
            return copy.requiredQuestion
        }
        if (answer.value === SURVEY_OTHER_CHOICE_VALUE && !answer.otherText.trim()) {
            return copy.otherRequired
        }
        return null
    }

    if (question.type === "multiChoice") {
        if (question.required && (!Array.isArray(answer.value) || answer.value.length === 0)) {
            return copy.chooseAtLeastOne
        }
        if (Array.isArray(answer.value) && answer.value.includes(SURVEY_OTHER_CHOICE_VALUE) && !answer.otherText.trim()) {
            return copy.otherRequired
        }
        return null
    }

    if (question.type === "number") {
        if (question.required && (answer.value === null || answer.value === "")) {
            return copy.requiredQuestion
        }
        if (answer.value !== null && answer.value !== "" && !Number.isFinite(Number(answer.value))) {
            return copy.invalidNumber
        }
        return null
    }

    if (question.required && (answer.value === null || String(answer.value || "").trim() === "")) {
        return copy.requiredQuestion
    }

    return null
}

export function SurveyResponseForm({
    survey,
    brandColor = "#111827",
    mode = "page",
    language,
    submitLabel,
    showSurveyHeader = true,
    completeInternally = true,
    onSubmit,
    onSubmitted,
}: SurveyResponseFormProps) {
    const resolvedLanguage = language || (typeof navigator !== "undefined" ? navigator.language : "en")
    const copy = SURVEY_COPY[resolveSurveyLocale(resolvedLanguage)]
    const [stepIndex, setStepIndex] = useState(0)
    const [consentAccepted, setConsentAccepted] = useState(false)
    const [answers, setAnswers] = useState<Record<string, DraftAnswer>>({})
    const [contact, setContact] = useState({ name: "", email: "", phone: "" })
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isCompleted, setIsCompleted] = useState(false)

    const hasContactStep = hasVisibleContactFields(survey)
    const totalSteps = 1 + survey.questions.length + (hasContactStep ? 1 : 0)
    const questionStepStart = 1
    const contactStepIndex = hasContactStep ? totalSteps - 1 : -1
    const isIntroStep = stepIndex === 0
    const isQuestionStep = stepIndex >= questionStepStart && stepIndex < questionStepStart + survey.questions.length
    const isContactStep = hasContactStep && stepIndex === contactStepIndex
    const activeQuestion = isQuestionStep ? survey.questions[stepIndex - questionStepStart] : null
    const progressValue = useMemo(() => {
        if (totalSteps <= 1) return 0
        return Math.min(100, Math.round((stepIndex / (totalSteps - 1)) * 100))
    }, [stepIndex, totalSteps])

    const currentAnswer = activeQuestion
        ? answers[activeQuestion.id] || { value: activeQuestion.type === "multiChoice" ? [] : null, otherText: "" }
        : null

    const getOptionLabel = (question: SurveyQuestion, option: string) => question.optionLabels?.[option] || option

    const updateAnswer = (questionId: string, updater: (current: DraftAnswer) => DraftAnswer) => {
        setAnswers((current) => {
            const existing = current[questionId] || { value: null, otherText: "" }
            return {
                ...current,
                [questionId]: updater(existing),
            }
        })
        setError(null)
    }

    const validateCurrentStep = () => {
        if (isIntroStep) {
            if (survey.consent.required && !consentAccepted) {
                return copy.consentRequired
            }
            return null
        }

        if (activeQuestion && currentAnswer) {
            return getQuestionError(activeQuestion, currentAnswer, copy)
        }

        if (isContactStep) {
            const capture = survey.contactCapture
            if (capture.nameEnabled && capture.nameRequired && !contact.name.trim()) return copy.nameRequired
            if (capture.emailEnabled && capture.emailRequired && !contact.email.trim()) return copy.emailRequired
            if (capture.phoneEnabled && capture.phoneRequired && !contact.phone.trim()) return copy.phoneRequired
        }

        return null
    }

    const handleNext = () => {
        const nextError = validateCurrentStep()
        if (nextError) {
            setError(nextError)
            return
        }

        setError(null)
        setStepIndex((current) => Math.min(current + 1, totalSteps - 1))
    }

    const handlePrevious = () => {
        setError(null)
        setStepIndex((current) => Math.max(current - 1, 0))
    }

    const handleSubmit = async () => {
        const nextError = validateCurrentStep()
        if (nextError) {
            setError(nextError)
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            await onSubmit({
                consentAccepted,
                answers: Object.fromEntries(
                    Object.entries(answers).map(([questionId, answer]) => [
                        questionId,
                        {
                            value: answer.value,
                            otherText: answer.otherText || undefined,
                        },
                    ])
                ),
                contact,
            })

            if (completeInternally) {
                setIsCompleted(true)
            }
            onSubmitted?.()
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : copy.submitFailed)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isCompleted) {
        return (
            <Card className={cn(mode === "widget" && "border-none bg-transparent shadow-none")}>
                <CardContent className={cn("flex flex-col items-center gap-4 p-8 text-center", mode === "widget" && "px-0 py-6")}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full text-white" style={{ backgroundColor: brandColor }}>
                        <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-semibold">{survey.thankYouTitle}</h3>
                        <p className="text-sm text-muted-foreground">{survey.thankYouText}</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className={cn(mode === "widget" && "flex h-full min-h-0 flex-col border-none bg-transparent shadow-none")}>
            <CardHeader className={cn("space-y-4", mode === "widget" && "shrink-0 px-0 pt-0")}>
                {showSurveyHeader && (
                    <div className="space-y-1">
                        <CardTitle className={cn(mode === "widget" && "text-lg")}>{survey.title}</CardTitle>
                        {survey.description && <CardDescription>{survey.description}</CardDescription>}
                    </div>
                )}
                <Progress value={progressValue} className="h-2" />
                <p className="text-xs font-medium text-muted-foreground">{copy.step(stepIndex + 1, totalSteps)}</p>
            </CardHeader>
            <CardContent className={cn("space-y-6", mode === "widget" && "flex min-h-0 flex-1 flex-col space-y-0 px-0 pb-0")}>
                <div className={cn("space-y-6", mode === "widget" && "min-h-0 flex-1 overflow-y-auto pb-4 pr-1")}>
                    {isIntroStep && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <h3 className={cn("text-xl font-semibold", mode === "widget" && "text-lg")}>{survey.introTitle}</h3>
                                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{survey.introText}</p>
                            </div>
                            <div className="rounded-2xl border bg-muted/30 p-4">
                                <h4 className="font-medium">{survey.consent.title}</h4>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{survey.consent.body}</p>
                                <div className="mt-4 flex items-start gap-3">
                                    <Checkbox
                                        id={`survey-consent-${survey.id}`}
                                        checked={consentAccepted}
                                        onCheckedChange={(checked) => {
                                            setConsentAccepted(Boolean(checked))
                                            setError(null)
                                        }}
                                    />
                                    <Label htmlFor={`survey-consent-${survey.id}`} className="text-sm leading-6">
                                        {survey.consent.checkboxLabel}
                                    </Label>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeQuestion && currentAnswer && (
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <h3 className={cn("text-xl font-semibold", mode === "widget" && "text-lg")}>
                                    {activeQuestion.title}
                                    {activeQuestion.required && <span className="ml-1 text-sm font-medium text-red-500" aria-label={copy.requiredSuffix}>*</span>}
                                </h3>
                                {activeQuestion.description && (
                                    <p className="text-sm leading-6 text-muted-foreground">{activeQuestion.description}</p>
                                )}
                            </div>

                            {(activeQuestion.type === "singleChoice" || activeQuestion.type === "multiChoice") && (
                                <div className="space-y-3">
                                    {(activeQuestion.options || []).map((option) => {
                                        const checked = activeQuestion.type === "singleChoice"
                                            ? currentAnswer.value === option
                                            : Array.isArray(currentAnswer.value) && currentAnswer.value.includes(option)

                                        return (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => {
                                                    if (activeQuestion.type === "singleChoice") {
                                                        updateAnswer(activeQuestion.id, (current) => ({
                                                            ...current,
                                                            value: option,
                                                            otherText: "",
                                                        }))
                                                        return
                                                    }

                                                    updateAnswer(activeQuestion.id, (current) => {
                                                        const values = Array.isArray(current.value) ? current.value : []
                                                        const nextValues = values.includes(option)
                                                            ? values.filter((value) => value !== option)
                                                            : [...values, option]
                                                        return {
                                                            ...current,
                                                            value: nextValues,
                                                        }
                                                    })
                                                }}
                                                aria-pressed={checked}
                                                className={cn(
                                                    "w-full rounded-xl border px-4 py-3 text-left text-sm leading-5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2",
                                                    checked
                                                        ? "border-transparent text-white shadow-md"
                                                        : "border-border bg-background hover:bg-muted/40 hover:shadow-sm"
                                                )}
                                                style={checked ? { backgroundColor: brandColor } : undefined}
                                            >
                                                {getOptionLabel(activeQuestion, option)}
                                            </button>
                                        )
                                    })}

                                    {activeQuestion.allowOther && (
                                        <div className="space-y-3 rounded-2xl border border-dashed bg-muted/20 p-4">
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    id={`${activeQuestion.id}-other`}
                                                    checked={
                                                        activeQuestion.type === "singleChoice"
                                                            ? currentAnswer.value === SURVEY_OTHER_CHOICE_VALUE
                                                            : Array.isArray(currentAnswer.value) && currentAnswer.value.includes(SURVEY_OTHER_CHOICE_VALUE)
                                                    }
                                                    onCheckedChange={(checked) => {
                                                        if (activeQuestion.type === "singleChoice") {
                                                            updateAnswer(activeQuestion.id, (current) => ({
                                                                ...current,
                                                                value: checked ? SURVEY_OTHER_CHOICE_VALUE : null,
                                                                otherText: checked ? current.otherText : "",
                                                            }))
                                                            return
                                                        }

                                                        updateAnswer(activeQuestion.id, (current) => {
                                                            const values = Array.isArray(current.value) ? current.value : []
                                                            const nextValues = checked
                                                                ? [...values, SURVEY_OTHER_CHOICE_VALUE]
                                                                : values.filter((value) => value !== SURVEY_OTHER_CHOICE_VALUE)
                                                            return {
                                                                ...current,
                                                                value: nextValues,
                                                                otherText: checked ? current.otherText : "",
                                                            }
                                                        })
                                                    }}
                                                />
                                                <Label htmlFor={`${activeQuestion.id}-other`}>{copy.other}</Label>
                                            </div>
                                            {((activeQuestion.type === "singleChoice" && currentAnswer.value === SURVEY_OTHER_CHOICE_VALUE)
                                                || (activeQuestion.type === "multiChoice"
                                                    && Array.isArray(currentAnswer.value)
                                                    && currentAnswer.value.includes(SURVEY_OTHER_CHOICE_VALUE))) && (
                                                <Input
                                                    value={currentAnswer.otherText}
                                                    onChange={(event) => {
                                                        updateAnswer(activeQuestion.id, (current) => ({
                                                            ...current,
                                                            otherText: event.target.value,
                                                        }))
                                                    }}
                                                    placeholder={copy.otherPlaceholder}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeQuestion.type === "shortText" && (
                                <Input
                                    value={typeof currentAnswer.value === "string" ? currentAnswer.value : ""}
                                    onChange={(event) => updateAnswer(activeQuestion.id, (current) => ({
                                        ...current,
                                        value: event.target.value,
                                    }))}
                                    placeholder={copy.shortTextPlaceholder}
                                />
                            )}

                            {activeQuestion.type === "longText" && (
                                <Textarea
                                    rows={5}
                                    value={typeof currentAnswer.value === "string" ? currentAnswer.value : ""}
                                    onChange={(event) => updateAnswer(activeQuestion.id, (current) => ({
                                        ...current,
                                        value: event.target.value,
                                    }))}
                                    placeholder={copy.longTextPlaceholder}
                                />
                            )}

                            {activeQuestion.type === "number" && (
                                <Input
                                    type="number"
                                    value={currentAnswer.value === null ? "" : String(currentAnswer.value)}
                                    onChange={(event) => updateAnswer(activeQuestion.id, (current) => ({
                                        ...current,
                                        value: event.target.value,
                                    }))}
                                    placeholder={copy.numberPlaceholder}
                                />
                            )}
                        </div>
                    )}

                    {isContactStep && (
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <h3 className={cn("text-xl font-semibold", mode === "widget" && "text-lg")}>{survey.contactCapture.title || copy.contactTitle}</h3>
                                {survey.contactCapture.description && (
                                    <p className="text-sm leading-6 text-muted-foreground">{survey.contactCapture.description}</p>
                                )}
                            </div>
                            <div className="space-y-4">
                                {survey.contactCapture.nameEnabled && (
                                    <div className="space-y-2">
                                        <Label htmlFor={`survey-contact-name-${survey.id}`}>{copy.fullName}</Label>
                                        <Input
                                            id={`survey-contact-name-${survey.id}`}
                                            autoComplete="name"
                                            value={contact.name}
                                            onChange={(event) => {
                                                setContact((current) => ({ ...current, name: event.target.value }))
                                                setError(null)
                                            }}
                                            placeholder={copy.fullName}
                                        />
                                    </div>
                                )}
                                {survey.contactCapture.emailEnabled && (
                                    <div className="space-y-2">
                                        <Label htmlFor={`survey-contact-email-${survey.id}`}>{copy.email}</Label>
                                        <Input
                                            id={`survey-contact-email-${survey.id}`}
                                            type="email"
                                            autoComplete="email"
                                            value={contact.email}
                                            onChange={(event) => {
                                                setContact((current) => ({ ...current, email: event.target.value }))
                                                setError(null)
                                            }}
                                            placeholder={copy.email}
                                        />
                                    </div>
                                )}
                                {survey.contactCapture.phoneEnabled && (
                                    <div className="space-y-2">
                                        <Label htmlFor={`survey-contact-phone-${survey.id}`}>{copy.phone}</Label>
                                        <Input
                                            id={`survey-contact-phone-${survey.id}`}
                                            type="tel"
                                            autoComplete="tel"
                                            value={contact.phone}
                                            onChange={(event) => {
                                                setContact((current) => ({ ...current, phone: event.target.value }))
                                                setError(null)
                                            }}
                                            placeholder={copy.phone}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                <div className={cn(
                    "flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between",
                    mode === "widget" && "grid shrink-0 grid-cols-2 border-t bg-background pt-3 sm:grid-cols-2"
                )}>
                    <Button type="button" variant="outline" onClick={handlePrevious} disabled={stepIndex === 0 || isSubmitting} className="w-full sm:w-auto">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {copy.previous}
                    </Button>

                    {stepIndex < totalSteps - 1 ? (
                        <Button type="button" onClick={handleNext} className={cn("w-full text-white shadow-md hover:opacity-90 sm:w-auto", mode === "widget" && "sm:w-full")} style={{ backgroundColor: brandColor }}>
                            {copy.next}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className={cn("w-full text-white shadow-md hover:opacity-90 sm:w-auto", mode === "widget" && "sm:w-full")} style={{ backgroundColor: brandColor }}>
                            {isSubmitting ? copy.submitting : (submitLabel || copy.completeSurvey)}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
