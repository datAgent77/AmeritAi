
export interface BubbleMessage {
    id: string
    text: string
    delay?: number // For sequential or initial delay
    duration?: number // How long it stays visible (override global)
    isActive?: boolean
}

export type EngagementLanguage = 'auto' | 'tr' | 'en' | 'es' | 'de' | 'fr'
export type EngagementBubblePosition = 'top' | 'left' | 'right' | 'bottom-left' | 'bottom-right'
export type EngagementBubbleAnimation = 'none' | 'bounce' | 'pulse' | 'shake' | 'slide' | 'fade'
export type EngagementBubbleRenderStyle = 'custom' | 'ambient_ai_bubble' | 'ambient_ai_bubble_typewriter'
export type EngagementAmbientAiBubbleTheme = 'default' | 'minimal' | 'glass' | 'compact'
export type EngagementTriggerTargetingMode = 'all' | 'homepage' | 'custom'

export interface EngagementTriggerTargeting {
    mode: EngagementTriggerTargetingMode
    urls: string[]
}

export interface EngagementBubbleStyle {
    backgroundColor: string
    textColor: string
    borderRadius: number
    shadow: 'none' | 'small' | 'medium' | 'large' | 'glow'
    borderWidth: number
    borderColor: string
    opacity: number
    backdropBlur: number
    fontFamily: string
    fontSize: number
    shape: 'rounded' | 'square' | 'pill' | 'speech'
    effect: 'solid' | 'glass' | 'gradient' | 'outline'
}

export interface AmbientBubbleTypewriterSettings {
    enabled?: boolean
    charDelayMs?: number
    startDelayMs?: number
    cursorVisible?: boolean
    cursorChar?: string
    completePauseMs?: number
    reducedMotionBehavior?: 'instant' | 'fade_in'
    replayBehavior?: 'new_text_only'
}

export interface EngagementBubbleAmbientVariant {
    enabled: boolean
    renderStyle?: EngagementBubbleRenderStyle
    aiBubbleTheme?: EngagementAmbientAiBubbleTheme
    animation?: EngagementBubbleAnimation
    position?: EngagementBubblePosition
    offsetX?: number
    offsetY?: number
    maxWidth?: number
    typewriter?: AmbientBubbleTypewriterSettings
    style?: Partial<EngagementBubbleStyle>
}

export interface EngagementSettings {
    enabled: boolean
    language: EngagementLanguage
    bubble: {
        messages: BubbleMessage[]
        position: EngagementBubblePosition
        animation: EngagementBubbleAnimation
        autoDismiss: boolean
        autoDismissDelay: number
        showCloseButton: boolean
        style: EngagementBubbleStyle
        ambientVariant?: EngagementBubbleAmbientVariant
    }
    triggers: {
        scrollDepth: number
        exitIntent: boolean
        inactivity: number
        pageRevisit: number
        timeOnPage: number
        clickCount: number
        copyTrigger: boolean

        // Nested Message Lists
        exitIntentMessages: BubbleMessage[]
        scrollDepthMessages: BubbleMessage[]
        inactivityMessages: BubbleMessage[]
        pageRevisitMessages: BubbleMessage[]
        timeOnPageMessages: BubbleMessage[]
        clickCountMessages: BubbleMessage[]
        copyTriggerMessages: BubbleMessage[]

        // Action Types
        exitIntentActionType?: 'bubble' | 'openWidget'
        scrollDepthActionType?: 'bubble' | 'openWidget'
        inactivityActionType?: 'bubble' | 'openWidget'
        pageRevisitActionType?: 'bubble' | 'openWidget'
        timeOnPageActionType?: 'bubble' | 'openWidget'
        clickCountActionType?: 'bubble' | 'openWidget'
        copyTriggerActionType?: 'bubble' | 'openWidget'

        // Page Targeting
        exitIntentTargeting?: EngagementTriggerTargeting
        scrollDepthTargeting?: EngagementTriggerTargeting
        inactivityTargeting?: EngagementTriggerTargeting
        pageRevisitTargeting?: EngagementTriggerTargeting
        timeOnPageTargeting?: EngagementTriggerTargeting
        clickCountTargeting?: EngagementTriggerTargeting
        copyTriggerTargeting?: EngagementTriggerTargeting

        // Deprecated fields kept for backward compatibility if needed, though clean up preferred
        scrollDepthMessageId?: string
        exitIntentMessageId?: string
        inactivityMessageId?: string
        pageRevisitMessageId?: string
        timeOnPageMessageId?: string
        clickCountMessageId?: string
        copyTriggerMessageId?: string
    }
    aiSmartBubbles: {
        visible: boolean
        granted: boolean
        enabled: boolean
        tone: 'friendly' | 'professional' | 'playful'
        // New Advanced Settings
        frequency: 5 | 15 | 30 | 60       // Min seconds between bubbles
        initialDelay: 3 | 5 | 10 | 15     // First bubble delay (seconds)
        maxPerSession: number              // 0 = unlimited
        messageLength: 'short' | 'medium' | 'detailed'
        // Page Targeting
        targeting: 'all' | 'homepage' | 'custom'
        targetUrls: string[]
        // Quiet Hours
        quietHours: {
            enabled: boolean
            startHour: number              // 0-23
            endHour: number                // 0-23
        }
    }
}

