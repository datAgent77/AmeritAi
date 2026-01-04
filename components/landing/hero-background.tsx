"use client"

import { Spotlight } from "@/components/ui/spotlight"
import { ShootingStars } from "@/components/ui/shooting-stars"
import { StarsBackground } from "@/components/ui/stars-background"

export function HeroBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none bg-black">
            {/* Ambient Spotlights for depth */}
            <Spotlight
                className="-top-40 left-0 md:left-60 md:-top-20 opacity-50"
                fill="white"
            />
            <Spotlight
                className="top-10 right-0 h-[80vh] w-[50vw] md:right-20 md:top-0 opacity-40"
                fill="purple"
            />

            {/* Star Field Background */}
            <StarsBackground
                starDensity={0.0002}
                allStarsTwinkle={true}
                twinkleProbability={0.8}
                minTwinkleSpeed={0.8}
                maxTwinkleSpeed={1.5}
            />

            {/* Dynamic Shooting Stars with Long Trails */}
            <ShootingStars
                starColor="#9E00FF"
                trailColor="#FFFFFF"
                minSpeed={15}
                maxSpeed={35}
                minDelay={1000}
                maxDelay={3000}
                starWidth={10}
                starHeight={1.5}
                className="opacity-70"
            />
            <ShootingStars
                starColor="#FFFFFF"
                trailColor="#FFFFFF"
                minSpeed={10}
                maxSpeed={25}
                minDelay={2000}
                maxDelay={5000}
                starWidth={10}
                starHeight={1}
                className="opacity-40"
            />

            {/* Very Subtle Noise/Grain for texture */}
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay" />

            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black via-black/80 to-transparent" />
        </div>
    )
}
