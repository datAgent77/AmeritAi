"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Cookie, Database, Globe2, Settings, Terminal } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"

const navItems = [
  { title: "Domainler", href: "/cookie/domains", icon: Globe2 },
  { title: "Kurulum", href: "/cookie/install", icon: Terminal },
  { title: "Rıza Kayıtları", href: "/cookie/consents", icon: Database },
  { title: "Yedekler", href: "/cookie/backups", icon: Cookie },
]

export function CookieSidebar() {
  const pathname = usePathname() || ""
  const { user } = useAuth()

  return (
    <Sidebar collapsible="icon" className="!top-0 !h-screen border-r bg-background text-foreground" variant="sidebar">
      <SidebarHeader className="!h-16 !p-0 flex items-center justify-center border-b bg-background">
        <div className="flex items-center h-full px-4 w-full group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted">
              <Cookie className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-none">Cookie</div>
              <div className="mt-1 text-xs text-muted-foreground">Consent Management</div>
            </div>
          </div>
        </div>
        <div className="hidden items-center justify-center h-full w-full group-data-[collapsible=icon]:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted">
            <Cookie className="h-5 w-5" />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarMenu>
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/")
            const Icon = item.icon
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  className={cn(
                    "w-full justify-start gap-3 px-3 h-10",
                    "hover:bg-muted hover:text-foreground",
                    active ? "bg-muted text-foreground" : "text-muted-foreground"
                  )}
                >
                  <Link href={item.href}>
                    <Icon className="h-4 w-4" />
                    <span className="font-medium text-[14px] group-data-[collapsible=icon]:hidden">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t bg-background p-2">
        <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-xs text-muted-foreground">Oturum</div>
            <div className="truncate text-sm font-medium" translate="no">
              {user?.email || user?.uid}
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-2 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:p-0">
            <Link href="/console/settings/account" aria-label="Hesap">
              <Settings className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Hesap</span>
            </Link>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

