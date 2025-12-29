"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { MessageSquare, Send, Save, Loader2, Image as ImageIcon, Trash2, ExternalLink } from "lucide-react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db, storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { Switch } from "@/components/ui/switch"

interface BrandingSettingsProps {
    targetUserId?: string
}

export function BrandingSettings({ targetUserId }: BrandingSettingsProps) {
    const { user } = useAuth()
    const { t } = useLanguage()
    // Use targetUserId if provided (for admin), otherwise use logged-in user's ID
    const userId = targetUserId || user?.uid

    const [settings, setSettings] = useState({
        companyName: "Acme Corp",
        welcomeMessage: "Hello! How can I help you today?",
        brandColor: "#000000",
        brandLogo: "",
        suggestedQuestions: ["What are your pricing plans?", "How do I get started?", "Contact support"],
        enableLeadCollection: false
    })
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [initialSettings, setInitialSettings] = useState<typeof settings | null>(null)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const { toast } = useToast()

    // Check if settings have changed
    // Check if settings have changed
    const isDirty = initialSettings && JSON.stringify(settings) !== JSON.stringify(initialSettings)

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            if (!userId) return

            setIsLoading(true)
            try {
                const docRef = doc(db, "chatbots", userId)
                const docSnap = await getDoc(docRef)
                if (docSnap.exists()) {
                    const data = docSnap.data()
                    const loadedSettings = {
                        companyName: data.companyName || "Acme Corp",
                        welcomeMessage: data.welcomeMessage || "Hello! How can I help you today?",
                        brandColor: data.brandColor || "#000000",
                        brandLogo: data.brandLogo || "",
                        suggestedQuestions: data.suggestedQuestions || ["What are your pricing plans?", "How do I get started?", "Contact support"],
                        enableLeadCollection: data.enableLeadCollection || false
                    }
                    setSettings(loadedSettings)
                    setInitialSettings(loadedSettings)
                } else {
                    const defaultSettings = {
                        companyName: "Acme Corp",
                        welcomeMessage: "Hello! How can I help you today?",
                        brandColor: "#000000",
                        brandLogo: "",
                        suggestedQuestions: ["What are your pricing plans?", "How do I get started?", "Contact support"],
                        enableLeadCollection: false
                    }
                    setSettings(defaultSettings)
                    setInitialSettings(defaultSettings)
                }
            } catch (error) {
                console.error("Error loading settings:", error)
                toast({
                    title: "Error",
                    description: "Failed to load settings. Please try again.",
                    variant: "destructive",
                })
            } finally {
                setIsLoading(false)
            }
        }
        loadSettings()
    }, [userId, toast])

    const handleSave = async () => {
        if (!userId) return

        setIsSaving(true)
        try {
            await setDoc(doc(db, "chatbots", userId), {
                ...settings,
                updatedAt: new Date().toISOString(),
            }, { merge: true })

            // Update initial settings after save
            setInitialSettings(settings)

            toast({
                title: "Success",
                description: "Branding settings saved successfully.",
            })
        } catch (error) {
            console.error("Error saving settings:", error)
            toast({
                title: "Error",
                description: "Failed to save settings. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !user) return

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            toast({
                title: "Error",
                description: "File size exceeds 2MB limit.",
                variant: "destructive",
            })
            return
        }

        setIsUploading(true)
        try {
            // Upload to the current user's folder to ensure we have permission (storage rules usually allow write to own folder)
            // We verify user exists with the check above (!user return)
            const timestamp = Date.now()
            const storageRef = ref(storage, `logos/${user.uid}/${timestamp}-${file.name}`)
            await uploadBytes(storageRef, file)
            const downloadURL = await getDownloadURL(storageRef)

            setSettings(prev => ({ ...prev, brandLogo: downloadURL }))
            toast({
                title: "Success",
                description: "Logo uploaded successfully. Remember to save changes.",
            })
        } catch (error: any) {
            console.error("Error uploading logo:", error)
            toast({
                title: "Error",
                description: `Failed to upload logo: ${error.message || "Unknown error"}`,
                variant: "destructive",
            })
        } finally {
            setIsUploading(false)
        }
    }



    const addSuggestedQuestion = () => {
        if (settings.suggestedQuestions.length >= 4) {
            toast({
                title: "Limit Reached",
                description: "You can add up to 4 suggested questions.",
                variant: "destructive",
            })
            return
        }
        setSettings(prev => ({
            ...prev,
            suggestedQuestions: [...prev.suggestedQuestions, ""]
        }))
    }

    const updateSuggestedQuestion = (index: number, value: string) => {
        const newQuestions = [...settings.suggestedQuestions]
        newQuestions[index] = value
        setSettings(prev => ({ ...prev, suggestedQuestions: newQuestions }))
    }

    const removeSuggestedQuestion = (index: number) => {
        const newQuestions = settings.suggestedQuestions.filter((_, i) => i !== index)
        setSettings(prev => ({ ...prev, suggestedQuestions: newQuestions }))
    }

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8 lg:flex-row">
            {/* Left Panel: Settings */}
            <div className="flex-1 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold tracking-tight">{t('branding')}</h3>
                        <p className="text-sm text-muted-foreground">{t('customizeDescription')}</p>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* General Settings */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('general')}</h4>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="company-name">{t('companyName')}</Label>
                                <Input
                                    id="company-name"
                                    placeholder="e.g. Acme Corp"
                                    value={settings.companyName}
                                    onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="welcome-message">{t('welcomeMessage')}</Label>
                                <Textarea
                                    id="welcome-message"
                                    placeholder={t('enterMessagePlaceholder')}
                                    value={settings.welcomeMessage}
                                    onChange={(e) => setSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                                    className="resize-none min-h-[100px]"
                                />
                            </div>

                            <div className="flex items-center justify-between border p-4 rounded-lg bg-muted/50">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Lead Collection Form</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Collect visitor details (Name, Email, Phone) before starting a chat.
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.enableLeadCollection}
                                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableLeadCollection: checked }))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Appearance */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('appearance')}</h4>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="brand-color">{t('brandColor')}</Label>
                                <div className="flex items-center gap-4">
                                    <div
                                        className="h-10 w-10 rounded-full border shadow-sm"
                                        style={{ backgroundColor: settings.brandColor }}
                                    />
                                    <Input
                                        id="brand-color"
                                        type="color"
                                        value={settings.brandColor}
                                        onChange={(e) => setSettings(prev => ({ ...prev, brandColor: e.target.value }))}
                                        className="h-10 w-20 p-1 cursor-pointer"
                                    />
                                    <span className="text-sm text-muted-foreground font-mono">
                                        {settings.brandColor}
                                    </span>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>{t('companyLogo')}</Label>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden group hover:border-primary transition-colors">
                                        {isUploading ? (
                                            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                                        ) : settings.brandLogo ? (
                                            <Image
                                                src={settings.brandLogo}
                                                alt="Logo"
                                                fill
                                                className="object-cover"
                                                sizes="(max-width: 768px) 100vw, 300px"
                                                unoptimized
                                                onError={(e: any) => {
                                                    console.error("Error loading logo image")
                                                    // e.currentTarget.style.display = 'none' -> Next.js Image handling is different
                                                }}
                                            />
                                        ) : (
                                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            disabled={isUploading}
                                        />
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        <p>{t('recommendedSize')}</p>
                                        <p>{t('maxSize')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>





                    {/* Suggested Questions */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('suggestedQuestions')}</h4>
                        <div className="grid gap-3">
                            {settings.suggestedQuestions?.map((question, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input
                                        value={question}
                                        onChange={(e) => updateSuggestedQuestion(index, e.target.value)}
                                        placeholder={`Question ${index + 1}`}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeSuggestedQuestion(index)}
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            {settings.suggestedQuestions.length < 4 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={addSuggestedQuestion}
                                    className="w-full border-dashed"
                                >
                                    {t('addQuestion')}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t">
                    <Button onClick={handleSave} disabled={isSaving || !isDirty}>
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                <span className="ml-2">{t('saving')}</span>
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                {t('saveChanges')}
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Right Panel: Live Preview */}
            <div className="flex-1 flex items-start justify-center bg-muted/30 rounded-xl border border-dashed border-border/50 p-8 min-h-[600px]">
                <div className="sticky top-8">
                    <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
                        <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
                        <div className="h-[32px] w-[3px] bg-gray-800 absolute -start-[17px] top-[72px] rounded-s-lg"></div>
                        <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
                        <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[178px] rounded-s-lg"></div>
                        <div className="h-[64px] w-[3px] bg-gray-800 absolute -end-[17px] top-[142px] rounded-e-lg"></div>

                        {/* Screen Content */}
                        <div className="rounded-[2rem] overflow-hidden w-full h-full bg-white dark:bg-gray-950 flex flex-col relative">

                            {isPreviewOpen ? (
                                <div className="flex flex-col h-full animate-in slide-in-from-bottom-5 duration-300">
                                    {/* Chat Header */}
                                    <div
                                        className="p-4 pt-8 text-white flex items-center justify-between shadow-sm"
                                        style={{ backgroundColor: settings.brandColor }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                                <MessageSquare className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-sm">{settings.companyName}</h3>
                                                <p className="text-xs text-white/80">Online</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsPreviewOpen(false)}
                                            className="text-white/80 hover:text-white"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M18 6L6 18M6 6L18 18" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Chat Messages */}
                                    <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                                        {/* Bot Message */}
                                        <div className="flex gap-2 max-w-[85%]">
                                            <div
                                                className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] text-white"
                                                style={{ backgroundColor: settings.brandColor }}
                                            >
                                                AI
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none shadow-sm text-sm border">
                                                {settings.welcomeMessage}
                                            </div>
                                        </div>

                                        {/* Suggested Questions Preview */}
                                        <div className="grid grid-cols-1 gap-2 w-full max-w-xs ml-8">
                                            {settings.suggestedQuestions?.filter(q => q && q.trim() !== "").map((q, i) => (
                                                <button
                                                    key={i}
                                                    className="text-xs text-left px-4 py-3 bg-white hover:bg-gray-50 border border-gray-100 rounded-xl transition-all shadow-sm text-gray-600 truncate"
                                                >
                                                    {q}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Input Area */}
                                    <div className="p-3 border-t bg-white dark:bg-gray-950">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Type a message..."
                                                className="flex-1 text-xs bg-gray-100 dark:bg-gray-900 rounded-full px-3 py-2 focus:outline-none"
                                                disabled
                                            />
                                            <button
                                                className="p-2 rounded-full text-white"
                                                style={{ backgroundColor: settings.brandColor }}
                                            >
                                                <Send className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="absolute inset-0 bg-gray-100/50 dark:bg-gray-900/50 flex items-end justify-end p-4">
                                    <button
                                        onClick={() => setIsPreviewOpen(true)}
                                        style={{
                                            width: '60px',
                                            height: '60px',
                                            borderRadius: '50px',
                                            backgroundColor: settings.brandColor,
                                        }}
                                        className="shadow-lg flex items-center justify-center text-white font-medium px-4 gap-2 hover:scale-105 transition-transform"
                                    >
                                        <MessageSquare className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div >
    )
}
