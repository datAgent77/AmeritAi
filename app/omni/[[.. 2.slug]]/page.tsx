import { notFound } from "next/navigation"
import { OmniPageContent } from "@/components/omni/omni-page-content"
import { isKnownOmniPage } from "@/lib/omni/navigation"

interface OmniPageProps {
    params: {
        slug?: string[]
    }
}

export default function OmniPage({ params }: OmniPageProps) {
    const slug = params.slug || []
    const path = slug.length ? `/omni/${slug.join("/")}` : "/omni"

    if (!isKnownOmniPage(path)) {
        notFound()
    }

    return <OmniPageContent path={path} />
}
