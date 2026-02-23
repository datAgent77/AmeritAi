"use client"

import Image from "next/image"
import { Sparkles, X, Send, MessageSquare } from "lucide-react"
import dynamic from "next/dynamic"
import * as LucideIcons from "lucide-react"

const Lottie = dynamic(() => import("lottie-react"), { ssr: false })

interface PreviewClassicProps {
    settings: any
    previewMode: 'mobile' | 'desktop'
    isPreviewOpen: boolean
    setIsPreviewOpen: (open: boolean) => void
    lottieData: any
}

export function PreviewClassic({ settings, previewMode, isPreviewOpen, setIsPreviewOpen, lottieData }: PreviewClassicProps) {
    const renderIcon = (iconName: string, className: string = "w-5 h-5") => {
        const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.MessageSquare;
        return <IconComponent className={className} />;
    };

    return (
        <>
            {isPreviewOpen ? (
                settings.theme === 'modern' ? (
                    // MODERN THEME PREVIEW CONTENT
                    <div className="flex flex-col h-full bg-[#F8F9FC] relative overflow-hidden font-sans w-full absolute top-0 left-0 bg-white dark:bg-gray-900 border border-border z-50">
                        <div className="p-5 flex items-center justify-between z-20 relative border-b bg-white/50 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                {settings.headerLogo || settings.brandLogo ? (
                                    <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0">
                                        <Image src={settings.headerLogo || settings.brandLogo} alt="Logo" fill className="object-cover" unoptimized />
                                    </div>
                                ) : (
                                    <Sparkles className="w-5 h-5 text-blue-500 fill-blue-500" />
                                )}
                                <span className="font-semibold text-gray-800 text-base">{settings.companyName || "AI Assist"}</span>
                            </div>
                            <button onClick={() => setIsPreviewOpen(false)}>
                                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>

                        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-full flex justify-center z-0 pointer-events-none">
                            <div className="relative w-64 h-64">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-full blur-[60px] animate-pulse"></div>
                                <div className="absolute inset-10 bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-full blur-[40px]"></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/40 blur-[50px] rounded-full mix-blend-overlay"></div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col relative z-10 px-6 pt-10 pb-4">
                            <div className="text-center mb-auto">
                                <h3 className="text-xl font-medium text-slate-700 leading-tight">
                                    {settings.welcomeMessage || "What do you want to know about AI?"}
                                </h3>
                            </div>
                            <div className="flex flex-col items-end gap-3 mb-6">
                                {settings.suggestedQuestions.slice(0, 3).map((q: string, i: number) => (
                                    <button key={i}
                                        className="bg-white hover:bg-gray-50 text-sm py-2.5 px-4 rounded-2xl shadow-sm border transition-all text-left max-w-full"
                                        style={{ borderColor: `${settings.headerBackgroundColor || settings.brandColor}40`, color: settings.headerBackgroundColor || settings.brandColor }}>
                                        {q}
                                    </button>
                                ))}
                            </div>
                            <div className="bg-white hover:shadow-md cursor-pointer rounded-full shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 p-1.5 flex items-center transition-all">
                                <span className="flex-1 text-sm px-4 py-2 text-gray-400">Ask me anything...</span>
                                <div className="p-2 rounded-full hover:bg-gray-50 transition-colors" style={{ color: settings.headerBackgroundColor || settings.brandColor }}><Send className="w-4 h-4" /></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // CLASSIC THEME PREVIEW CONTENT
                    <div className="flex flex-col h-full w-full absolute top-0 left-0 bg-white dark:bg-gray-950 border border-border z-50">
                        <div className="p-4 pt-6 text-white flex items-center justify-between shadow-sm" style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor }}>
                            <div className="flex items-center gap-3">
                                <div
                                    className="relative flex items-center justify-center overflow-hidden rounded-full"
                                    style={{ width: settings.headerLogoWidth || 32, height: settings.headerLogoHeight || 32 }}
                                >
                                    {settings.headerLogo || settings.brandLogo ? (
                                        <Image src={settings.headerLogo || settings.brandLogo} alt="Logo" fill className="object-contain" unoptimized />
                                    ) : (
                                        <div className="w-full h-full bg-white/20 flex items-center justify-center">
                                            <MessageSquare className="w-5 h-5 text-white" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">{settings.companyName}</h3>
                                    <p className="text-[10px] text-white/80 shrink-0">Online</p>
                                </div>
                            </div>
                            <button onClick={() => setIsPreviewOpen(false)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex gap-2 max-w-[85%]">
                                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] text-white" style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor }}>AI</div>
                                <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none shadow-sm text-sm border">{settings.welcomeMessage}</div>
                            </div>
                            <div className="grid grid-cols-1 gap-2 w-full max-w-xs ml-8">
                                {settings.suggestedQuestions?.filter((q: string) => q && q.trim() !== "").map((q: string, i: number) => (
                                    <button key={i} className="text-xs text-left px-4 py-3 bg-white hover:bg-gray-50 border rounded-xl transition-all shadow-sm truncate" style={{ borderColor: `${settings.headerBackgroundColor || settings.brandColor}40`, color: settings.headerBackgroundColor || settings.brandColor }}>{q}</button>
                                ))}
                            </div>
                        </div>
                        <div className="p-3 border-t bg-white dark:bg-gray-950">
                            <div className="flex gap-2">
                                <div className="flex-1 text-xs bg-gray-100 dark:bg-gray-900 rounded-full px-3 py-2 text-gray-500 flex items-center">Type a message...</div>
                                <button className="p-2 rounded-full text-white" style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor }}><Send className="w-3 h-3" /></button>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                <div className="absolute inset-0 flex items-end justify-end pointer-events-none p-4">
                    <div
                        className="absolute pointer-events-auto"
                        style={{
                            ...(settings.position.includes('bottom') ? { bottom: `${settings.bottomSpacing ?? 20}px` } : {}),
                            ...(settings.position.includes('top') ? { top: `${settings.bottomSpacing ?? 20}px` } : {}),
                            ...(settings.position.includes('right') ? { right: `${settings.sideSpacing ?? 20}px` } : {}),
                            ...(settings.position.includes('left') ? { left: `${settings.sideSpacing ?? 20}px` } : {}),
                            ...(settings.position.includes('center') ? { left: '50%', transform: 'translateX(-50%)' } : {}),
                        }}
                    >
                        <button
                            onClick={() => setIsPreviewOpen(true)}
                            style={{
                                position: 'relative',
                                width: `${settings.launcherType === 'fullImage' ? settings.fullImageLauncherWidth : settings.launcherWidth}px`,
                                height: `${settings.launcherType === 'fullImage' ? settings.fullImageLauncherHeight : settings.launcherHeight}px`,
                                borderRadius: settings.launcherType === 'fullImage' ? '0' : `${settings.launcherRadius}px`,
                                backgroundColor: settings.launcherType === 'fullImage' ? 'transparent' : (settings.launcherBackgroundColor || settings.brandColor),
                                boxShadow: settings.launcherType === 'fullImage' ? 'none' : (
                                    settings.launcherShadow === 'none' ? 'none' :
                                        settings.launcherShadow === 'light' ? '0 2px 8px rgba(0,0,0,0.1)' :
                                            settings.launcherShadow === 'medium' ? '0 4px 16px rgba(0,0,0,0.2)' : '0 8px 32px rgba(0,0,0,0.3)'
                                ),
                                padding: (settings.launcherStyle === 'text' || settings.launcherStyle === 'icon_text') ? '0 12px' : 0,
                                overflow: 'hidden',
                                color: settings.launcherIconColor || "#ffffff",
                            }}
                            className={`flex items-center justify-center gap-2 font-medium transition-transform hover:scale-105 ${settings.launcherAnimation === 'pulse' ? 'animate-pulse' :
                                settings.launcherAnimation === 'bounce' ? 'animate-bounce' : ''
                                }`}
                        >
                            {settings.launcherType === 'fullImage' ? (
                                settings.launcherImageMode === 'lottie' && settings.launcherLottieUrl ? (
                                    lottieData ? (
                                        <Lottie
                                            animationData={lottieData}
                                            loop={true}
                                            autoplay={true}
                                            style={{ width: '100%', height: '100%' }}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 text-white text-center p-1">
                                            <span className="text-lg">🎬</span>
                                            <span className="text-[8px]">Lottie</span>
                                        </div>
                                    )
                                ) : settings.launcherFullImageUrl ? (
                                    <Image src={settings.launcherFullImageUrl} alt="Launcher" fill className="object-contain" unoptimized />
                                ) : (
                                    renderIcon(settings.launcherLibraryIcon || "MessageSquare", "w-6 h-6")
                                )
                            ) : (
                                <>
                                    {(settings.launcherStyle === 'circle' || settings.launcherStyle === 'square' || settings.launcherStyle === 'icon_text') && (
                                        settings.launcherIcon === "custom" && settings.launcherIconUrl ? (
                                            <Image src={settings.launcherIconUrl} alt="Icon" width={Math.min(settings.launcherWidth, settings.launcherHeight) - 24} height={Math.min(settings.launcherWidth, settings.launcherHeight) - 24} className="object-contain rounded-sm flex-shrink-0" unoptimized />
                                        ) : (
                                            renderIcon(settings.launcherLibraryIcon || "MessageSquare", "w-6 h-6")
                                        )
                                    )}
                                    {(settings.launcherStyle === 'text' || settings.launcherStyle === 'icon_text') && (
                                        <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">{settings.launcherText}</span>
                                    )}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
