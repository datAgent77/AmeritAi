"use client"

import { Spotlight } from "@/components/ui/spotlight"
import { ShootingStars } from "@/components/ui/shooting-stars"
import { StarsBackground } from "@/components/ui/stars-background"

export function HeroBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none bg-black">
            {/* Ambient Spotlights for depth */}
            <Spotlight
                className="-top-40 left-0 md:left-60 md:-top-20 opacity-10"
                fill="#3b82f6"
            />
            <Spotlight
                className="top-10 right-0 h-[80vh] w-[50vw] md:right-20 md:top-0 opacity-20"
                fill="purple"
            />

            {/* Star Field Background */}
            <StarsBackground
                starDensity={0.00015}
                allStarsTwinkle={true}
                twinkleProbability={0.3}
                minTwinkleSpeed={0.5}
                maxTwinkleSpeed={1.2}
            />

            {/* Dynamic Shooting Stars with Long Trails */}
            <ShootingStars
                starColor="#9E00FF"
                trailColor="#FFFFFF"
                minSpeed={10}
                maxSpeed={25}
                minDelay={3000}
                maxDelay={8000}
                starWidth={10}
                starHeight={1.5}
                className="opacity-40"
            />

            {/* Very Subtle Noise/Grain for texture */}
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay" />

            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black via-black/80 to-transparent" />
        </div>
    )
}
