import { cn } from "@/lib/utils"

interface VionLogoProps {
    className?: string
    variant?: "black" | "white"
}

export function VionLogo({ className, variant = "white" }: VionLogoProps) {
    // variant "black" -> navy logo (for light backgrounds)
    // variant "white" -> white logo (for dark backgrounds)
    return (
        <img
            src={variant === "black" ? "/ameritai-logo.svg" : "/ameritai-logo-white.svg"}
            alt="AmeritAI"
            className={cn("h-7 w-auto object-contain", className)}
        />
    )
}
