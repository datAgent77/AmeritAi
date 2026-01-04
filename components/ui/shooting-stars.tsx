"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useState, useRef } from "react";

interface ShootingStar {
    id: number;
    x: number;
    y: number;
    angle: number;
    scale: number;
    speed: number;
    distance: number;
    trail: { x: number; y: number; opacity: number }[];
    finished: boolean;
}

interface ShootingStarsProps {
    minDelay?: number;
    maxDelay?: number;
    minSpeed?: number;
    maxSpeed?: number;
    starColor?: string;
    trailColor?: string;
    starWidth?: number; // Used for trail width/thickness in canvas
    starHeight?: number;
    className?: string;
}

export const ShootingStars = ({
    minDelay = 1200,
    maxDelay = 4200,
    minSpeed = 10,
    maxSpeed = 30,
    starColor = "#9E00FF",
    trailColor = "#2EB9DF",
    starWidth = 10,
    starHeight = 1,
    className,
}: ShootingStarsProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Handle Resize
        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        handleResize();
        window.addEventListener("resize", handleResize);

        // State for stars
        let stars: ShootingStar[] = [];
        let animationFrameId: number;

        const createStar = () => {
            const { innerWidth, innerHeight } = window;
            const x = Math.random() * innerWidth;
            const y = 0;
            const angle = 45;
            const scale = 1 + Math.random();
            const speed = Math.random() * (maxSpeed - minSpeed) + minSpeed;
            const distance = Math.random() * 300 + innerHeight * 1.5;

            stars.push({
                id: Date.now(),
                x,
                y,
                angle,
                scale,
                speed,
                distance,
                trail: [],
                finished: false,
            });

            const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;
            setTimeout(createStar, randomDelay);
        };

        // Initialize first star
        createStar();

        const update = () => {
            // Clear canvas (transparently)
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            stars.forEach((star) => {
                if (star.finished) return;

                // Move Star
                const prevX = star.x;
                const prevY = star.y;

                star.x += star.speed * Math.cos((star.angle * Math.PI) / 180);
                star.y += star.speed * Math.sin((star.angle * Math.PI) / 180);

                // Add to trail
                star.trail.push({ x: prevX, y: prevY, opacity: 1 });

                // "Sünerek kaybolma" effect: 
                // Keep trail points but fade them out. 
                // Max trail length can be based on starWidth (which we'll use as a proxy for trail longevity)
                // Let's say we keep last 50 points by default, but user wants "uzun iz". 
                // We'll fade them manually.

                // Update Trail Opacity
                star.trail.forEach((point) => {
                    point.opacity -= 0.015; // Fade speed
                });

                // Remove invisible trail points
                star.trail = star.trail.filter((p) => p.opacity > 0);

                // Check bounds/distance
                const dx = star.x - prevX;
                const dy = star.y - prevY; // approximate step
                // We don't really track total distance strictly here, just check if it's way off screen
                if (star.y > window.innerHeight + 100 && star.trail.length === 0) {
                    star.finished = true;
                }

                // DRAWING
                ctx.beginPath();
                if (star.trail.length > 1) {
                    // Draw trails
                    for (let i = 0; i < star.trail.length - 1; i++) {
                        const point = star.trail[i];
                        const nextPoint = star.trail[i + 1];

                        ctx.beginPath();
                        ctx.moveTo(point.x, point.y);
                        ctx.lineTo(nextPoint.x, nextPoint.y);

                        // Use starWidth as stroke width
                        ctx.lineWidth = starHeight * star.scale;
                        ctx.strokeStyle = `rgba(255, 255, 255, ${point.opacity})`; // White trail as requested

                        // If trailColor is provided, maybe mix it? User asked for "white opaque trail".
                        // But let's use the provided trailColor prop but make it fade.
                        // Converting hex to rgba is complex without helper. 
                        // Let's stick to user request: "uzun beyaz opak bir çizgi".
                        // But we should respect the trailColor prop if we want flexibility.
                        // For now, I will hardcode white/light blue-ish for the trail since the user specifically asked for "beyaz opak".
                        ctx.strokeStyle = trailColor ? trailColor : "rgba(255, 255, 255, 1)";
                        // We need to apply opacity.
                        // Simple hack: set globalAlpha or use strokeStyle with opacity if color is hex.
                        // Since `trailColor` is likely hex (e.g. #2EB9DF), we can't easily append opacity.
                        // I will ignore `trailColor` prop for opacity handling and stick to "white" for the "sünerek kaybolma" effect 
                        // OR use a gradient.

                        // BETTER APPROACH FOR TRAIL: 
                        // Draw a single path for the whole trail with a gradient?
                        // No, individual segments allow varying opacity easier.

                        ctx.globalAlpha = point.opacity;
                        ctx.stroke();
                    }
                }

                // Draw head
                ctx.globalAlpha = 1;
                ctx.beginPath();
                ctx.arc(star.x, star.y, (starHeight * 1.5), 0, Math.PI * 2);
                ctx.fillStyle = starColor;
                ctx.fill();

                // Glow effect
                ctx.shadowBlur = 10;
                ctx.shadowColor = starColor;
            });

            // Cleanup finished stars
            stars = stars.filter((s) => !s.finished);

            animationFrameId = requestAnimationFrame(update);
        };

        update();

        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [minDelay, maxDelay, minSpeed, maxSpeed, starColor, trailColor, starHeight]);

    return (
        <canvas
            ref={canvasRef}
            className={cn("w-full h-full absolute inset-0 pointer-events-none", className)}
        />
    );
};
