import { ChatbotSettings } from "@/types/chatbot"
import Image from "next/image"
import { 
    MessageSquare, MessageCircle, MessageSquareText, MessagesSquare, 
    Bot, Sparkles, Brain, BrainCircuit, Cpu, Zap, Activity, 
    Headset, Mic, Video, Phone, User, Users, UserCheck, 
    HelpCircle, Info, AlertCircle, Star, Heart, ThumbsUp, Smile, 
    Send, Share2, Paperclip, Command, Terminal, Code, Box, 
    Ghost, Gamepad2, Rocket, Minimize2, Maximize2, RefreshCw, X
} from "lucide-react"

interface ChatHeaderProps {
    settings: ChatbotSettings
    isExpanded: boolean
    handleToggleSize: () => void
    handleCloseWidget: () => void
    handleClearChat: () => void
    t: (key: string) => string
    showCloseButton?: boolean
    showSizeToggle?: boolean
    sticky?: boolean
    showShadow?: boolean
    compact?: boolean
}

export function ChatHeader({
    settings,
    isExpanded,
    handleToggleSize,
    handleCloseWidget,
    handleClearChat,
    t,
    showCloseButton = true,
    showSizeToggle = true,
    sticky = true,
    showShadow = true,
    compact = false
}: ChatHeaderProps) {
    const stickyClass = sticky ? "sticky top-0 z-10" : "relative"
    const shadowClass = showShadow ? "shadow-sm" : ""
    const paddingClass = compact ? "px-4 py-3" : "px-4 py-4"
    const controlButtonClass = compact
        ? "p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        : "p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
    const onlinePillClass = compact
        ? "flex items-center gap-1.5 px-2.5 py-0.5 mr-2 bg-white/10 rounded-full border border-white/10 backdrop-blur-sm shadow-sm hidden sm:flex"
        : "flex items-center gap-1.5 px-3 py-1 mr-2 bg-white/10 rounded-full border border-white/10 backdrop-blur-sm shadow-sm hidden sm:flex"

    return (
        <div
            className={`flex items-center justify-between border-b ${paddingClass} ${shadowClass} ${stickyClass} transition-colors duration-300`}
            style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor, borderColor: 'rgba(0,0,0,0.05)' }}
        >
            <div className="flex items-center gap-3">
                <div
                    className="relative flex items-center justify-center"
                    style={{ width: `${settings.headerLogoWidth || 32}px`, height: `${settings.headerLogoHeight || 32}px` }}
                >
                    {(() => {
                        // 1. Header Logo
                        if (settings.headerLogo) {
                            return <Image src={settings.headerLogo} alt="Logo" fill className="object-contain" unoptimized />
                        }
                        // 2. Brand Logo
                        if (settings.brandLogo) {
                            return <Image src={settings.brandLogo} alt="Logo" fill className="object-contain" unoptimized />
                        }
                        // 3. Custom Launcher Icon (Image)
                        if (settings.launcherIcon === 'custom' && settings.launcherIconUrl) {
                            return <Image src={settings.launcherIconUrl} alt="Logo" fill className="object-contain" unoptimized />
                        }
                        // 4. Library Launcher Icon
                        if (settings.launcherIcon === 'library' && settings.launcherLibraryIcon) {
                            const IconMap: any = {
                                MessageSquare, MessageCircle, MessageSquareText, MessagesSquare,
                                Bot, Sparkles, Brain, BrainCircuit, Cpu, Zap, Activity,
                                Headset, Mic, Video, Phone,
                                User, Users, UserCheck,
                                HelpCircle, Info, AlertCircle,
                                Star, Heart, ThumbsUp, Smile,
                                Send, Share2, Paperclip,
                                Command, Terminal, Code, Box,
                                Ghost, Gamepad2, Rocket
                            };
                            const IconComponent = IconMap[settings.launcherLibraryIcon];
                            if (IconComponent) {
                                return <IconComponent className="w-5 h-5 text-white" />
                            }
                        }

                        // 5. Default
                        return (
                            <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-white" />
                            </div>
                        )
                    })()}
                </div>
                <div>
                    <h3 className="font-semibold text-sm leading-tight" style={{ color: settings.headerTextColor || '#FFFFFF' }}>{settings.companyName}</h3>
                </div>
            </div>
            <div className="flex items-center gap-1">
                {showSizeToggle && (
                    <button
                        onClick={handleToggleSize}
                        className={`${controlButtonClass} hidden sm:block`}
                        title={isExpanded ? "Minimize" : "Maximize"}
                    >
                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                )}
                <button
                    onClick={handleClearChat}
                    className={controlButtonClass}
                    title="Refresh Chat"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
                {showCloseButton && (
                    <button
                        onClick={handleCloseWidget}
                        className={controlButtonClass}
                        title="Close Widget"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    )
}
