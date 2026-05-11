"use client"

import { ArrowLeft, Trash2 } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CmpDomain } from "@/components/cookie/domain-detail/types"

export function DomainHeader({ domain, deleting, onDelete }: { domain: CmpDomain; deleting: boolean; onDelete: () => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/cookie/domains">
              <ArrowLeft className="h-4 w-4" />
              Domainler
            </Link>
          </Button>
          <Badge variant={domain.status === "paused" ? "secondary" : "outline"}>{domain.status === "paused" ? "Paused" : "Active"}</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{domain.name}</h1>
        <p translate="no" className="text-sm text-muted-foreground">
          {domain.primaryHostname}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onDelete} disabled={deleting} className="gap-2">
          <Trash2 className="h-4 w-4" />
          Sil
        </Button>
      </div>
    </div>
  )
}
