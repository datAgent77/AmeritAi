"use client"

import Link from "next/link"
import { Home, ChevronRight } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

interface BreadcrumbItem {
    label: string
    href?: string
}

interface PublicBreadcrumbProps {
    items: BreadcrumbItem[]
}

export function PublicBreadcrumb({ items }: PublicBreadcrumbProps) {
    const { t } = useLanguage()

    return (
        <div className="container mx-auto px-4 pt-24 pb-4 relative z-10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
                    <Home className="w-4 h-4" />
                    {t('navHome')}
                </Link>
                {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4" />
                        {item.href ? (
                            <Link href={item.href} className="hover:text-foreground transition-colors">
                                {item.label}
                            </Link>
                        ) : (
                            <span className="text-foreground">{item.label}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
