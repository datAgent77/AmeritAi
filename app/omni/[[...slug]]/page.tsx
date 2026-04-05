import { notFound, redirect } from "next/navigation"
import { OmniPageContent } from "@/components/omni/omni-page-content"
import { getOmniLegacyRedirect, isKnownOmniPage } from "@/lib/omni/navigation"

interface OmniPageProps {
    params: {
        slug?: string[]
    }
}

export default function OmniPage({ params }: OmniPageProps) {
    const slug = params.slug || []
    const path = slug.length ? `/omni/${slug.join("/")}` : "/omni"
    const legacyRedirect = getOmniLegacyRedirect(path)

    if (legacyRedirect) {
        redirect(legacyRedirect)
    }

    if (!isKnownOmniPage(path)) {
        notFound()
    }

    return <OmniPageContent path={path} />
}
