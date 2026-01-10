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
                "pointer-events-none absolute z-[1] opacity-0 animate-spotlight w-[600px] h-[600px]",
                className
            )}
            style={{
                background: `radial-gradient(circle at center, ${fill} 0%, transparent 70%)`,
                filter: "blur(40px)",
            }}
        />
    );
};