export const defaultSettings: EngagementSettings = {
    enabled: false,
    language: 'auto',
    bubble: {
        messages: [{ id: '1', text: 'Merhaba! Size nasıl yardımcı olabilirim?', delay: 5, isActive: true }],
        position: 'top',
        animation: 'bounce',
        autoDismiss: true,
        autoDismissDelay: 10,
        showCloseButton: true,
        style: {
            backgroundColor: '#000000',
            textColor: '#FFFFFF',
            borderRadius: 12,
            shadow: 'medium',
            borderWidth: 0,
            borderColor: '#333333',
            opacity: 100,
            backdropBlur: 0,
            fontFamily: 'system-ui',
            fontSize: 14,
            shape: 'rounded',
            effect: 'solid'
        },
        ambientVariant: {
            enabled: false,
            renderStyle: 'custom',
            aiBubbleTheme: 'default',
            animation: 'bounce',
            position: 'top',
            offsetX: 0,
            offsetY: 0,
            typewriter: {
                enabled: true,
                charDelayMs: 18,
                startDelayMs: 100,
                cursorVisible: true,
                cursorChar: '▍',
                completePauseMs: 300,
                reducedMotionBehavior: 'instant',
                replayBehavior: 'new_text_only'
            },
            style: {}
        }
    },
    triggers: {
        scrollDepth: 0,
        exitIntent: false,
        inactivity: 0,
        pageRevisit: 0,
        timeOnPage: 0,
        clickCount: 0,
        copyTrigger: false,

        exitIntentMessages: [],
        scrollDepthMessages: [],
        inactivityMessages: [],
        pageRevisitMessages: [],
        timeOnPageMessages: [],
        clickCountMessages: [],
        copyTriggerMessages: [],

        // Action Types defaults
        exitIntentActionType: 'bubble',
        scrollDepthActionType: 'bubble',
        inactivityActionType: 'bubble',
        pageRevisitActionType: 'bubble',
        timeOnPageActionType: 'bubble',
        clickCountActionType: 'bubble',
        copyTriggerActionType: 'bubble',

        exitIntentTargeting: { mode: 'all', urls: [] },
        scrollDepthTargeting: { mode: 'all', urls: [] },
        inactivityTargeting: { mode: 'all', urls: [] },
        pageRevisitTargeting: { mode: 'all', urls: [] },
        timeOnPageTargeting: { mode: 'all', urls: [] },
        clickCountTargeting: { mode: 'all', urls: [] },
        copyTriggerTargeting: { mode: 'all', urls: [] }
    },
    aiSmartBubbles: {
        visible: false,
        granted: false,
        enabled: false,
        tone: 'friendly',
        frequency: 15,
        initialDelay: 5,
        maxPerSession: 5,
        messageLength: 'medium',
        targeting: 'all',
        targetUrls: [],
        quietHours: {
            enabled: false,
            startHour: 22,
            endHour: 8
        }
    }
}
