"use client"

import { useTheme } from "next-themes"

/**
 * Modern Hero Background - Static Dot Grid Pattern
 * Clean, performant, premium feel without heavy animations.
 * Optimized: Removed hydration blocking (useEffect mounting check).
 * Uses CSS opacity transition for theme switch handling instead.
 */
export function HeroBackgroundModern() {
    const { resolvedTheme } = useTheme()
    
    // Default to dark mode styles initially to match server render (assuming dark mode default)
    // Then hydration will update classes if needed.
    // Ideally, we move theme logic to CSS variables to avoid hydration mismatch entirely.
    
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none bg-background transition-colors duration-500">
            {/* Dot Grid Pattern - using CSS variables for theme colors could be better but keeping simple for now */}
            <div
                className="absolute inset-0 opacity-10 dark:opacity-5"
                style={{
                    backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
                    backgroundSize: '32px 32px',
                    color: 'var(--foreground)' 
                }}
            />

            {/* Subtle Top-Left Gradient Accent */}
            <div
                className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-30 blur-[60px]"
                style={{
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
                }}
            />

            {/* Subtle Bottom-Right Gradient Accent */}
            <div
                className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-25 blur-[60px]"
                style={{
                    background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)',
                }}
            />

            {/* Bottom Fade to Background */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent" />
        </div>
    )
}
