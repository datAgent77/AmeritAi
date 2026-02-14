import Image from "next/image"
import { cn } from "@/lib/utils"

interface VionLogoProps {
    className?: string
    variant?: "black" | "white"
}

export function VionLogo({ className, variant = "white" }: VionLogoProps) {
    return (
        <div className={cn("relative flex items-center justify-start", className)}>
            <Image
                src={variant === "black" ? "/vion-logo-full-dark.png" : "/vion-logo-text-light.png"}
                alt="Vion"
                width={133}
                height={42}
                className="h-7 w-auto object-contain object-left"
                priority
            />
        </div>
    )
}
