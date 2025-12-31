import Image from "next/image"
import { cn } from "@/lib/utils"

interface VionLogoProps {
    className?: string
    variant?: "black" | "white"
}

export function VionLogo({ className, variant = "white" }: VionLogoProps) {
    if (variant === "black") {
        return (
            <div className={cn("relative h-6 w-auto aspect-[3/1]", className)}>
                <Image
                    src="/vion-logo-full-dark.png"
                    alt="Vion"
                    fill
                    className="object-contain object-left"
                    priority
                />
            </div>
        )
    }

    return (
        <div className={cn("relative flex items-center justify-start", className)}>
            <Image
                src="/vion-logo-text-light.png"
                alt="Vion"
                width={133}
                height={42}
                className="h-7 w-auto object-contain object-left"
                priority
            />
        </div>
    )
}
