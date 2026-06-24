import Image from "next/image"
import { cn } from "@/lib/utils"

interface VionLogoProps {
    className?: string
    variant?: "black" | "white"
}

export function VionLogo({ className, variant = "white" }: VionLogoProps) {
    return (
        <div className={cn("relative flex items-center gap-2", className)}>
            <Image
                src={variant === "black" ? "/vion-logo-icon-dark.png" : "/vion-logo-icon-white.png"}
                alt="AmeritAI"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
            />
            <span
                className={cn(
                    "font-bold text-xl tracking-tight leading-none",
                    variant === "black" ? "text-zinc-900" : "text-white"
                )}
            >
                AmeritAI
            </span>
        </div>
    )
}
