"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ExternalLink, LogOut, ChevronDown } from "lucide-react"
import { signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { auth } from "@/lib/firebase"
import { getOmniAppNavGroups } from "@/lib/omni-app/navigation"
import { cn } from "@/lib/utils"
import { VionOmniLogo } from "@/components/ui/vion-omni-logo"

function isActive(pathname: string, href: string, matches?: string[]) {
    if (matches?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
        return true
    }
    return pathname === href || pathname.startsWith(`${href}/`)
}

export function OmniAppSidebar() {
    const pathname = usePathname() || "/omni/app"
    const router = useRouter()
    const { user } = useAuth()
    const { accounts, activeAccountId, activeAccount, canSwitchAccounts, selectAccount } = useOmniAccount()
    const navGroups = getOmniAppNavGroups()

    const handleSignOut = async () => {
        await signOut(auth)
        router.push("/omni/login")
    }

    return (
        <aside className="hidden w-[280px] shrink-0 flex-col bg-transparent lg:flex h-[calc(100vh-24px)] sticky top-3">
            {/* Header / Logo */}
            <div className="flex items-center px-4 py-2 mb-6">
                <VionOmniLogo className="h-6" />
            </div>

            {/* Workspace Selector */}
            <div className="px-4 mb-8">
                <div className="text-xs font-medium text-zinc-500 mb-2 px-1 uppercase tracking-wider">Workspace</div>
                <div className="relative">
                    <select
                        className={cn(
                            "w-full appearance-none rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 outline-none shadow-sm hover:bg-zinc-50 transition-colors cursor-pointer",
                            !canSwitchAccounts && "pointer-events-none bg-zinc-50/50"
                        )}
                        value={activeAccountId || ""}
                        onChange={(event) => selectAccount(event.target.value)}
                        disabled={!canSwitchAccounts}
                    >
                        {accounts.length > 0 ? (
                            accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.companyName || account.email || account.id}
                                </option>
                            ))
                        ) : (
                            <option value="">{activeAccount?.companyName || activeAccount?.email || "Omni workspace"}</option>
                        )}
                    </select>
                    {canSwitchAccounts && (
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-400">
                            <ChevronDown className="h-4 w-4" />
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-8 overflow-y-auto px-2 pb-4 scrollbar-hide">
                {navGroups.map((group) => (
                    <div key={group.id} className="px-2">
                        <div className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">{group.label}</div>
                        <div className="space-y-1">
                            {group.items.map((item) => {
                                const active = isActive(pathname, item.href, item.match)
                                const Icon = item.icon
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
                                            active 
                                                ? "bg-zinc-100 text-zinc-900" 
                                                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                        )}
                                    >
                                        <Icon className={cn("h-4 w-4", active ? "text-zinc-900" : "text-zinc-500")} />
                                        <span>{item.label}</span>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Bottom Actions */}
            <div className="mt-auto px-4 space-y-4">
                <Button asChild variant="outline" className="w-full justify-between rounded-xl border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm h-10">
                    <Link href="/console/chatbot">
                        <span>Open Console</span>
                        <ExternalLink className="h-4 w-4 text-zinc-400" />
                    </Link>
                </Button>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-zinc-900">{user?.displayName || "Operator"}</div>
                        <div className="truncate text-xs text-zinc-500">{user?.email || "Signed in"}</div>
                    </div>
                    <button
                        type="button"
                        onClick={() => void handleSignOut()}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                        title="Sign out"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </aside>
    )
}
