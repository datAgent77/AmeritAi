import React from "react";
import { cn } from "@/lib/utils";

type SpotlightProps = {
    className?: string;
    fill?: string;
};

export const Spotlight = ({ className, fill = "white" }: SpotlightProps) => {
    return (
        <div
            className={cn(
                "pointer-events-none absolute z-[1] opacity-0 animate-spotlight",
                className
            )}
            style={{
                background: `radial-gradient(circle at center, ${fill} 0%, transparent 70%)`,
                filter: "blur(40px)",
                // Determine size via className or default to a large spotlight area
                width: "var(--spotlight-width, 600px)",
                height: "var(--spotlight-height, 600px)",
            }}
        />
    );
};
