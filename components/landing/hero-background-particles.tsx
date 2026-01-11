"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

/**
 * Lightweight Particle System
 * Uses CSS transforms instead of canvas for better performance
 */
export function HeroBackgroundParticles() {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!containerRef.current) return

        // Create lightweight particles using CSS
        const particleCount = 50 // Reduced from typical 100+ for performance
        const particles: HTMLDivElement[] = []

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div')
            particle.className = 'absolute rounded-full pointer-events-none'
            particle.style.cssText = `
                width: ${Math.random() * 3 + 1}px;
                height: ${Math.random() * 3 + 1}px;
                background: rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2});
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: particleFloat ${10 + Math.random() * 20}s ease-in-out infinite;
                animation-delay: ${Math.random() * 5}s;
            `
            containerRef.current.appendChild(particle)
            particles.push(particle)
        }

        return () => {
            particles.forEach(p => p.remove())
        }
    }, [])

    return (
        <>
            <div 
                ref={containerRef}
                className="absolute inset-0 overflow-hidden pointer-events-none"
            />
            
            {/* Gradient backdrop */}
            <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-900/20 to-black" />
            
            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black via-black/80 to-transparent" />

            <style jsx>{`
                @keyframes particleFloat {
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
        </>
    )
}
