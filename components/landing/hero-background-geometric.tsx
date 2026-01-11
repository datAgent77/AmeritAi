"use client"

import { cn } from "@/lib/utils"

/**
 * Geometric Hero Background - Clean & Modern
 * Features:
 * - Animated geometric shapes
 * - Clean lines and patterns
 * - Minimalist premium aesthetic
 * - High performance
 */
export function HeroBackgroundGeometric() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none bg-black">
            {/* Animated Gradient Base */}
            <div className="absolute inset-0">
                <div 
                    className="absolute inset-0 opacity-50"
                    style={{
                        background: `
                            conic-gradient(from 0deg at 50% 50%, 
                                rgba(59, 130, 246, 0.3) 0deg,
                                rgba(147, 51, 234, 0.3) 90deg,
                                rgba(236, 72, 153, 0.3) 180deg,
                                rgba(59, 130, 246, 0.3) 270deg,
                                rgba(59, 130, 246, 0.3) 360deg)
                        `,
                        filter: 'blur(100px)',
                        animation: 'rotateGradient 30s linear infinite',
                    }}
                />
            </div>

            {/* Geometric Shapes */}
            <div className="absolute inset-0">
                {/* Large Circle */}
                <div 
                    className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-20"
                    style={{
                        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
                        border: '2px solid rgba(59, 130, 246, 0.2)',
                        animation: 'pulseCircle 4s ease-in-out infinite',
                    }}
                />
                
                {/* Medium Square */}
                <div 
                    className="absolute top-1/2 right-1/4 w-[400px] h-[400px] opacity-15"
                    style={{
                        background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.3) 0%, transparent 50%)',
                        border: '2px solid rgba(147, 51, 234, 0.2)',
                        transform: 'rotate(45deg)',
                        animation: 'rotateSquare 20s linear infinite',
                    }}
                />
                
                {/* Small Triangle */}
                <div 
                    className="absolute bottom-1/4 left-1/2 w-0 h-0 opacity-20"
                    style={{
                        borderLeft: '200px solid transparent',
                        borderRight: '200px solid transparent',
                        borderBottom: '350px solid rgba(236, 72, 153, 0.2)',
                        animation: 'rotateTriangle 15s linear infinite',
                    }}
                />
            </div>

            {/* Animated Lines Grid */}
            <div className="absolute inset-0">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800">
                    <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" stopOpacity="0" />
                            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.5)" stopOpacity="1" />
                            <stop offset="100%" stopColor="rgba(147, 51, 234, 0.3)" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {/* Horizontal Lines */}
                    {Array.from({ length: 10 }).map((_, i) => (
                        <line
                            key={`h-${i}`}
                            x1="0"
                            y1={i * 80}
                            x2="1200"
                            y2={i * 80}
                            stroke="url(#lineGradient)"
                            strokeWidth="1"
                            opacity="0.1"
                            style={{
                                animation: `linePulse ${3 + i * 0.5}s ease-in-out infinite`,
                                animationDelay: `${i * 0.2}s`,
                            }}
                        />
                    ))}
                    {/* Vertical Lines */}
                    {Array.from({ length: 15 }).map((_, i) => (
                        <line
                            key={`v-${i}`}
                            x1={i * 80}
                            y1="0"
                            x2={i * 80}
                            y2="800"
                            stroke="url(#lineGradient)"
                            strokeWidth="1"
                            opacity="0.1"
                            style={{
                                animation: `linePulse ${2 + i * 0.3}s ease-in-out infinite`,
                                animationDelay: `${i * 0.15}s`,
                            }}
                        />
                    ))}
                </svg>
            </div>

            {/* Floating Particles */}
            <div className="absolute inset-0">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                            width: `${Math.random() * 4 + 2}px`,
                            height: `${Math.random() * 4 + 2}px`,
                            background: `rgba(${Math.random() > 0.5 ? '59, 130, 246' : '147, 51, 234'}, ${Math.random() * 0.5 + 0.3})`,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            boxShadow: `0 0 ${Math.random() * 10 + 5}px rgba(${Math.random() > 0.5 ? '59, 130, 246' : '147, 51, 234'}, 0.5)`,
                            animation: `floatParticle ${10 + Math.random() * 20}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 5}s`,
                        }}
                    />
                ))}
            </div>

            {/* Bottom Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-black via-black/80 to-transparent" />

            <style jsx>{`
                @keyframes rotateGradient {
                    0% {
                        transform: rotate(0deg);
                    }
                    100% {
                        transform: rotate(360deg);
                    }
                }

                @keyframes pulseCircle {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 0.2;
                    }
                    50% {
                        transform: scale(1.1);
                        opacity: 0.3;
                    }
                }

                @keyframes rotateSquare {
                    0% {
                        transform: rotate(45deg);
                    }
                    100% {
                        transform: rotate(405deg);
                    }
                }

                @keyframes rotateTriangle {
                    0% {
                        transform: rotate(0deg);
                    }
                    100% {
                        transform: rotate(360deg);
                    }
                }

                @keyframes linePulse {
                    0%, 100% {
                        opacity: 0.05;
                    }
                    50% {
                        opacity: 0.2;
                    }
                }

                @keyframes floatParticle {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                        opacity: 0.3;
                    }
                    50% {
                        transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) scale(1.5);
                        opacity: 0.8;
                    }
                }
            `}</style>
        </div>
    )
}
