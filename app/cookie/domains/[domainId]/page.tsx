"use client"

import { useParams } from "next/navigation"
import { CmpDomainDetail } from "@/components/cookie/domain-detail/CmpDomainDetail"

export default function CookieDomainDetailPage() {
  const params = useParams<{ domainId: string }>()
  return <CmpDomainDetail domainId={params.domainId} />
}
