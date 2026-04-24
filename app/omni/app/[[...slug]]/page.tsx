import { notFound, redirect } from "next/navigation"
import { OmniAppPageContent } from "@/components/omni-app/omni-app-page-content"
import { getOmniAppRedirect, resolveOmniAppPage } from "@/lib/omni-app/navigation"

interface OmniAppPageProps {
    params: {
        slug?: string[]
    }
}

export default function OmniAppPage({ params }: OmniAppPageProps) {
    const slug = params.slug || []
    const path = slug.length ? `/omni/app/${slug.join("/")}` : "/omni/app"
    const appRedirect = getOmniAppRedirect(path)

    if (appRedirect) {
        redirect(appRedirect)
    }

    const page = resolveOmniAppPage(path)
    if (!page) {
        notFound()
    }

    return <OmniAppPageContent path={page.path} />
}
