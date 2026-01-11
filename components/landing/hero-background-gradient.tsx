"use client"

import { cn } from "@/lib/utils"

/**
 * Premium Gradient Mesh Hero Background
 * Ultra-lightweight, GPU-accelerated gradient animation
 * Inspired by modern SaaS landing pages
 */
export function HeroBackgroundGradient() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {/* Animated Gradient Mesh */}
            <div className="absolute inset-0">
                {/* Base gradient */}
                <div 
                    className="absolute inset-0 opacity-40"
                    style={{
                        background: `
                            radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.3) 0px, transparent 50%),
                            radial-gradient(at 100% 0%, rgba(147, 51, 234, 0.3) 0px, transparent 50%),
                            radial-gradient(at 100% 100%, rgba(236, 72, 153, 0.2) 0px, transparent 50%),
                            radial-gradient(at 0% 100%, rgba(34, 197, 94, 0.2) 0px, transparent 50%)
                        `,
                        filter: 'blur(60px)',
                        animation: 'gradientShift 15s ease infinite',
                    }}
                />
                
                {/* Moving gradient overlay */}
                <div 
                    className="absolute inset-0 opacity-30"
                    style={{
                        background: `
                            radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.4) 0%, transparent 50%),
                            radial-gradient(circle at 80% 80%, rgba(147, 51, 234, 0.4) 0%, transparent 50%),
                            radial-gradient(circle at 40% 20%, rgba(236, 72, 153, 0.3) 0%, transparent 50%)
                        `,
                        filter: 'blur(80px)',
                        animation: 'gradientMove 20s ease infinite',
                    }}
                />
            </div>

            {/* Subtle grid overlay */}
            <div 
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
                    `,
                    backgroundSize: '100px 100px',
                }}
            />

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-black via-black/50 to-transparent" />

            <style jsx>{`
                @keyframes gradientShift {
                    0%, 100% {
                        opacity: 0.4;
                        transform: scale(1) rotate(0deg);
                    }
                    50% {
                        opacity: 0.6;
                        transform: scale(1.1) rotate(5deg);
                    }
                }
                
                @keyframes gradientMove {
                    0% {
                        transform: translate(0, 0) scale(1);
                    }
                    33% {
                        transform: translate(5%, -5%) scale(1.05);
                    }
                    66% {
                        transform: translate(-5%, 5%) scale(0.95);
                    }
                    100% {
                        transform: translate(0, 0) scale(1);
                    }
                }
            `}</style>
        </div>
    )
}
