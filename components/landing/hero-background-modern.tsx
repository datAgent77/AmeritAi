"use client"

import { cn } from "@/lib/utils"

/**
 * Modern Hero Background - Geometric & Fluid Animation
 * Features:
 * - Morphing blob shapes
 * - Animated geometric patterns
 * - Flowing gradients
 * - Minimalist premium feel
 */
export function HeroBackgroundModern() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none bg-black">
            {/* Morphing Blob Shapes */}
            <div className="absolute inset-0">
                {/* Primary Blob - Blue */}
                <div 
                    className="absolute top-0 left-0 w-[800px] h-[800px] opacity-40"
                    style={{
                        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.5) 0%, rgba(59, 130, 246, 0.1) 50%, transparent 70%)',
                        filter: 'blur(80px)',
                        borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                        animation: 'morphBlob1 20s ease-in-out infinite',
                    }}
                />
                
                {/* Secondary Blob - Purple */}
                <div 
                    className="absolute top-1/2 right-0 w-[700px] h-[700px] opacity-35"
                    style={{
                        background: 'radial-gradient(circle, rgba(147, 51, 234, 0.5) 0%, rgba(147, 51, 234, 0.1) 50%, transparent 70%)',
                        filter: 'blur(90px)',
                        borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
                        animation: 'morphBlob2 25s ease-in-out infinite reverse',
                        animationDelay: '2s',
                    }}
                />
                
                {/* Tertiary Blob - Pink */}
                <div 
                    className="absolute bottom-0 left-1/3 w-[600px] h-[600px] opacity-30"
                    style={{
                        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, rgba(236, 72, 153, 0.1) 50%, transparent 70%)',
                        filter: 'blur(70px)',
                        borderRadius: '40% 60% 60% 40% / 70% 30% 70% 30%',
                        animation: 'morphBlob3 18s ease-in-out infinite',
                        animationDelay: '4s',
                    }}
                />
            </div>

            {/* Animated Geometric Grid */}
            <div 
                className="absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px',
                    backgroundPosition: '0 0, 0 0',
                    animation: 'gridShift 20s linear infinite',
                }}
            />

            {/* Flowing Wave Pattern */}
            <div className="absolute inset-0 opacity-20">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" stopOpacity="0" />
                            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.5)" stopOpacity="1" />
                            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.3)" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="rgba(147, 51, 234, 0.3)" stopOpacity="0" />
                            <stop offset="50%" stopColor="rgba(147, 51, 234, 0.5)" stopOpacity="1" />
                            <stop offset="100%" stopColor="rgba(147, 51, 234, 0.3)" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M0,400 Q300,300 600,400 T1200,400 L1200,800 L0,800 Z"
                        fill="url(#waveGradient1)"
                        style={{
                            animation: 'waveMove1 15s ease-in-out infinite',
                        }}
                    />
                    <path
                        d="M0,500 Q300,400 600,500 T1200,500 L1200,800 L0,800 Z"
                        fill="url(#waveGradient2)"
                        style={{
                            animation: 'waveMove2 18s ease-in-out infinite reverse',
                            animationDelay: '2s',
                        }}
                    />
                </svg>
            </div>

            {/* Radial Ripple Effect */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div 
                    className="absolute w-[1000px] h-[1000px] rounded-full opacity-10"
                    style={{
                        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
                        animation: 'ripple 8s ease-out infinite',
                    }}
                />
                <div 
                    className="absolute w-[1000px] h-[1000px] rounded-full opacity-10"
                    style={{
                        background: 'radial-gradient(circle, rgba(147, 51, 234, 0.3) 0%, transparent 70%)',
                        animation: 'ripple 8s ease-out infinite',
                        animationDelay: '2s',
                    }}
                />
                <div 
                    className="absolute w-[1000px] h-[1000px] rounded-full opacity-10"
                    style={{
                        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%)',
                        animation: 'ripple 8s ease-out infinite',
                        animationDelay: '4s',
                    }}
                />
            </div>

            {/* Subtle Noise */}
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.01] mix-blend-overlay" />

            {/* Bottom Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-black via-black/70 to-transparent" />

            <style jsx>{`
                @keyframes morphBlob1 {
                    0%, 100% {
                        border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
                        transform: translate(0, 0) scale(1);
                    }
                    25% {
                        border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
                        transform: translate(50px, -30px) scale(1.1);
                    }
                    50% {
                        border-radius: 40% 60% 60% 40% / 70% 30% 70% 30%;
                        transform: translate(-30px, 50px) scale(0.9);
                    }
                    75% {
                        border-radius: 70% 30% 50% 50% / 50% 60% 40% 60%;
                        transform: translate(30px, 30px) scale(1.05);
                    }
                }

                @keyframes morphBlob2 {
                    0%, 100% {
                        border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
                        transform: translate(0, 0) scale(1);
                    }
                    33% {
                        border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
                        transform: translate(-40px, 40px) scale(1.15);
                    }
                    66% {
                        border-radius: 50% 50% 70% 30% / 50% 50% 30% 70%;
                        transform: translate(40px, -40px) scale(0.85);
                    }
                }

                @keyframes morphBlob3 {
                    0%, 100% {
                        border-radius: 40% 60% 60% 40% / 70% 30% 70% 30%;
                        transform: translate(0, 0) scale(1);
                    }
                    50% {
                        border-radius: 70% 30% 50% 50% / 50% 60% 40% 60%;
                        transform: translate(60px, -50px) scale(1.2);
                    }
                }

                @keyframes gridShift {
                    0% {
                        background-position: 0 0, 0 0;
                    }
                    100% {
                        background-position: 60px 60px, 60px 60px;
                    }
                }

                @keyframes waveMove1 {
                    0%, 100% {
                        d: path("M0,400 Q300,300 600,400 T1200,400 L1200,800 L0,800 Z");
                    }
                    50% {
                        d: path("M0,400 Q300,500 600,400 T1200,400 L1200,800 L0,800 Z");
                    }
                }

                @keyframes waveMove2 {
                    0%, 100% {
                        d: path("M0,500 Q300,400 600,500 T1200,500 L1200,800 L0,800 Z");
                    }
                    50% {
                        d: path("M0,500 Q300,600 600,500 T1200,500 L1200,800 L0,800 Z");
                    }
                }

                @keyframes ripple {
                    0% {
                        transform: scale(0.8);
                        opacity: 0.1;
                    }
                    50% {
                        opacity: 0.15;
                    }
                    100% {
                        transform: scale(1.5);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    )
}
