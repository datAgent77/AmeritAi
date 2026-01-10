import { EngagementSettings } from "./types";

export const adjustColorBrightness = (hex: string, percent: number) => {
    if (!hex) return '#000000';
    // Handle shorthand hex
    const fullHex = hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => r + r + g + g + b + b);

    let num = parseInt(fullHex.replace("#", ""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        B = (num >> 8 & 0x00FF) + amt,
        G = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (B < 255 ? B < 1 ? 0 : B : 255) * 0x100 + (G < 255 ? G < 1 ? 0 : G : 255)).toString(16).slice(1);
}

export const getPreviewStyle = (settings: EngagementSettings): React.CSSProperties => {
    const style = settings.bubble.style;
    const baseStyle: React.CSSProperties = {
        fontFamily: style.fontFamily,
        fontSize: `${style.fontSize}px`,
        opacity: style.opacity / 100,
        color: style.textColor,
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    };

    // 1. Background & Effect Logic
    if (style.effect === 'glass') {
        baseStyle.backgroundColor = `${style.backgroundColor}A6`; // ~65% opacity
        baseStyle.backdropFilter = `blur(${style.backdropBlur || 12}px)`;
        baseStyle.border = `1px solid ${style.textColor}26`; // ~15% opacity
        baseStyle.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.15)'; // Glass shadow
    } else if (style.effect === 'gradient') {
        const color2 = adjustColorBrightness(style.backgroundColor, -40);
        baseStyle.background = `linear-gradient(135deg, ${style.backgroundColor} 0%, ${color2} 100%)`;
        baseStyle.border = 'none';
    } else if (style.effect === 'outline') {
        baseStyle.backgroundColor = style.backgroundColor; // Usually white or transparent in practice, but keeping user selection
        baseStyle.border = `2px solid ${style.textColor}`;
    } else {
        // Solid
        baseStyle.backgroundColor = style.backgroundColor;
        baseStyle.border = style.borderWidth > 0 ? `${style.borderWidth}px solid ${style.borderColor}` : '1px solid rgba(0,0,0,0.05)';
    }

    // 2. Shape Logic
    if (style.shape === 'pill') {
        baseStyle.borderRadius = '9999px';
    } else if (style.shape === 'square') {
        baseStyle.borderRadius = '0px';
    } else if (style.shape === 'speech') {
        // Widget.js uses: `${borderRadius}px ${borderRadius}px ${borderRadius}px 4px`
        // TL, TR, BR, BL (Bottom-Left is sharp)
        baseStyle.borderRadius = `${style.borderRadius}px ${style.borderRadius}px ${style.borderRadius}px 4px`;
    } else {
        // Rounded
        baseStyle.borderRadius = `${style.borderRadius}px`;
    }

    // 3. Shadow Logic
    if (!baseStyle.boxShadow && style.effect !== 'glass') {
        if (style.shadow === 'glow') {
            baseStyle.boxShadow = `0 0 15px ${style.backgroundColor}60`;
        } else {
            const shadows = {
                'none': 'none',
                'small': '0 2px 8px rgba(0,0,0,0.1)',
                'medium': '0 4px 12px rgba(0,0,0,0.15)',
                'large': '0 8px 24px rgba(0,0,0,0.2)'
            };
            baseStyle.boxShadow = shadows[style.shadow] || shadows['medium'];
        }
    }

    return baseStyle;
}
