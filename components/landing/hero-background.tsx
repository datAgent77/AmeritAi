"use client"

import { useEffect, useRef } from "react"

export function HeroBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {/* Main Gradient Orb - Top Center - Vibrant Purple/Indigo */}
            <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[90vw] h-[90vw] md:w-[600px] md:h-[600px] rounded-full bg-purple-600/30 blur-[60px] md:blur-[100px] animate-pulse-slow mix-blend-screen transition-all duration-700" />

            {/* Secondary Orb - Left - Blue/Cyan */}
            <div className="absolute top-[10%] left-[-20%] md:left-[5%] w-[70vw] h-[70vw] md:w-[500px] md:h-[500px] rounded-full bg-blue-600/20 blur-[50px] md:blur-[90px] animate-blob mix-blend-screen transition-all duration-700" />

            {/* Secondary Orb - Right - Pink/Rose */}
            <div className="absolute top-[20%] right-[-20%] md:right-[10%] w-[70vw] h-[70vw] md:w-[500px] md:h-[500px] rounded-full bg-rose-600/20 blur-[50px] md:blur-[90px] animate-blob animation-delay-2000 mix-blend-screen transition-all duration-700" />

            {/* Extra Glow - Center */}
            <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[50vw] h-[50vw] md:w-[300px] md:h-[300px] rounded-full bg-white/10 blur-[40px] md:blur-[60px] animate-pulse transition-all duration-700" />

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20" />

            {/* Noise Texture for that 'Premium' feel */}
            <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
        </div>
    )
}
