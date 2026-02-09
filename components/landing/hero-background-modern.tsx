"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

/**
 * Modern Hero Background - Static Dot Grid Pattern
 * Clean, performant, premium feel without heavy animations.
 */
export function HeroBackgroundModern() {
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="absolute inset-0 bg-background" />
    }

    const isLight = resolvedTheme === 'light'
    const dotColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none bg-background transition-colors duration-500">
            {/* Dot Grid Pattern */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
                    backgroundSize: '32px 32px',
                }}
            />

            {/* Subtle Top-Left Gradient Accent */}
            <div
                className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-30"
                style={{
                    background: isLight
                        ? 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(99, 102, 241, 0.20) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                }}
            />

            {/* Subtle Bottom-Right Gradient Accent */}
            <div
                className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-25"
                style={{
                    background: isLight
                        ? 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                }}
            />

            {/* Bottom Fade to Background */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent" />
        </div>
    )
}
