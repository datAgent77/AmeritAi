"use client"

import { cn } from "@/lib/utils"
import { BackgroundBeams } from "@/components/ui/background-beams"

/**
 * Premium Hero Background Animation
 * Combines multiple modern effects for a premium feel:
 * - Aurora gradient mesh
 * - Flowing background beams
 * - Floating glowing orbs
 * - Animated grid overlay
 * - All GPU-accelerated for optimal performance
 */
export function HeroBackgroundPremium() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none bg-black">
            {/* Aurora Gradient Mesh - Base Layer */}
            <div className="absolute inset-0">
                {/* Primary Aurora - Blue/Purple */}
                <div 
                    className="absolute inset-0 opacity-50"
                    style={{
                        background: `
                            radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.4) 0px, transparent 50%),
                            radial-gradient(at 100% 0%, rgba(147, 51, 234, 0.4) 0px, transparent 50%),
                            radial-gradient(at 100% 100%, rgba(236, 72, 153, 0.3) 0px, transparent 50%),
                            radial-gradient(at 0% 100%, rgba(34, 197, 94, 0.2) 0px, transparent 50%)
                        `,
                        filter: 'blur(80px)',
                        animation: 'auroraShift 20s ease infinite',
                    }}
                />
                
                {/* Secondary Aurora - Moving Overlay */}
                <div 
                    className="absolute inset-0 opacity-40"
                    style={{
                        background: `
                            radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.5) 0%, transparent 50%),
                            radial-gradient(circle at 80% 80%, rgba(147, 51, 234, 0.5) 0%, transparent 50%),
                            radial-gradient(circle at 40% 20%, rgba(236, 72, 153, 0.4) 0%, transparent 50%),
                            radial-gradient(circle at 60% 60%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)
                        `,
                        filter: 'blur(100px)',
                        animation: 'auroraMove 25s ease infinite',
                    }}
                />
            </div>

            {/* Floating Glowing Orbs */}
            <div className="absolute inset-0">
                {/* Primary Orb - Blue with glow */}
                <div 
                    className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full opacity-30"
                    style={{
                        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, rgba(59, 130, 246, 0.2) 40%, transparent 70%)',
                        filter: 'blur(60px)',
                        boxShadow: '0 0 120px rgba(59, 130, 246, 0.4)',
                        animation: 'floatOrb1 20s ease-in-out infinite',
                    }}
                />
                
                {/* Secondary Orb - Purple with glow */}
                <div 
                    className="absolute top-10 -right-20 w-[600px] h-[600px] rounded-full opacity-35"
                    style={{
                        background: 'radial-gradient(circle, rgba(147, 51, 234, 0.7) 0%, rgba(147, 51, 234, 0.3) 40%, transparent 70%)',
                        filter: 'blur(70px)',
                        boxShadow: '0 0 140px rgba(147, 51, 234, 0.5)',
                        animation: 'floatOrb2 18s ease-in-out infinite reverse',
                        animationDelay: '3s',
                    }}
                />
                
                {/* Tertiary Orb - Pink with glow */}
                <div 
                    className="absolute bottom-20 left-1/4 w-[500px] h-[500px] rounded-full opacity-25"
                    style={{
                        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.5) 0%, rgba(236, 72, 153, 0.2) 40%, transparent 70%)',
                        filter: 'blur(50px)',
                        boxShadow: '0 0 100px rgba(236, 72, 153, 0.4)',
                        animation: 'floatOrb3 22s ease-in-out infinite',
                        animationDelay: '5s',
                    }}
                />

                {/* Accent Orb - Cyan */}
                <div 
                    className="absolute top-1/2 right-1/3 w-[400px] h-[400px] rounded-full opacity-20"
                    style={{
                        background: 'radial-gradient(circle, rgba(34, 211, 238, 0.4) 0%, rgba(34, 211, 238, 0.1) 40%, transparent 70%)',
                        filter: 'blur(40px)',
                        boxShadow: '0 0 80px rgba(34, 211, 238, 0.3)',
                        animation: 'floatOrb4 16s ease-in-out infinite',
                        animationDelay: '1s',
                    }}
                />
            </div>

            {/* Background Beams - Flowing Lines */}
            <div className="absolute inset-0 opacity-30">
                <BackgroundBeams />
            </div>

            {/* Animated Grid Overlay - Premium Detail */}
            <div 
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '80px 80px',
                    animation: 'gridMove 30s linear infinite',
                }}
            />

            {/* Subtle Noise Texture */}
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.015] mix-blend-overlay" />

            {/* Bottom Gradient Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-black via-black/60 to-transparent" />

            {/* CSS Keyframes */}
            <style jsx>{`
                @keyframes auroraShift {
                    0%, 100% {
                        opacity: 0.5;
                        transform: scale(1) rotate(0deg);
                    }
                    33% {
                        opacity: 0.7;
                        transform: scale(1.15) rotate(3deg);
                    }
                    66% {
                        opacity: 0.6;
                        transform: scale(0.95) rotate(-2deg);
                    }
                }
                
                @keyframes auroraMove {
                    0% {
                        transform: translate(0, 0) scale(1);
                    }
                    25% {
                        transform: translate(8%, -8%) scale(1.1);
                    }
                    50% {
                        transform: translate(-5%, 5%) scale(0.9);
                    }
                    75% {
                        transform: translate(5%, 8%) scale(1.05);
                    }
                    100% {
                        transform: translate(0, 0) scale(1);
                    }
                }

                @keyframes floatOrb1 {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                    }
                    33% {
                        transform: translate(40px, -40px) scale(1.2);
                    }
                    66% {
                        transform: translate(-30px, 30px) scale(0.85);
                    }
                }

                @keyframes floatOrb2 {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                    }
                    25% {
                        transform: translate(-35px, 35px) scale(1.15);
                    }
                    50% {
                        transform: translate(30px, -25px) scale(0.9);
                    }
                    75% {
                        transform: translate(-20px, -30px) scale(1.1);
                    }
                }

                @keyframes floatOrb3 {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                    }
                    40% {
                        transform: translate(50px, 20px) scale(1.3);
                    }
                    80% {
                        transform: translate(-40px, -50px) scale(0.8);
                    }
                }

                @keyframes floatOrb4 {
                    0%, 100% {
                        transform: translate(0, 0) scale(1) rotate(0deg);
                    }
                    50% {
                        transform: translate(25px, -35px) scale(1.1) rotate(180deg);
                    }
                }
                
                @keyframes gridMove {
                    0% {
                        transform: translate(0, 0);
                    }
                    100% {
                        transform: translate(80px, 80px);
                    }
                }
            `}</style>
        </div>
    )
}
