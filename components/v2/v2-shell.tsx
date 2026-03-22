"use client"

import Link from "next/link"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { cn } from "@/lib/utils"
import type { V2NavItem } from "@/lib/v2/types"
import { V2TopTabs } from "@/components/v2/v2-top-tabs"
import { V2EntitySwitcher } from "@/components/v2/v2-entity-switcher"
import { VionLogo } from "@/components/vion-logo"
import { Button } from "@/components/ui/button"

interface V2ShellProps {
  tabs: V2NavItem[]
  entityTitle: string
  entitySubtitle?: string
  topRight?: React.ReactNode
  children: React.ReactNode
  className?: string
  homeHref?: string
  showLogout?: boolean
}

export function V2Shell({
  tabs,
  entityTitle,
  entitySubtitle,
  topRight,
  children,
  className,
  homeHref = "/v2",
  showLogout = false,
}: V2ShellProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
  }

  return (
    <div className={cn("v2-shell min-h-screen bg-[#f5f5f3] text-zinc-950", className)}>
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-[#f5f5f3]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-4 px-4 py-4 md:px-8">
          <Link href={homeHref} className="shrink-0">
            <VionLogo variant="black" className="min-w-[84px]" />
          </Link>
          <V2EntitySwitcher title={entityTitle} subtitle={entitySubtitle} className="max-w-[320px]" />
          <div className="ml-auto flex items-center gap-3">
            {topRight}
            {showLogout ? (
              <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1600px] px-4 pb-3 md:px-8">
          <V2TopTabs items={tabs} />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1600px] flex-col px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  )
}
