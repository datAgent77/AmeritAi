"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ExternalLink, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getOmniAppNavGroups, resolveOmniAppPage } from "@/lib/omni-app/navigation"
import { cn } from "@/lib/utils"

export function OmniAppHeader() {
    const pathname = usePathname() || "/omni/app"
    const page = resolveOmniAppPage(pathname)
    const mobileItems = getOmniAppNavGroups().flatMap((group) => group.items)

    return (
        <div className="sticky top-3 z-20 space-y-4 rounded-[24px] border border-zinc-200 bg-white/90 px-6 py-4 backdrop-blur-xl shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="text-xs uppercase tracking-widest font-semibold text-zinc-400">{page?.eyebrow || "Omni Workspace"}</div>
                    <div className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">{page?.title || "Overview"}</div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative hidden md:block mr-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            className="h-10 w-64 rounded-full border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all"
                        />
                    </div>
                    <Button asChild variant="outline" className="rounded-full border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm h-10 px-5">
                        <Link href="/docs/vion-ai-egitim-kilavuzu.md">Docs</Link>
                    </Button>
                    <Button asChild className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800 transition-colors h-10 px-5">
                        <Link href="/console/chatbot">
                            Open Console
                            <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden scrollbar-hide">
                {mobileItems.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={cn(
                                "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                                active 
                                    ? "border-zinc-900 bg-zinc-900 text-white shadow-sm" 
                                    : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                            )}
                        >
                            {item.label}
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
