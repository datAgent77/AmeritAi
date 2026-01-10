
export interface BubbleMessage {
    id: string
    text: string
    delay?: number // For sequential or initial delay
    duration?: number // How long it stays visible (override global)
    isActive?: boolean
}

export interface EngagementSettings {
    enabled: boolean
    bubble: {
        messages: BubbleMessage[]
        position: 'top' | 'left' | 'right' | 'bottom-left' | 'bottom-right'
        animation: 'none' | 'bounce' | 'pulse' | 'shake' | 'slide' | 'fade'
        autoDismiss: boolean
        autoDismissDelay: number
        showCloseButton: boolean
        style: {
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
        copyTriggerActionType: 'bubble'
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
