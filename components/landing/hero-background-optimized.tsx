"use client"

import { cn } from "@/lib/utils"

/**
 * Optimized Hero Background - GPU-accelerated CSS animations
 * Replaces heavy canvas-based animations with lightweight CSS transforms
 */
export function HeroBackgroundOptimized() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none bg-black">
            {/* Animated Gradient Orbs - GPU accelerated */}
            <div className="absolute inset-0">
                {/* Primary Orb - Blue/Purple */}
                <div 
                    className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
                    style={{
                        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
                        animation: 'float 20s ease-in-out infinite',
                    }}
                />
                
                {/* Secondary Orb - Purple */}
                <div 
                    className="absolute top-10 -right-20 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl"
                    style={{
                        background: 'radial-gradient(circle, rgba(147, 51, 234, 0.5) 0%, transparent 70%)',
                        animation: 'float 15s ease-in-out infinite reverse',
                        animationDelay: '2s',
                    }}
                />
                
                {/* Tertiary Orb - Pink */}
                <div 
                    className="absolute bottom-20 left-1/4 w-[400px] h-[400px] rounded-full opacity-15 blur-3xl"
                    style={{
                        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%)',
                        animation: 'float 25s ease-in-out infinite',
                        animationDelay: '4s',
                    }}
                />
            </div>

            {/* Animated Grid Pattern - Subtle */}
            <div 
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px',
                    animation: 'gridMove 20s linear infinite',
                }}
            />

            {/* Subtle Noise Texture */}
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.02] mix-blend-overlay" />

            {/* Bottom Gradient Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black via-black/80 to-transparent" />

            {/* CSS Keyframes */}
            <style jsx>{`
                @keyframes float {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                    }
                    33% {
                        transform: translate(30px, -30px) scale(1.1);
                    }
                    66% {
                        transform: translate(-20px, 20px) scale(0.9);
                    }
                }
                
                @keyframes gridMove {
                    0% {
                        transform: translate(0, 0);
                    }
                    100% {
                        transform: translate(50px, 50px);
                    }
                }
            `}</style>
        </div>
    )
}
